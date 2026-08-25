from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models.stock import utcnow


InvoiceStatus = Literal[
    "draft",
    "issued",
    "cancelled"
]

PaymentStatus = Literal[
    "pending",
    "partial",
    "paid"
]


class Invoice(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)

    invoice_number: str

    transaction_id: uuid.UUID
    customer_id: Optional[uuid.UUID] = None

    subtotal: float
    discount: float = 0
    tax_rate: float = 0
    tax_amount: float = 0
    total_amount: float

    status: InvoiceStatus = "issued"
    payment_status: PaymentStatus = "pending"
    payment_method: Optional[str] = None

    pdf_path: Optional[str] = None

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    deleted_at: Optional[datetime] = None