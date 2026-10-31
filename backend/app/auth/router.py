"""
HTTP endpoints for authentication. Prefix: /api/v1/auth

    POST /signup           public       customer creates an account
    POST /login            public       email + password -> access token
    GET  /me               logged in    who am I + what may I do
    POST /forgot-password  public       email a reset link
    POST /reset-password   public       set a new password with the link's token
    POST /staff            ADMIN only   add a staff member
    GET  /staff            ADMIN only   list staff members (paginated)
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import service
from app.auth.config import get_settings
from app.auth.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.auth.dependencies import Principal, get_current_user, require_permission
from app.auth.models import User
from app.auth.permissions import Permission, permissions_for
from app.auth.schemas import (
    CustomerCreateRequest, CustomerOut, DataResponse, ForgotPasswordRequest,
    LoginOut, LoginRequest, MeOut, MessageOut, PagedResponse, ResetPasswordRequest,
    SignupRequest, StaffCreateRequest, UserOut,
)
from app.auth.tokens import create_access_token
from app.database import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/signup", status_code=201, response_model=DataResponse[UserOut],
             summary="Customer signup")
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    """
    Create a customer account. The email must be new, and the password needs
    more than 8 characters with an uppercase letter, a lowercase letter and
    a special character.
    """
    user = service.signup_customer(
        db,
        body.full_name,
        body.email,
        body.password,
        company_name=body.company_name,
        device_id=body.device_id,
        device_name=body.device_name,
    )
    return {"data": user}


@router.post("/login", response_model=DataResponse[LoginOut], summary="Log in")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Exchange email + password for a Bearer access token."""
    user = service.authenticate(
        db,
        body.email,
        body.password,
        device_id=body.device_id,
        device_name=body.device_name,
    )
    token, expires_in = create_access_token(user)
    return {"data": {"access_token": token, "expires_in": expires_in, "user": user}}


@router.get("/customers", response_model=PagedResponse[CustomerOut], summary="List customers")
def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
):
    """List registered customers in the database."""
    rows, total = service.list_customers(db, page, page_size)
    return {"data": rows, "page": page, "page_size": page_size, "total": total}


@router.post("/customers", response_model=DataResponse[CustomerOut], summary="Add or update customer")
def create_customer(
    body: CustomerCreateRequest,
    db: Session = Depends(get_db),
):
    """Add customer details to the database."""
    customer = service.ensure_customer_record(
        db,
        name=body.name,
        email=body.email,
        company_name=body.company_name,
        phone=body.phone,
        address=body.address,
        device_id=body.device_id,
        device_name=body.device_name,
    )
    return {"data": customer}


@router.get("/me", response_model=DataResponse[MeOut], summary="Current user")
def me(user: User = Depends(get_current_user)):
    """The logged-in user plus the permission list the frontend uses to build menus."""
    return {"data": {**UserOut.model_validate(user).model_dump(), "permissions": permissions_for(user.role)}}


@router.post("/forgot-password", response_model=DataResponse[MessageOut],
             summary="Request a password reset link")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Emails a one-time reset link to the registered address. The answer is
    always the same, whether or not the email has an account.
    """
    link = service.request_password_reset(db, body.email)
    return {
        "data": {
            "message": service.FORGOT_PASSWORD_MESSAGE,
            # DEV/DEMO ONLY: lets the team test without an email server.
            "reset_link": link if get_settings().expose_reset_link else None,
        }
    }


@router.post("/reset-password", response_model=DataResponse[MessageOut],
             summary="Set a new password using the emailed token")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """The token is single-use and expires. The new password must follow the same rules."""
    service.reset_password(db, body.token, body.new_password)
    return {"data": {"message": "Your password has been updated. Please log in."}}


@router.post("/staff", status_code=201, response_model=DataResponse[UserOut],
             summary="Add a staff member (admin only)")
def create_staff(
    body: StaffCreateRequest,
    principal: Principal = Depends(require_permission(Permission.STAFF_MANAGE)),
    db: Session = Depends(get_db),
):
    """Only the admin can add staff. The new account always gets the STAFF role."""
    user = service.create_staff(db, principal.role, body.full_name, body.email, body.password)
    return {"data": user}


@router.get("/staff", response_model=PagedResponse[UserOut],
            summary="List staff members (admin only)")
def list_staff(
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    _principal: Principal = Depends(require_permission(Permission.STAFF_MANAGE)),
    db: Session = Depends(get_db),
):
    items, total = service.list_staff(db, page, page_size)
    return {"data": items, "page": page, "page_size": page_size, "total": total}
