"""
Request and response shapes (Pydantic) for the auth endpoints.

All JSON fields are snake_case. Every success response is wrapped as
{"data": ...}; list responses add page, page_size and total.
"""
import re
from datetime import datetime
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.enums import Role

T = TypeVar("T")

# Deliberately simple format check: something@something.tld, no spaces.
# (We avoid pydantic's EmailStr because it rejects reserved demo domains
# such as admin@brightloop.test.)
_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _clean_email(value: str) -> str:
    """Trim spaces, lower-case, and check the format."""
    value = value.strip().lower()
    if len(value) > 254 or not _EMAIL_PATTERN.match(value):
        raise ValueError("must be a valid email address")
    return value


# ---------------------------------------------------------------- requests
class SignupRequest(BaseModel):
    """Customer self-signup. Password rules are enforced in the service layer."""
    full_name: str = Field(min_length=1, max_length=120)
    email: str
    password: str
    company_name: Optional[str] = None
    device_id: Optional[str] = None
    device_name: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v

    @field_validator("email")
    @classmethod
    def _check_email(cls, v: str) -> str:
        return _clean_email(v)


class StaffCreateRequest(SignupRequest):
    """Admin adds a staff member. Same fields as signup; the role is fixed to STAFF."""


class LoginRequest(BaseModel):
    email: str
    password: str
    device_id: Optional[str] = None
    device_name: Optional[str] = None

    @field_validator("email")
    @classmethod
    def _check_email(cls, v: str) -> str:
        return _clean_email(v)


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def _check_email(cls, v: str) -> str:
        return _clean_email(v)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    new_password: str


class CustomerCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    device_id: Optional[str] = None
    device_name: Optional[str] = None

    @field_validator("email")
    @classmethod
    def _check_email(cls, v: str) -> str:
        return _clean_email(v)


# --------------------------------------------------------------- responses
class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: datetime


class UserOut(BaseModel):
    """A user without any secret fields (no password hash, ever)."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: Role
    customer_id: Optional[int] = None
    customer: Optional[CustomerOut] = None
    is_active: bool
    created_at: datetime


class MeOut(UserOut):
    """The logged-in user plus what they may do (the frontend uses this to build menus)."""
    permissions: List[str]


class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int          # seconds
    user: UserOut


class MessageOut(BaseModel):
    message: str
    # Filled ONLY when EXPOSE_RESET_LINK=true (development / demo mode).
    reset_link: Optional[str] = None


class DataResponse(BaseModel, Generic[T]):
    """Standard success envelope: {"data": ...}"""
    data: T


class PagedResponse(BaseModel, Generic[T]):
    """Standard list envelope."""
    data: List[T]
    page: int
    page_size: int
    total: int
