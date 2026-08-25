"""Domain entities for confirmed transactions (Phase 4) and customer
linking (Phase 6). See docs/phase4-review.md and docs/phase6-history.md."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.stock import utcnow


class TransactionItem(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    transaction_id: uuid.UUID
    stock_id: uuid.UUID
    # Name/unit are snapshotted at confirm time so history and invoices stay
    # correct even if the stock item is later renamed or soft-deleted.
    stock_name: str
    unit: str
    qty: float
    unit_price: float
    line_total: float


class Transaction(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    customer_id: Optional[uuid.UUID] = None
    status: str = "confirmed"
    total_amount: float
    created_at: datetime = Field(default_factory=utcnow)
    deleted_at: Optional[datetime] = None
