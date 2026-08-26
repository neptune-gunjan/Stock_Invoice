from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class InvoiceRead(BaseModel):
    id: uuid.UUID

    invoice_number: str

    transaction_id: uuid.UUID
    customer_id: Optional[uuid.UUID]

    subtotal: float
    discount: float
    tax_rate: float
    tax_amount: float
    total_amount: float

    status: str
    payment_status: str
    payment_method: Optional[str]

    pdf_path: Optional[str]

    created_at: datetime

    model_config = {"from_attributes": True}

class InvoiceItemRead(BaseModel):
    id: uuid.UUID

    stock_id: uuid.UUID

    stock_name: str
    unit: str

    qty: float
    unit_price: float
    line_total: float

    model_config = {"from_attributes": True}

class InvoiceDetailRead(InvoiceRead):
    items: list[InvoiceItemRead] = []

    paid_amount: float = 0
    remaining_amount: float = 0