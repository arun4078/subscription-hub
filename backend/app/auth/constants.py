"""
Fixed values used across the auth module: password rules and error codes.

Error codes are part of the API contract: the frontend switches on them,
so do not rename one without telling P3 and P4.
"""
import string

# --- Password rules (from the challenge document) ---
# "must be more than eight characters" -> strictly greater than 8, so 9 or more.
PASSWORD_MIN_LENGTH = 9
# Not in the document: an upper bound stops absurdly long inputs from
# being used to burn CPU in the hashing function.
PASSWORD_MAX_LENGTH = 128
# What counts as a "special character": !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~
SPECIAL_CHARACTERS = string.punctuation

# --- Pagination ---
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


class ErrorCode:
    """Machine-readable codes returned in {"error": {"code": ..., "message": ...}}."""

    # 400
    VALIDATION_ERROR = "VALIDATION_ERROR"          # malformed request body
    INVALID_PASSWORD = "INVALID_PASSWORD"          # breaks the password rules
    INVALID_RESET_TOKEN = "INVALID_RESET_TOKEN"    # reset link wrong, used or expired
    # 401
    NOT_AUTHENTICATED = "NOT_AUTHENTICATED"        # no token sent
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"    # wrong email or password
    TOKEN_INVALID = "TOKEN_INVALID"                # token is malformed or tampered
    TOKEN_EXPIRED = "TOKEN_EXPIRED"                # token past its expiry time
    TOKEN_REVOKED = "TOKEN_REVOKED"                # password changed after token was issued
    # 403
    FORBIDDEN = "FORBIDDEN"                        # role lacks the permission
    ACCOUNT_DISABLED = "ACCOUNT_DISABLED"          # account was deactivated
    # 404
    NOT_FOUND = "NOT_FOUND"                        # also used to hide other customers' records
    # 409
    EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS"  # one account per email
