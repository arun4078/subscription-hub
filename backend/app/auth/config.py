"""
Auth settings, read from environment variables (see .env.example).

Nothing secret is hard-coded. If JWT_SECRET is missing we fall back to an
insecure development value and print a warning, so the demo still runs
but nobody ships it by accident.
"""
import os
import warnings
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


_DEV_SECRET = "dev-only-insecure-secret-change-me"


def _env_bool(name: str, default: bool = False) -> bool:
    """Read a true/false environment variable ('1', 'true', 'yes', 'on')."""
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class AuthSettings:
    # --- JWT ---
    jwt_secret: str
    jwt_algorithm: str
    access_token_minutes: int          # how long a login stays valid

    # --- Password reset ---
    reset_token_minutes: int           # how long an emailed reset link works
    frontend_url: str                  # base URL used to build the reset link
    expose_reset_link: bool            # DEV ONLY: also return the link in the API response

    # --- Password hashing ---
    password_hash_iterations: int      # PBKDF2 rounds (lower only in tests)

    # --- Email (leave smtp_host empty to use the mock mailer) ---
    smtp_host: Optional[str]
    smtp_port: int
    smtp_user: Optional[str]
    smtp_password: Optional[str]
    smtp_from: str


@lru_cache
def get_settings() -> AuthSettings:
    """Build the settings once and reuse them."""
    secret = os.getenv("JWT_SECRET")
    if not secret:
        warnings.warn(
            "JWT_SECRET is not set - using an insecure development secret. "
            "Set JWT_SECRET before deploying.",
            stacklevel=2,
        )
        secret = _DEV_SECRET

    return AuthSettings(
        jwt_secret=secret,
        jwt_algorithm="HS256",
        access_token_minutes=int(os.getenv("ACCESS_TOKEN_MINUTES", "60")),
        reset_token_minutes=int(os.getenv("RESET_TOKEN_MINUTES", "30")),
        frontend_url=os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/"),
        expose_reset_link=_env_bool("EXPOSE_RESET_LINK", False),
        password_hash_iterations=int(os.getenv("AUTH_PBKDF2_ITERATIONS", "600000")),
        smtp_host=os.getenv("SMTP_HOST") or None,
        smtp_port=int(os.getenv("SMTP_PORT", "587")),
        smtp_user=os.getenv("SMTP_USER") or None,
        smtp_password=os.getenv("SMTP_PASSWORD") or None,
        smtp_from=os.getenv("SMTP_FROM", "no-reply@brightloop.test"),
    )
