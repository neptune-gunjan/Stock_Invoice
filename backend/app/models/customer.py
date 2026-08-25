"""Domain entity for customers (Phase 6). See docs/phase6-history.md."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.stock import utcnow


class Customer(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    deleted_at: Optional[datetime] = None

    @property
    def is_active(self) -> bool:
        return self.deleted_at is None
