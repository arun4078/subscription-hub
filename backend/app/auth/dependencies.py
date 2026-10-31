"""
FastAPI dependencies: who is calling, and are they allowed?

Use these in every other module's routers:

    @router.post("/plans")
    def create_plan(principal: Principal = Depends(require_permission(Permission.PLAN_MANAGE))):
        ...

    @router.get("/invoices")
    def list_invoices(principal: Principal = Depends(get_current_principal), db=Depends(get_db)):
        stmt = apply_customer_scope(select(Invoice), Invoice.customer_id, principal)
        ...

"Customers see only their own data": the customer id ALWAYS comes from
the logged-in user's database row, never from the URL, query string or body.
"""
from dataclasses import dataclass
from typing import Callable, Optional

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.constants import ErrorCode
from app.auth.exceptions import AuthError
from app.auth.models import User
from app.auth.permissions import Permission, ensure_permission
from app.auth.tokens import decode_access_token
from app.database import get_db
from app.enums import Role

# auto_error=False lets us return our own 401 in our own JSON shape.
_bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    """The authenticated caller, as seen by the rest of the backend."""
    user_id: int
    email: str
    role: Role
    customer_id: Optional[int]   # set only for CUSTOMER users


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Turn the Bearer token into a User row, or fail with 401/403.

    The user is reloaded from the database on every request, so a
    deactivated account or a changed role takes effect immediately and
    the role inside the token is never trusted.
    """
    if credentials is None or not credentials.credentials:
        raise AuthError(401, ErrorCode.NOT_AUTHENTICATED, "Authentication required.")

    payload = decode_access_token(credentials.credentials)  # 401 if bad or expired

    try:
        user_id = int(payload["sub"])
    except (KeyError, ValueError):
        raise AuthError(401, ErrorCode.TOKEN_INVALID, "Invalid authentication token.")

    user = db.get(User, user_id)
    if user is None:
        raise AuthError(401, ErrorCode.TOKEN_INVALID, "Invalid authentication token.")
    if not user.is_active:
        raise AuthError(403, ErrorCode.ACCOUNT_DISABLED, "This account has been deactivated.")
    if payload.get("tv") != user.token_version:
        # Password was reset after this token was issued.
        raise AuthError(401, ErrorCode.TOKEN_REVOKED, "Session is no longer valid. Please log in again.")
    return user


def get_current_principal(user: User = Depends(get_current_user)) -> Principal:
    """Lightweight identity object for permission and scoping checks."""
    return Principal(
        user_id=user.id,
        email=user.email,
        role=user.role,
        customer_id=user.customer_id,
    )


def require_permission(*permissions: Permission) -> Callable[..., Principal]:
    """
    Dependency factory: the caller must hold EVERY listed permission
    (access list allows it AND deny list does not block it).
    Returns the Principal so the endpoint can use it.
    """
    def checker(principal: Principal = Depends(get_current_principal)) -> Principal:
        for permission in permissions:
            ensure_permission(principal.role, permission)
        return principal

    return checker


def require_role(*roles: Role) -> Callable[..., Principal]:
    """
    Coarse check by role name. Prefer `require_permission` for real
    endpoints; use this only for screens that are simply "admin area".
    """
    def checker(principal: Principal = Depends(get_current_principal)) -> Principal:
        if principal.role not in roles:
            raise AuthError(403, ErrorCode.FORBIDDEN, "You do not have permission to perform this action.")
        return principal

    return checker


# ------------------------------------------------------ customer data scoping
def customer_scope(principal: Principal) -> Optional[int]:
    """
    The customer id a query must be limited to.
        CUSTOMER      -> their own customer_id (query must be filtered)
        ADMIN / STAFF -> None (no restriction)
    """
    if principal.role == Role.CUSTOMER:
        if principal.customer_id is None:
            # Should be impossible (database CHECK constraint), but never fail open.
            raise AuthError(403, ErrorCode.FORBIDDEN, "Account is not linked to a customer.")
        return principal.customer_id
    return None


def apply_customer_scope(statement, customer_id_column, principal: Principal):
    """
    Add `WHERE <column> = <caller's customer id>` to a SQLAlchemy select
    when the caller is a customer; leave it untouched for internal users.

        stmt = apply_customer_scope(select(Invoice), Invoice.customer_id, principal)
    """
    scope = customer_scope(principal)
    if scope is None:
        return statement
    return statement.where(customer_id_column == scope)


def assert_can_access_customer(principal: Principal, customer_id: int) -> None:
    """
    Use after loading a single record by id (e.g. GET /invoices/42).
    A customer asking for someone else's record gets 404, not 403, so
    they cannot even learn that the record exists.
    """
    scope = customer_scope(principal)
    if scope is not None and scope != customer_id:
        raise AuthError(404, ErrorCode.NOT_FOUND, "Resource not found.")
