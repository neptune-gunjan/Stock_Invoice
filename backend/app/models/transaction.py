"""Domain entities for confirmed transactions (Phase 4) and customer
linking (Phase 6). See docs/phase4-review.md and docs/phase6-history.md."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.stock import utcnow
from typing import Literal


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


TransactionStatus = Literal[
    "confirmed",
    "cancelled"
]

class Transaction(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)

    # Owner / tenant
    business_id: uuid.UUID

    customer_id: Optional[uuid.UUID] = None

    status: TransactionStatus = "confirmed"

    subtotal: float
    discount: float = 0
    tax: float = 0
    total_amount: float

    created_at: datetime = Field(default_factory=utcnow)
    deleted_at: Optional[datetime] = None
