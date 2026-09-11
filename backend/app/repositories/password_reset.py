
"""Persistence contract for password reset tokens."""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional

from app.models.password_reset import PasswordResetToken


class PasswordResetTokenRepository(ABC):

    @abstractmethod
    def get_by_token_hash(
        self,
        token_hash: str,
    ) -> Optional[PasswordResetToken]:
        ...

    @abstractmethod
    def add(
        self,
        token: PasswordResetToken,
    ) -> PasswordResetToken:
        ...

    @abstractmethod
    def update(
        self,
        token: PasswordResetToken,
    ) -> PasswordResetToken:
        ...

    @abstractmethod
    def invalidate_for_user(
        self,
        user_id: uuid.UUID,
    ) -> None:
        ...

