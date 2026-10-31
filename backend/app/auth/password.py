"""
Password rules and hashing.

Rules (challenge document):
    - more than 8 characters   (so 9 or more)
    - at least one uppercase letter
    - at least one lowercase letter
    - at least one special character

Hashing uses PBKDF2-HMAC-SHA256 from Python's standard library (no extra
package). Stored format:  pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>
The iteration count is stored inside the hash, so it can be raised later
without breaking existing users.
"""
import hashlib
import hmac
import secrets
from functools import lru_cache
from typing import List

from app.auth.config import get_settings
from app.auth.constants import (
    PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, SPECIAL_CHARACTERS,
)

_ALGORITHM = "pbkdf2_sha256"


def validate_password_strength(password: str) -> List[str]:
    """
    Check a password against every rule and return the list of problems.
    An empty list means the password is acceptable.

    All problems are returned at once so the user can fix them in one go.
    """
    problems: List[str] = []

    if len(password) < PASSWORD_MIN_LENGTH:
        problems.append("must be more than 8 characters long")
    if len(password) > PASSWORD_MAX_LENGTH:
        problems.append(f"must be at most {PASSWORD_MAX_LENGTH} characters long")
    if not any(ch.isupper() for ch in password):
        problems.append("must contain an uppercase letter")
    if not any(ch.islower() for ch in password):
        problems.append("must contain a lowercase letter")
    if not any(ch in SPECIAL_CHARACTERS for ch in password):
        problems.append("must contain a special character")

    return problems


def hash_password(password: str) -> str:
    """Return a salted hash of the password. Never store the password itself."""
    iterations = get_settings().password_hash_iterations
    salt = secrets.token_bytes(16)  # a fresh random salt for every password
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"{_ALGORITHM}${iterations}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """True when `password` matches `stored_hash`. Never raises on bad input."""
    try:
        algorithm, iterations, salt_hex, digest_hex = stored_hash.split("$")
        if algorithm != _ALGORITHM:
            return False
        candidate = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations)
        )
        # compare_digest takes the same time however many bytes match,
        # which stops attackers from guessing the hash byte by byte.
        return hmac.compare_digest(candidate, bytes.fromhex(digest_hex))
    except (ValueError, TypeError):
        return False


@lru_cache
def dummy_hash() -> str:
    """
    A throwaway hash used when a login email does not exist. Verifying
    against it makes "unknown email" take as long as "wrong password", so
    response time cannot reveal which emails have accounts.
    """
    return hash_password("not-a-real-password")
