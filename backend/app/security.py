"""
Authentication and security utilities.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.config import get_settings


# Pre-computed bcrypt hash used as a timing-safe sentinel in the login handler.
# When a login attempt uses an e-mail that does not exist in the database we
# still run bcrypt.checkpw against this hash so that the response time is
# indistinguishable from a real wrong-password attempt, preventing user
# enumeration via timing side-channels.
DUMMY_PASSWORD_HASH: str = (
    "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"
)


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")

    if len(password_bytes) > 72:
        raise ValueError(
            "Password cannot be longer than 72 bytes."
        )

    salt = bcrypt.gensalt()

    return bcrypt.hashpw(
        password_bytes,
        salt,
    ).decode("utf-8")


def verify_password(
    plain_password: str,
    password_hash: str,
) -> bool:
    password_bytes = plain_password.encode("utf-8")

    if len(password_bytes) > 72:
        return False

    return bcrypt.checkpw(
        password_bytes,
        password_hash.encode("utf-8"),
    )


def create_access_token(
    user_id: uuid.UUID,
) -> str:
    settings = get_settings()

    now = datetime.now(timezone.utc)

    expire = now + timedelta(
        minutes=settings.access_token_expire_minutes
    )

    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> uuid.UUID:
    settings = get_settings()

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )

        subject = payload.get("sub")

        if not subject:
            raise ValueError("Missing subject")

        return uuid.UUID(subject)

    except (JWTError, ValueError) as exc:
        raise ValueError(
            "Invalid or expired access token"
        ) from exc