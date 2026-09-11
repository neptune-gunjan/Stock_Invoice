
"""Domain entity for password reset tokens."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PasswordResetToken(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)

    user_id: uuid.UUID

    # Store only the hash of the actual token.
    token_hash: str

    expires_at: datetime

    used_at: datetime | None = None

    created_at: datetime

    @property
    def is_used(self) -> bool:
        return self.used_at is not None

