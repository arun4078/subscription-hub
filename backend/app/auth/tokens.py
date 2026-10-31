"""
Tokens used by auth:

    1. Access token  - a signed JWT sent as "Authorization: Bearer <token>".
    2. Reset token   - a random one-time string emailed inside the reset link.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Tuple

import jwt

from app.auth.config import get_settings
from app.auth.constants import ErrorCode
from app.auth.exceptions import AuthError
from app.auth.models import User


def create_access_token(user: User) -> Tuple[str, int]:
    """
    Sign a JWT for the user. Returns (token, seconds_until_expiry).

    The claims are only a convenience for the frontend. The server never
    trusts `role` or `customer_id` from the token: it reloads the user from
    the database on every request (see dependencies.get_current_user).
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expires_in = settings.access_token_minutes * 60
    payload = {
        "sub": str(user.id),                    # who the token belongs to
        "role": user.role.value,                # informational only
        "customer_id": user.customer_id,        # informational only
        "tv": user.token_version,               # invalidated when the password changes
        "iat": now,                             # issued at
        "exp": now + timedelta(seconds=expires_in),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, expires_in


def decode_access_token(token: str) -> dict:
    """Verify signature and expiry. Raises AuthError(401) for any bad token."""
    settings = get_settings()
    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],   # pin the algorithm, never trust the header
            options={"require": ["exp", "iat", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise AuthError(401, ErrorCode.TOKEN_EXPIRED, "Your session has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise AuthError(401, ErrorCode.TOKEN_INVALID, "Invalid authentication token.")


def generate_reset_token() -> Tuple[str, str]:
    """
    Create a password-reset token. Returns (raw_token, token_hash).
    Email the raw token; store only the hash.
    """
    raw = secrets.token_urlsafe(32)   # 256 bits of randomness
    return raw, hash_reset_token(raw)


def hash_reset_token(raw_token: str) -> str:
    """SHA-256 of the raw token. Fast hashing is fine: the token is already random."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
