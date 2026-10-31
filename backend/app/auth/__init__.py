"""
Authentication and access control.

What other modules import from here:

    from app.auth import Permission, Principal, require_permission,
                         get_current_principal, apply_customer_scope

and in main.py:

    from app.auth import router as auth_router, register_exception_handlers
"""
from app.auth.dependencies import (
    Principal, apply_customer_scope, assert_can_access_customer,
    customer_scope, get_current_principal, get_current_user,
    require_permission, require_role,
)
from app.auth.exceptions import AuthError, register_exception_handlers
from app.auth.permissions import ACCESS_LIST, DENY_LIST, Permission, is_allowed
from app.auth.router import router

__all__ = [
    "ACCESS_LIST", "DENY_LIST", "AuthError", "Permission", "Principal",
    "apply_customer_scope", "assert_can_access_customer", "customer_scope",
    "get_current_principal", "get_current_user", "is_allowed",
    "register_exception_handlers", "require_permission", "require_role", "router",
]
