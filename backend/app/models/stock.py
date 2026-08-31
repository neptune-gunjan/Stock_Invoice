"""Domain entity for the stock catalog."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class StockItem(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)

    # Owner / tenant
    business_id: uuid.UUID

    name: str
    sku: Optional[str] = None

    aliases: list[str] = Field(default_factory=list)

    unit: str
    unit_price: float
    quantity_available: float

    low_stock_threshold: float = 0

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    deleted_at: Optional[datetime] = None

    @property
    def is_active(self) -> bool:
        return self.deleted_at is None

    @property
    def is_low_stock(self) -> bool:
        return self.quantity_available <= self.low_stock_threshold