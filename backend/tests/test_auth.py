"""
Tests for the auth module. Run from the backend folder:  pytest -v

Uses an in-memory SQLite database, so nothing touches real data.
"""
import os

# Must be set BEFORE the app is imported (settings are read once).
os.environ["JWT_SECRET"] = "test-secret-not-for-production-use-1234567890"
os.environ["AUTH_PBKDF2_ITERATIONS"] = "1000"      # fast hashing for tests only
os.environ["EXPOSE_RESET_LINK"] = "true"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.dependencies import Principal, apply_customer_scope, assert_can_access_customer
from app.auth.exceptions import AuthError
from app.auth.models import User
from app.auth.permissions import (
    ACCESS_LIST, ADMIN_ONLY_PERMISSIONS, DENY_LIST, INTERNAL_PERMISSIONS,
    Permission, is_allowed, permissions_for, validate_permission_tables,
)
from app.auth.seed import ensure_admin
from app.database import Base, get_db
from app.enums import Role
from app.main import app

GOOD_PASSWORD = "Str0ng!Pass"
ADMIN_EMAIL, ADMIN_PASSWORD = "admin@brightloop.test", "Admin#12345"


# ---------------------------------------------------------------- fixtures
@pytest.fixture()
def session_factory():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture()
def client(session_factory):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


# ----------------------------------------------------------------- helpers
def signup(client, email="cust@example.com", password=GOOD_PASSWORD, name="Cust One"):
    return client.post("/api/v1/auth/signup", json={"full_name": name, "email": email, "password": password})


def login(client, email, password):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def token_for(client, email, password) -> str:
    return login(client, email, password).json()["data"]["access_token"]


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def make_admin_token(client, session_factory) -> str:
    with session_factory() as db:
        ensure_admin(db, ADMIN_EMAIL, ADMIN_PASSWORD)
    return token_for(client, ADMIN_EMAIL, ADMIN_PASSWORD)


def make_staff(client, admin_token, email="staff@example.com", password=GOOD_PASSWORD):
    return client.post(
        "/api/v1/auth/staff",
        json={"full_name": "Staff One", "email": email, "password": password},
        headers=bearer(admin_token),
    )


# ------------------------------------------------- signup: unique + password
def test_signup_creates_customer_with_customer_record(client):
    res = signup(client)
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["role"] == "CUSTOMER"
    assert data["customer_id"] is not None
    assert "password" not in str(data).lower().replace("password_hash", "")  # no secrets leak
    assert "password_hash" not in data


def test_duplicate_email_is_rejected_case_insensitively(client):
    assert signup(client, email="dup@example.com").status_code == 201
    res = signup(client, email="DUP@Example.com")
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "EMAIL_ALREADY_EXISTS"


@pytest.mark.parametrize(
    "password",
    [
        "Ab1!abcd",       # exactly 8 characters: "more than eight" is required
        "alllower1!xx",   # no uppercase
        "ALLUPPER1!XX",   # no lowercase
        "NoSpecial123x",  # no special character
    ],
)
def test_weak_passwords_are_rejected(client, password):
    res = signup(client, password=password)
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_PASSWORD"


def test_nine_character_password_is_accepted(client):
    assert signup(client, password="Abcdefg!1").status_code == 201


def test_weak_password_message_lists_every_broken_rule(client):
    message = signup(client, password="abc").json()["error"]["message"]
    assert "8 characters" in message and "uppercase" in message and "special" in message


def test_malformed_email_gives_validation_error_in_standard_shape(client):
    res = signup(client, email="not-an-email")
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_signup_cannot_choose_a_role(client):
    res = client.post(
        "/api/v1/auth/signup",
        json={"full_name": "Sneaky", "email": "s@example.com", "password": GOOD_PASSWORD, "role": "ADMIN"},
    )
    assert res.status_code == 201
    assert res.json()["data"]["role"] == "CUSTOMER"


# ---------------------------------------------------------------- login/me
def test_login_success_and_me(client):
    signup(client)
    res = login(client, "cust@example.com", GOOD_PASSWORD)
    assert res.status_code == 200
    token = res.json()["data"]["access_token"]
    me = client.get("/api/v1/auth/me", headers=bearer(token))
    assert me.status_code == 200
    assert "INVOICE_VIEW_OWN" in me.json()["data"]["permissions"]
    assert "STAFF_MANAGE" not in me.json()["data"]["permissions"]


def test_wrong_password_and_unknown_email_give_identical_errors(client):
    signup(client)
    wrong_pw = login(client, "cust@example.com", "Wrong!Pass1")
    unknown = login(client, "nobody@example.com", "Wrong!Pass1")
    assert wrong_pw.status_code == unknown.status_code == 401
    assert wrong_pw.json() == unknown.json()


