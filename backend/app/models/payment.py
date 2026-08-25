from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.stock import utcnow


PaymentMethod = Literal[
    "cash",
    "upi",
    "card",
    "bank_transfer",
    "credit"
]


class Payment(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)

    invoice_id: uuid.UUID

    amount: float = Field(gt=0)

    payment_method: PaymentMethod

    paid_at: datetime = Field(default_factory=utcnow)

    reference_number: str | None = None