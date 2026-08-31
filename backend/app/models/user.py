"""Domain entity for authenticated application users."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.stock import utcnow


class User(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)

    # Business/Shop owned by this user
    business_id: Optional[uuid.UUID] = None

    name: str
    email: str
    password_hash: str

    is_active: bool = True

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    deleted_at: Optional[datetime] = None

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None