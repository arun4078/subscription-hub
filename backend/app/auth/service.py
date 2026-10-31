"""
Business logic for authentication. Routers stay thin and call these
functions; nothing here knows about HTTP except the AuthError status codes.

Challenge-document rules implemented here:
    - one account per email                      (signup_customer, create_staff)
    - strong password                            (_require_strong_password)
    - reset link sent to the registered email    (request_password_reset)
    - only the admin can add staff               (create_staff)
    - customers only ever get the CUSTOMER role  (signup_customer)
"""
from datetime import timedelta
from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import mailer
from app.auth.config import get_settings
from app.auth.constants import ErrorCode
from app.auth.exceptions import AuthError
from app.auth.models import Customer, PasswordResetToken, User
from app.auth.password import (
    dummy_hash, hash_password, validate_password_strength, verify_password,
)
from app.auth.permissions import Permission, ensure_permission
from app.auth.tokens import generate_reset_token, hash_reset_token
from app.database import utcnow
from app.enums import Role

# Same answer whether or not the email exists, so attackers cannot use
# the "forgot password" form to discover who has an account.
FORGOT_PASSWORD_MESSAGE = (
    "If an account exists for that email, a password reset link has been sent."
)


# ------------------------------------------------------------------ helpers
def _require_strong_password(password: str) -> None:
    """Raise 400 INVALID_PASSWORD listing every rule the password breaks."""
    problems = validate_password_strength(password)
    if problems:
        raise AuthError(
            400,
            ErrorCode.INVALID_PASSWORD,
            "Password " + "; ".join(problems) + ".",
        )


def _email_exists(db: Session, email: str) -> bool:
    return db.scalar(select(func.count()).select_from(User).where(User.email == email)) > 0


def _email_taken_error() -> AuthError:
    return AuthError(409, ErrorCode.EMAIL_ALREADY_EXISTS, "An account with this email already exists.")


# ------------------------------------------------------------------- signup
def signup_customer(
    db: Session,
    full_name: str,
    email: str,
    password: str,
    company_name: Optional[str] = None,
    device_id: Optional[str] = None,
    device_name: Optional[str] = None,
) -> User:
    """
    Public self-signup. Always creates a CUSTOMER and their customer record.
    There is deliberately no way to pick a role here, so nobody can sign
    themselves up as ADMIN or STAFF.
    """
    _require_strong_password(password)
    if _email_exists(db, email):
        raise _email_taken_error()

    try:
        customer = Customer(
            name=full_name,
            email=email,
            company_name=company_name or f"{full_name} Org",
            device_id=device_id,
            device_name=device_name,
            last_login=utcnow(),
        )
        db.add(customer)
        db.flush()  # assigns customer.id without committing yet

        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role=Role.CUSTOMER,
            customer_id=customer.id,
        )
        db.add(user)
        db.commit()  # customer + user are saved together or not at all
    except IntegrityError:
        # Two signups with the same email at the same moment: the UNIQUE
        # index lets only one through.
        db.rollback()
        raise _email_taken_error()
    return user


# -------------------------------------------------------------- staff admin
def create_staff(db: Session, actor_role: Role, full_name: str, email: str, password: str) -> User:
    """
    Add an internal staff member. Only the admin may do this.

    The permission is checked here as well as in the router (defence in
    depth): even if some future endpoint forgets the guard, this function
    still refuses. The new user is always STAFF, an admin cannot be
    created through the API (the first admin comes from seed.py).
    """
    ensure_permission(actor_role, Permission.STAFF_MANAGE)
    _require_strong_password(password)
    if _email_exists(db, email):
        raise _email_taken_error()

    user = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role=Role.STAFF,
        customer_id=None,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise _email_taken_error()
    return user


