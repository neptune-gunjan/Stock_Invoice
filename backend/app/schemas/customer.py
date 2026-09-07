"""Pydantic request/response DTOs for /customers."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1)
    phone: Optional[str] = None
    business_name: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(
        default=None,
        min_length=1,
    )
    phone: Optional[str] = None
    business_name: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None


class CustomerRead(BaseModel):
    id: uuid.UUID
    name: str
    phone: Optional[str]
    business_name: Optional[str]
    address: Optional[str]
    gst_number: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CustomerSummaryRead(BaseModel):
    customer_id: uuid.UUID
    customer_name: str
    phone: Optional[str]

    total_invoices: int
    total_purchase: float
    total_paid: float
    total_due: float

    last_purchase_at: Optional[datetime]
    customer_since: datetime

    model_config = {"from_attributes": True}