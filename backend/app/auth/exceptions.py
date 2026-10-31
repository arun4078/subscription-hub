"""
One error type for the whole auth module, plus the handlers that turn
every failure into the agreed error shape:

    {"error": {"code": "INVALID_PASSWORD", "message": "..."}}

Call `register_exception_handlers(app)` once in main.py.
"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.auth.constants import ErrorCode


class AuthError(Exception):
    """
    Raise this anywhere in services or dependencies.

    status_code : HTTP status (400, 401, 403, 404, 409 ...)
    code        : machine-readable string from ErrorCode
    message     : human-readable sentence safe to show to the user
    """

    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def _error_body(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


async def _handle_auth_error(_request: Request, exc: AuthError) -> JSONResponse:
    headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(exc.code, exc.message),
        headers=headers,
    )


async def _handle_validation_error(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    # FastAPI answers 422 by default; our contract says 400 for bad input.
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(part) for part in first.get("loc", []) if part != "body")
    detail = first.get("msg", "Invalid request")
    message = f"{field}: {detail}" if field else detail
    return JSONResponse(
        status_code=400, content=_error_body(ErrorCode.VALIDATION_ERROR, message)
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Attach the handlers so every error uses the same JSON shape."""
    app.add_exception_handler(AuthError, _handle_auth_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