def list_staff(db: Session, page: int, page_size: int) -> Tuple[List[User], int]:
    """Paginated list of STAFF users plus the total count."""
    total = db.scalar(select(func.count()).select_from(User).where(User.role == Role.STAFF)) or 0
    rows = db.scalars(
        select(User)
        .where(User.role == Role.STAFF)
        .order_by(User.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return list(rows), total


# -------------------------------------------------------------------- login
def authenticate(
    db: Session,
    email: str,
    password: str,
    device_id: Optional[str] = None,
    device_name: Optional[str] = None,
) -> User:
    """
    Check email + password. Wrong email and wrong password give the SAME
    error (and take similar time) so nobody can probe which emails exist.
    Also ensures that if a customer logs in, their customer details and device
    are stored and linked to the db.
    """
    user = db.scalar(select(User).where(User.email == email))

    if user is None:
        verify_password(password, dummy_hash())  # burn the same time as a real check
        raise AuthError(401, ErrorCode.INVALID_CREDENTIALS, "Invalid email or password.")
    if not verify_password(password, user.password_hash):
        raise AuthError(401, ErrorCode.INVALID_CREDENTIALS, "Invalid email or password.")
    if not user.is_active:
        # Only reached with the correct password, so this reveals nothing to strangers.
        raise AuthError(403, ErrorCode.ACCOUNT_DISABLED, "This account has been deactivated.")

    # When logging in as a CUSTOMER: ensure customer details exist & device is recognized in DB
    if user.role == Role.CUSTOMER:
        customer = None
        if user.customer_id is not None:
            customer = db.get(Customer, user.customer_id)
        if customer is None:
            customer = db.scalar(select(Customer).where(Customer.email == user.email))

        if customer is None:
            # Create the customer record so it is permanently in DB
            customer = Customer(
                name=user.full_name,
                email=user.email,
                company_name=f"{user.full_name} Org",
                device_id=device_id,
                device_name=device_name,
                last_login=utcnow(),
            )
            db.add(customer)
            db.flush()
            user.customer_id = customer.id
        else:
            # Update device recognition and last login
            if device_id:
                customer.device_id = device_id
            if device_name:
                customer.device_name = device_name
            customer.last_login = utcnow()
            if user.customer_id != customer.id:
                user.customer_id = customer.id

        db.commit()
        db.refresh(user)

    return user


# ---------------------------------------------------------------- customers
def list_customers(db: Session, page: int = 1, page_size: int = 50) -> Tuple[List[Customer], int]:
    """Paginated list of registered customers."""
    total = db.scalar(select(func.count()).select_from(Customer)) or 0
    rows = db.scalars(
        select(Customer)
        .order_by(Customer.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return list(rows), total


def ensure_customer_record(
    db: Session,
    name: str,
    email: str,
    company_name: Optional[str] = None,
    phone: Optional[str] = None,
    address: Optional[str] = None,
    device_id: Optional[str] = None,
    device_name: Optional[str] = None,
) -> Customer:
    """Add customer details to DB or update existing."""
    clean_email = email.strip().lower()
    customer = db.scalar(select(Customer).where(Customer.email == clean_email))
    if customer:
        if name:
            customer.name = name.strip()
        if company_name:
            customer.company_name = company_name.strip()
        if phone:
            customer.phone = phone.strip()
        if address:
            customer.address = address.strip()
        if device_id:
            customer.device_id = device_id
        if device_name:
            customer.device_name = device_name
        customer.last_login = utcnow()
    else:
        customer = Customer(
            name=name.strip(),
            email=clean_email,
            company_name=company_name.strip() if company_name else f"{name} Org",
            phone=phone.strip() if phone else None,
            address=address.strip() if address else None,
            device_id=device_id,
            device_name=device_name,
            last_login=utcnow(),
        )
        db.add(customer)

    db.commit()
    db.refresh(customer)
    return customer


# ----------------------------------------------------------- password reset
def request_password_reset(db: Session, email: str) -> Optional[str]:
    """
    Start a password reset: create a one-time token and email the link to
    the account's registered address.

    Returns the link (for the dev-only 'expose' option) or None when no
    active account matches. The router answers identically in both cases.
    """
    user = db.scalar(select(User).where(User.email == email, User.is_active.is_(True)))
    if user is None:
        return None

    now = utcnow()

    # Only the newest link should work: retire any earlier unused ones.
    for old in db.scalars(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None)
        )
    ):
        old.used_at = now

    raw_token, token_hash = generate_reset_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(minutes=get_settings().reset_token_minutes),
        )
    )
    db.commit()

    link = mailer.build_reset_link(raw_token)
    mailer.send_password_reset_email(user.email, link)
    return link


def reset_password(db: Session, raw_token: str, new_password: str) -> None:
    """
    Finish a password reset with the token from the emailed link.

    The token must exist, be unused and not be expired. On success the
    password changes, the token is burned, and every login token issued
    before now stops working (token_version is bumped).
    """
    record = db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_reset_token(raw_token))
    )
    now = utcnow()
    if record is None or record.used_at is not None or record.expires_at < now:
        raise AuthError(
            400,
            ErrorCode.INVALID_RESET_TOKEN,
            "This password reset link is invalid or has expired.",
        )

    _require_strong_password(new_password)

    user = db.get(User, record.user_id)
    user.password_hash = hash_password(new_password)
    user.token_version += 1          # logs out every existing session
    record.used_at = now             # the link cannot be used twice
    db.commit()
