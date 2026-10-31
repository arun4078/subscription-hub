"""
Creates the first ADMIN account.

The API cannot create admins (that would let anyone become one), so the
first admin is created here, once, from the command line:

    ADMIN_EMAIL=admin@brightloop.test ADMIN_PASSWORD='Admin#12345' python -m app.auth.seed

It is safe to run repeatedly: if the email already exists nothing changes.
"""
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import Customer, User
from app.auth.password import hash_password, validate_password_strength
from app.database import Base, SessionLocal, engine, migrate_sqlite_columns
from app.enums import Role


def ensure_admin(
    db: Session, email: str, password: str, full_name: str = "Administrator"
) -> User:
    """Create the admin if missing and return it. Applies the same password rules as signup."""
    email = email.strip().lower()

    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        return existing

    problems = validate_password_strength(password)
    if problems:
        raise ValueError("Admin password " + "; ".join(problems) + ".")

    admin = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role=Role.ADMIN,
        customer_id=None,   # admins are not tied to a customer
    )
    db.add(admin)
    db.commit()
    return admin


def ensure_customer(
    db: Session,
    email: str,
    password: str,
    full_name: str,
    company_name: str = "Apex Tech Labs Inc.",
    phone: str = "+1 (555) 019-2834",
    address: str = "452 Innovation Blvd, Austin, TX",
) -> User:
    """Create a demo customer account if missing and ensure customer details in DB."""
    email = email.strip().lower()
    existing_user = db.scalar(select(User).where(User.email == email))

    customer = db.scalar(select(Customer).where(Customer.email == email))
    if customer is None:
        customer = Customer(
            name=full_name,
            email=email,
            company_name=company_name,
            phone=phone,
            address=address,
        )
        db.add(customer)
        db.flush()

    if existing_user is not None:
        if existing_user.customer_id is None:
            existing_user.customer_id = customer.id
            db.commit()
        return existing_user

    user = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role=Role.CUSTOMER,
        customer_id=customer.id,
    )
    db.add(user)
    db.commit()
    return user


def seed_from_env() -> Optional[User]:
    """Read ADMIN_EMAIL / ADMIN_PASSWORD from the environment and ensure essential accounts exist."""
    migrate_sqlite_columns()
    admin_email = os.getenv("ADMIN_EMAIL", "admin@brightloop.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "Admin@123!")

    with SessionLocal() as db:
        admin = ensure_admin(db, admin_email, admin_password, "Administrator")
        ensure_customer(
            db,
            "customer@apexlabs.com",
            "Admin@123!",
            "Alex Rivera",
            "Apex Tech Labs Inc.",
            "+1 (555) 019-2834",
            "452 Innovation Blvd, Austin, TX",
        )
        return admin


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    admin = seed_from_env()
    print(f"Admin ready: {admin.email}" if admin else "Set ADMIN_EMAIL and ADMIN_PASSWORD first.")
