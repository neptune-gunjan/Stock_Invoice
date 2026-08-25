from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field
from app.models.payment import PaymentMethod


class PaymentCreate(BaseModel):
    amount: float = Field(gt=0)

    payment_method: PaymentMethod

    reference_number: Optional[str] = None


class PaymentRead(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID

    amount: float
    payment_method: PaymentMethod

    paid_at: datetime
    reference_number: Optional[str]

    model_config = {"from_attributes": True}