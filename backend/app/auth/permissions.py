"""
ACCESS LIST and DENY LIST: who may do what.

How a decision is made (`is_allowed`):
    1. If the permission is on the role's DENY list      -> refused. Always.
    2. Else if it is on the role's ACCESS list           -> allowed.
    3. Anything not mentioned anywhere                   -> refused (default deny).

So a deny entry always beats an access entry, and a brand-new permission
is closed to everyone until someone deliberately adds it to a role.

The two lists are checked against each other at import time
(`validate_permission_tables`): if the same permission appears on both
lists for one role, the app refuses to start. That catches copy-paste
mistakes before they become security holes.

Every other module (products, plans, billing ...) protects its endpoints
with `require_permission(Permission.X)` from dependencies.py and never
checks role names directly.
"""
from enum import Enum
from typing import Mapping, Optional

from app.auth.constants import ErrorCode
from app.auth.exceptions import AuthError
from app.enums import Role


class Permission(str, Enum):
    """Every action in the system that needs a permission check."""

    # --- Admin-only setup ---
    STAFF_MANAGE = "STAFF_MANAGE"                  # add / list staff members
    PRODUCT_MANAGE = "PRODUCT_MANAGE"              # products and variants
    PLAN_MANAGE = "PLAN_MANAGE"                    # plans
    TAX_MANAGE = "TAX_MANAGE"                      # tax rules
    DISCOUNT_MANAGE = "DISCOUNT_MANAGE"            # discount rules
    TEMPLATE_MANAGE = "TEMPLATE_MANAGE"            # quotation templates

    # --- Shared reading ---
    CATALOG_VIEW = "CATALOG_VIEW"                  # view products, plans (read only)

    # --- Internal day-to-day work (admin + staff) ---
    CUSTOMER_CREATE = "CUSTOMER_CREATE"
    CUSTOMER_VIEW_ALL = "CUSTOMER_VIEW_ALL"
    SUBSCRIPTION_CREATE = "SUBSCRIPTION_CREATE"
    SUBSCRIPTION_VIEW_ALL = "SUBSCRIPTION_VIEW_ALL"
    SUBSCRIPTION_UPDATE_STATUS = "SUBSCRIPTION_UPDATE_STATUS"  # Draft -> ... -> Closed
    INVOICE_VIEW_ALL = "INVOICE_VIEW_ALL"
    INVOICE_MANAGE = "INVOICE_MANAGE"              # confirm, cancel, send, print any invoice
    BILLING_RUN = "BILLING_RUN"                    # the "Run billing" action
    PAYMENT_RECORD = "PAYMENT_RECORD"
    PAYMENT_VIEW = "PAYMENT_VIEW"
    DASHBOARD_VIEW = "DASHBOARD_VIEW"              # finance dashboard

    # --- Customer portal (own data only) ---
    SUBSCRIPTION_VIEW_OWN = "SUBSCRIPTION_VIEW_OWN"
    SUBSCRIPTION_CLOSE_OWN = "SUBSCRIPTION_CLOSE_OWN"
    INVOICE_VIEW_OWN = "INVOICE_VIEW_OWN"
    INVOICE_PRINT_OWN = "INVOICE_PRINT_OWN"


P = Permission  # short alias to keep the tables below readable

# Things only the admin may do (the document: "Only the admin can ...").
ADMIN_ONLY_PERMISSIONS = frozenset({
    P.STAFF_MANAGE, P.PRODUCT_MANAGE, P.PLAN_MANAGE,
    P.TAX_MANAGE, P.DISCOUNT_MANAGE, P.TEMPLATE_MANAGE,
})

# Day-to-day work given to internal staff.
STAFF_PERMISSIONS = frozenset({
    P.CATALOG_VIEW,
    P.CUSTOMER_CREATE, P.CUSTOMER_VIEW_ALL,
    P.SUBSCRIPTION_CREATE, P.SUBSCRIPTION_VIEW_ALL, P.SUBSCRIPTION_UPDATE_STATUS,
    P.INVOICE_VIEW_ALL, P.INVOICE_MANAGE,
    P.BILLING_RUN,
    P.PAYMENT_RECORD, P.PAYMENT_VIEW,
    P.DASHBOARD_VIEW,
})

# What a customer may do in the portal.
CUSTOMER_PERMISSIONS = frozenset({
    P.CATALOG_VIEW,
    P.SUBSCRIPTION_VIEW_OWN, P.SUBSCRIPTION_CLOSE_OWN,
    P.INVOICE_VIEW_OWN, P.INVOICE_PRINT_OWN,
})

# Everything that is not a customer permission is internal-only.
INTERNAL_PERMISSIONS = frozenset(Permission) - CUSTOMER_PERMISSIONS

# ---------------------------------------------------------------------------
# ACCESS LIST: what each role is allowed to do.
# ---------------------------------------------------------------------------
ACCESS_LIST: Mapping[Role, frozenset] = {
    Role.ADMIN: frozenset(Permission),      # the admin controls the whole system
    Role.STAFF: STAFF_PERMISSIONS,
    Role.CUSTOMER: CUSTOMER_PERMISSIONS,
}

# ---------------------------------------------------------------------------
# DENY LIST: what each role is explicitly blocked from, no matter what.
# ---------------------------------------------------------------------------
DENY_LIST: Mapping[Role, frozenset] = {
    Role.ADMIN: frozenset(),                # nothing is denied to the admin
    Role.STAFF: ADMIN_ONLY_PERMISSIONS,     # staff can never touch admin setup
    Role.CUSTOMER: INTERNAL_PERMISSIONS,    # customers can never touch internal tools
}


def validate_permission_tables(
    access: Mapping[Role, frozenset] = ACCESS_LIST,
    deny: Mapping[Role, frozenset] = DENY_LIST,
) -> None:
    """
    Fail fast on a misconfigured table. Raises RuntimeError when:
      - a role is missing from either table,
      - a permission is on both the access and the deny list of one role,
      - the admin is missing a permission (admin must control everything).
    """
    for role in Role:
        if role not in access or role not in deny:
            raise RuntimeError(f"Role {role.value} must appear in ACCESS_LIST and DENY_LIST")
        overlap = access[role] & deny[role]
        if overlap:
            names = ", ".join(sorted(p.value for p in overlap))
            raise RuntimeError(f"{role.value} has permissions on BOTH lists: {names}")
    missing = frozenset(Permission) - access[Role.ADMIN]
    if missing:
        names = ", ".join(sorted(p.value for p in missing))
        raise RuntimeError(f"ADMIN is missing permissions: {names}")


# Runs once when the module is first imported.
validate_permission_tables()


def is_allowed(role: Role, permission: Permission) -> bool:
    """Apply the three-step decision described at the top of this file."""
    if permission in DENY_LIST.get(role, frozenset()):
        return False                                   # step 1: deny wins
    return permission in ACCESS_LIST.get(role, frozenset())  # steps 2 and 3


def ensure_permission(role: Role, permission: Permission) -> None:
    """Raise 403 FORBIDDEN unless the role holds the permission."""
    if not is_allowed(role, permission):
        raise AuthError(
            403,
            ErrorCode.FORBIDDEN,
            "You do not have permission to perform this action.",
        )


def permissions_for(role: Optional[Role]) -> list:
    """
    The effective permission list for a role (access minus deny), as
    sorted strings. Sent to the frontend in /auth/me so it can show or
    hide pages and buttons. The backend still enforces every check;
    this list is only for the UI.
    """
    if role is None:
        return []
    return sorted(p.value for p in Permission if is_allowed(role, p))
