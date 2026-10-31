"""
Shared enums for the whole backend (one source of truth).

RULE: nobody invents new status or role names. If a new value is needed,
add it here in a PR and mirror it in frontend/src/types/enums.ts.

Every enum subclasses `str` so values serialise straight to JSON
("ADMIN") and compare equal to plain strings.
"""
from enum import Enum


class Role(str, Enum):
    """The three user types from the challenge document."""
    ADMIN = "ADMIN"        # controls the whole system, the only one who can add staff
    STAFF = "STAFF"        # internal team, day-to-day work with limited access
    CUSTOMER = "CUSTOMER"  # portal user, sees only their own data


class BillingPeriod(str, Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"


class SubscriptionStatus(str, Enum):
    DRAFT = "DRAFT"
    QUOTATION = "QUOTATION"
    CONFIRMED = "CONFIRMED"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"


class InvoiceStatus(str, Enum):
    # "Overdue" is deliberately NOT a status: it is computed as
    # status == CONFIRMED and due_date < today and balance > 0.
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


class DiscountType(str, Enum):
    FIXED = "FIXED"
    PERCENTAGE = "PERCENTAGE"


class PaymentMethod(str, Enum):
    CASH = "CASH"
    CARD = "CARD"
    BANK_TRANSFER = "BANK_TRANSFER"
    UPI = "UPI"
    OTHER = "OTHER"