def test_protected_endpoint_requires_token(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "NOT_AUTHENTICATED"


def test_garbage_token_is_rejected(client):
    res = client.get("/api/v1/auth/me", headers=bearer("not.a.token"))
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "TOKEN_INVALID"


def test_deactivated_account_cannot_log_in_or_use_old_token(client, session_factory):
    signup(client)
    token = token_for(client, "cust@example.com", GOOD_PASSWORD)
    with session_factory() as db:
        user = db.scalar(select(User).where(User.email == "cust@example.com"))
        user.is_active = False
        db.commit()
    assert login(client, "cust@example.com", GOOD_PASSWORD).json()["error"]["code"] == "ACCOUNT_DISABLED"
    assert client.get("/api/v1/auth/me", headers=bearer(token)).status_code == 403


# ------------------------------------------- only the admin can add staff
def test_admin_can_add_staff_and_staff_can_log_in(client, session_factory):
    admin_token = make_admin_token(client, session_factory)
    res = make_staff(client, admin_token)
    assert res.status_code == 201
    assert res.json()["data"]["role"] == "STAFF"
    assert res.json()["data"]["customer_id"] is None
    assert login(client, "staff@example.com", GOOD_PASSWORD).status_code == 200


def test_customer_cannot_add_staff(client):
    signup(client)
    token = token_for(client, "cust@example.com", GOOD_PASSWORD)
    res = make_staff(client, token, email="x@example.com")
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"


def test_staff_cannot_add_staff(client, session_factory):
    admin_token = make_admin_token(client, session_factory)
    make_staff(client, admin_token)
    staff_token = token_for(client, "staff@example.com", GOOD_PASSWORD)
    assert make_staff(client, staff_token, email="another@example.com").status_code == 403


def test_anonymous_cannot_add_staff(client):
    res = client.post(
        "/api/v1/auth/staff",
        json={"full_name": "X", "email": "x@example.com", "password": GOOD_PASSWORD},
    )
    assert res.status_code == 401


def test_staff_creation_enforces_password_and_unique_email(client, session_factory):
    admin_token = make_admin_token(client, session_factory)
    assert make_staff(client, admin_token, password="weak").status_code == 400
    assert make_staff(client, admin_token).status_code == 201
    assert make_staff(client, admin_token).status_code == 409


def test_staff_list_is_admin_only_and_paginated(client, session_factory):
    admin_token = make_admin_token(client, session_factory)
    for i in range(3):
        make_staff(client, admin_token, email=f"s{i}@example.com")
    res = client.get("/api/v1/auth/staff?page=1&page_size=2", headers=bearer(admin_token))
    body = res.json()
    assert res.status_code == 200
    assert body["total"] == 3 and len(body["data"]) == 2 and body["page_size"] == 2
    signup(client)
    cust_token = token_for(client, "cust@example.com", GOOD_PASSWORD)
    assert client.get("/api/v1/auth/staff", headers=bearer(cust_token)).status_code == 403


# ------------------------------------------------------- password reset
def _forgot(client, email):
    return client.post("/api/v1/auth/forgot-password", json={"email": email})


def _token_from_link(link: str) -> str:
    return link.split("token=")[1]


def test_forgot_password_gives_same_message_for_unknown_email(client):
    signup(client)
    known = _forgot(client, "cust@example.com").json()["data"]
    unknown = _forgot(client, "ghost@example.com").json()["data"]
    assert known["message"] == unknown["message"]
    assert known["reset_link"] and unknown["reset_link"] is None  # link only exposed in dev mode


def test_full_reset_flow_and_old_sessions_die(client):
    signup(client)
    old_token = token_for(client, "cust@example.com", GOOD_PASSWORD)
    raw = _token_from_link(_forgot(client, "cust@example.com").json()["data"]["reset_link"])

    res = client.post("/api/v1/auth/reset-password", json={"token": raw, "new_password": "N3w!Password"})
    assert res.status_code == 200

    assert login(client, "cust@example.com", GOOD_PASSWORD).status_code == 401      # old password dead
    assert login(client, "cust@example.com", "N3w!Password").status_code == 200     # new one works
    me = client.get("/api/v1/auth/me", headers=bearer(old_token))                   # old session dead
    assert me.status_code == 401 and me.json()["error"]["code"] == "TOKEN_REVOKED"


def test_reset_token_is_single_use(client):
    signup(client)
    raw = _token_from_link(_forgot(client, "cust@example.com").json()["data"]["reset_link"])
    assert client.post("/api/v1/auth/reset-password", json={"token": raw, "new_password": "N3w!Password"}).status_code == 200
    again = client.post("/api/v1/auth/reset-password", json={"token": raw, "new_password": "An0ther!Pass"})
    assert again.status_code == 400 and again.json()["error"]["code"] == "INVALID_RESET_TOKEN"


def test_only_newest_reset_link_works(client):
    signup(client)
    first = _token_from_link(_forgot(client, "cust@example.com").json()["data"]["reset_link"])
    second = _token_from_link(_forgot(client, "cust@example.com").json()["data"]["reset_link"])
    assert client.post("/api/v1/auth/reset-password", json={"token": first, "new_password": "N3w!Password"}).status_code == 400
    assert client.post("/api/v1/auth/reset-password", json={"token": second, "new_password": "N3w!Password"}).status_code == 200


def test_reset_rejects_weak_new_password_and_keeps_token_usable(client):
    signup(client)
    raw = _token_from_link(_forgot(client, "cust@example.com").json()["data"]["reset_link"])
    weak = client.post("/api/v1/auth/reset-password", json={"token": raw, "new_password": "weak"})
    assert weak.status_code == 400 and weak.json()["error"]["code"] == "INVALID_PASSWORD"
    assert client.post("/api/v1/auth/reset-password", json={"token": raw, "new_password": "N3w!Password"}).status_code == 200


def test_expired_reset_token_is_rejected(client, session_factory):
    from datetime import timedelta
    from app.auth.models import PasswordResetToken
    from app.database import utcnow

    signup(client)
    raw = _token_from_link(_forgot(client, "cust@example.com").json()["data"]["reset_link"])
    with session_factory() as db:
        record = db.scalar(select(PasswordResetToken))
        record.expires_at = utcnow() - timedelta(minutes=1)
        db.commit()
    res = client.post("/api/v1/auth/reset-password", json={"token": raw, "new_password": "N3w!Password"})
    assert res.status_code == 400 and res.json()["error"]["code"] == "INVALID_RESET_TOKEN"


def test_made_up_reset_token_is_rejected(client):
    res = client.post("/api/v1/auth/reset-password", json={"token": "made-up", "new_password": "N3w!Password"})
    assert res.status_code == 400


# ------------------------------------------- access list / deny list (unit)
def test_admin_has_every_permission():
    assert all(is_allowed(Role.ADMIN, p) for p in Permission)


def test_staff_is_denied_every_admin_only_permission():
    for perm in ADMIN_ONLY_PERMISSIONS:
        assert not is_allowed(Role.STAFF, perm)
        assert perm in DENY_LIST[Role.STAFF]


def test_staff_can_do_daily_work():
    for perm in (Permission.SUBSCRIPTION_CREATE, Permission.BILLING_RUN, Permission.PAYMENT_RECORD, Permission.DASHBOARD_VIEW):
        assert is_allowed(Role.STAFF, perm)


def test_customer_is_denied_every_internal_permission():
    for perm in INTERNAL_PERMISSIONS:
        assert not is_allowed(Role.CUSTOMER, perm)


def test_customer_has_only_portal_permissions():
    assert set(permissions_for(Role.CUSTOMER)) == {
        "CATALOG_VIEW", "SUBSCRIPTION_VIEW_OWN", "SUBSCRIPTION_CLOSE_OWN",
        "INVOICE_VIEW_OWN", "INVOICE_PRINT_OWN",
    }


def test_deny_beats_access_and_unlisted_is_denied():
    # deny wins even if someone wrongly puts the permission on the access list
    assert Permission.STAFF_MANAGE not in ACCESS_LIST[Role.STAFF]
    leaky = {**ACCESS_LIST, Role.STAFF: ACCESS_LIST[Role.STAFF] | {Permission.STAFF_MANAGE}}
    with pytest.raises(RuntimeError):
        validate_permission_tables(access=leaky)  # startup check refuses the overlap
    # a role with no entries at all gets nothing
    assert not is_allowed(None, Permission.CATALOG_VIEW)


def test_customer_scope_helpers():
    customer = Principal(user_id=1, email="c@x.com", role=Role.CUSTOMER, customer_id=7)
    staff = Principal(user_id=2, email="s@x.com", role=Role.STAFF, customer_id=None)

    # a customer can only reach their own customer id; others look like "not found"
    assert_can_access_customer(customer, 7)
    with pytest.raises(AuthError) as exc:
        assert_can_access_customer(customer, 8)
    assert exc.value.status_code == 404
    assert_can_access_customer(staff, 8)  # internal users are unrestricted

    # query scoping adds a WHERE for customers only
    class Col:  # tiny stand-in for a SQLAlchemy column
        def __eq__(self, other):
            return f"= {other}"

    class Stmt:
        def __init__(self): self.filters = []
        def where(self, clause):
            self.filters.append(clause)
            return self

    assert apply_customer_scope(Stmt(), Col(), customer).filters == ["= 7"]
    assert apply_customer_scope(Stmt(), Col(), staff).filters == []


def test_database_blocks_customer_without_customer_link(session_factory):
    from sqlalchemy.exc import IntegrityError
    with session_factory() as db:
        db.add(User(email="bad@x.com", password_hash="x", full_name="Bad", role=Role.CUSTOMER, customer_id=None))
        with pytest.raises(IntegrityError):
            db.commit()
