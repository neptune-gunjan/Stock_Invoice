
"""JSON-backed repository implementation for password reset tokens."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from app.models.password_reset import PasswordResetToken
from app.repositories.json_store import JsonCollection
from app.repositories.password_reset import (
    PasswordResetTokenRepository,
)


class JsonFilePasswordResetTokenRepository(
    PasswordResetTokenRepository
):

    def __init__(self, data_file) -> None:
        self._collection = JsonCollection[
            PasswordResetToken
        ](
            data_file,
            PasswordResetToken,
        )

    def get_by_token_hash(
        self,
        token_hash: str,
    ) -> Optional[PasswordResetToken]:

        with self._collection.lock:
            tokens = self._collection.read_all()

            for token in tokens:
                if (
                    token.token_hash == token_hash
                    and not token.is_used
                ):
                    return token

        return None

    def add(
        self,
        token: PasswordResetToken,
    ) -> PasswordResetToken:

        with self._collection.lock:
            tokens = self._collection.read_all()

            tokens.append(token)

            self._collection.write_all(tokens)

        return token

    def update(
        self,
        token: PasswordResetToken,
    ) -> PasswordResetToken:

        with self._collection.lock:
            tokens = self._collection.read_all()

            for index, existing in enumerate(tokens):
                if existing.id == token.id:
                    tokens[index] = token
                    self._collection.write_all(tokens)
                    return token

        raise ValueError(
            f"Password reset token not found: {token.id}"
        )

    def invalidate_for_user(
        self,
        user_id: uuid.UUID,
    ) -> None:

        with self._collection.lock:
            tokens = self._collection.read_all()

            now = datetime.now(timezone.utc)
            changed = False

            for index, token in enumerate(tokens):
                if (
                    token.user_id == user_id
                    and not token.is_used
                ):
                    token.used_at = now
                    tokens[index] = token
                    changed = True

            if changed:
                self._collection.write_all(tokens)

