"""
services/billing.py
Brightloop Subscription Management System - Central Money Math Service

Implements strict decimal rules:
- NUMERIC(12,2) in DB, Decimal in Python, 2-decimal string in JSON ("1180.00"). Never floats.
- Dates: ISO 8601, UTC.
- Overdue is not stored. It is computed: status is CONFIRMED, due date is before today, and balance is above 0.
- Line amount: quantity * (plan price + variant extra).
- Discount first: apply valid discount within validity, min quantity/amount, max uses.
- Then tax: (line amount minus discount) * tax rate.
- Total: line amount - discount + tax (round half up to 2 decimals).
- No double billing: unique rule on subscription and billing period start.
"""

from decimal import Decimal, ROUND_HALF_UP
from datetime import date, timedelta
from typing import List, Dict, Any, Optional

TWOPLACES = Decimal('0.01')

def to_decimal(val) -> Decimal:
    if val is None:
        return Decimal('0.00')
    if isinstance(val, Decimal):
        return val.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
    return Decimal(str(val)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

def format_money(val: Decimal) -> str:
    return str(val.quantize(TWOPLACES, rounding=ROUND_HALF_UP))

def is_invoice_overdue(status: str, due_date: date, balance_amount: Decimal, today: Optional[date] = None) -> bool:
    if today is None:
        today = date.today()
    return status == "CONFIRMED" and due_date < today and balance_amount > Decimal('0.00')

def advance_billing_date(current_date: date, period: str) -> date:
    p = period.upper()
    if p == "DAILY":
        return current_date + timedelta(days=1)
    elif p == "WEEKLY":
        return current_date + timedelta(days=7)
    elif p == "MONTHLY":
        # Advance 1 month
        month = current_date.month + 1
        year = current_date.year
        if month > 12:
            month = 1
            year += 1
        day = min(current_date.day, 28)
        return date(year, month, day)
    elif p == "YEARLY":
        return date(current_date.year + 1, current_date.month, min(current_date.day, 28))
    return current_date

def compute_line_item(quantity: int, unit_price: Decimal, tax_rate_percent: Decimal, discount_amount: Decimal = Decimal('0.00')) -> Dict[str, Decimal]:
    subtotal = (Decimal(quantity) * unit_price).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
    capped_discount = min(discount_amount, subtotal)
    taxable = (subtotal - capped_discount).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
    tax_rate = (tax_rate_percent / Decimal('100.00'))
    tax_amount = (taxable * tax_rate).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
    total = (taxable + tax_amount).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
    return {
        "subtotal": subtotal,
        "discount_amount": capped_discount,
        "taxable": taxable,
        "tax_amount": tax_amount,
        "total": total
    }
