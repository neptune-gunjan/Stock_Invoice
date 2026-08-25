"""Pydantic request/response DTOs for /confirm and /customers/{id}/transactions."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ConfirmItemInput(BaseModel):
    """One reviewed line item. `extracted_item_id` is optional so
    manually-added lines (the shopkeeper spotted something the model
    missed) are supported, per docs/phase4-review.md."""

    stock_id: uuid.UUID
    qty: float = Field(gt=0)
    extracted_item_id: Optional[uuid.UUID] = None


class ConfirmRequest(BaseModel):
    extraction_job_id: Optional[uuid.UUID] = None

    customer_id: Optional[uuid.UUID] = None

    items: list[ConfirmItemInput] = Field(min_length=1)

    discount: float = Field(default=0, ge=0)

    tax_rate: float = Field(default=0, ge=0)


class TransactionItemRead(BaseModel):
    id: uuid.UUID
    stock_id: uuid.UUID
    stock_name: str
    unit: str
    qty: float
    unit_price: float
    line_total: float

    model_config = {"from_attributes": True}


class TransactionRead(BaseModel):
    id: uuid.UUID
    customer_id: Optional[uuid.UUID]

    status: str

    subtotal: float
    discount: float
    tax: float
    total_amount: float

    created_at: datetime

    items: list[TransactionItemRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}
