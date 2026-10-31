"""
Sends the password-reset email.

Two modes:
    - MOCK (default): no SMTP_HOST configured. The link is printed to the
      server console. This is what the demo uses.
    - SMTP: set SMTP_HOST (and friends) in the environment and a real
      email is sent.

The file is called mailer.py (not email.py) so it never shadows Python's
built-in `email` package.
"""
import smtplib
from email.message import EmailMessage

from app.auth.config import get_settings


def build_reset_link(raw_token: str) -> str:
    """The link placed in the email; it opens the frontend's reset page."""
    return f"{get_settings().frontend_url}/reset-password?token={raw_token}"


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """Deliver the reset link to the user's registered email address."""
    settings = get_settings()

    if not settings.smtp_host:
        # MOCK MODE: keeps the demo working without an email server.
        print(f"[MOCK EMAIL] Password reset for {to_email}: {reset_link}", flush=True)
        return

    message = EmailMessage()
    message["Subject"] = "Reset your Brightloop password"
    message["From"] = settings.smtp_from
    message["To"] = to_email
    message.set_content(
        "We received a request to reset your Brightloop password.\n\n"
        f"Open this link to choose a new password:\n{reset_link}\n\n"
        f"The link works once and expires in {settings.reset_token_minutes} minutes.\n"
        "If you did not ask for this, you can ignore this email."
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        smtp.starttls()
        if settings.smtp_user and settings.smtp_password:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)
