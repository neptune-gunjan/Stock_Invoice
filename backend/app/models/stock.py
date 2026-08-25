"""Domain entity for the stock catalog. Storage-agnostic on purpose."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class StockItem(BaseModel):
    """
    A single catalog item a shop sells.

    This is the shape every StockRepository implementation stores and
    returns -- see docs/phase1-stock-catalog.md for the field spec.
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str
    aliases: list[str] = Field(default_factory=list)
    unit: str
    unit_price: float
    quantity_available: float
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    deleted_at: Optional[datetime] = None

    @property
    def is_active(self) -> bool:
        return self.deleted_at is None
