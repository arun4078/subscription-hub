"""
Database tables owned by the auth module (owner: P1).

    customers               - the business a CUSTOMER user belongs to
    users                   - every login (ADMIN, STAFF or CUSTOMER)
    password_reset_tokens   - one-time "forgot password" links

Only P1 writes migrations for these tables. Billing-related columns on
`customers` (address, tax region ...) are added later in their own migration.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, Enum as SAEnum, ForeignKey, Integer, String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, utcnow
from app.enums import Role


class Customer(Base):
    """A paying customer (a business). Subscriptions and invoices point here."""

    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    # NOT unique on purpose: the unique rule lives on users.email, because the
    # document says "each email can belong to only one account".
    email: Mapped[str] = mapped_column(String(254), index=True)
    company_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    device_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    device_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class User(Base):
    """A login account."""

    __tablename__ = "users"
    __table_args__ = (
        # A CUSTOMER must be linked to a customer record, and ADMIN/STAFF must not.
        # The portal scopes every query by this link, so the database enforces it.
        CheckConstraint(
            "(role = 'CUSTOMER' AND customer_id IS NOT NULL) OR "
            "(role <> 'CUSTOMER' AND customer_id IS NULL)",
            name="ck_users_customer_link_matches_role",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    # Stored lower-case. The UNIQUE index is what truly guarantees one account
    # per email, even if two signups arrive at the same moment.
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120))

    role: Mapped[Role] = mapped_column(SAEnum(Role, native_enum=False, length=20), index=True)
    customer_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("customers.id"), nullable=True, index=True
    )
    customer: Mapped[Optional[Customer]] = relationship()

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Bumped whenever the password changes. Tokens carry the value they were
    # issued with, so all older tokens stop working immediately.
    token_version: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class PasswordResetToken(Base):
    """
    A one-time reset link. We store only the SHA-256 hash of the token, so a
    leaked database cannot be used to reset anyone's password.
    """

    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
