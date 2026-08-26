from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class BusinessCreate(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=200)
    owner_name: Optional[str] = Field(default=None, max_length=100)

    phone: Optional[str] = Field(default=None, max_length=20)
    email: Optional[EmailStr] = None

    address: Optional[str] = Field(default=None, max_length=500)
    gst_number: Optional[str] = Field(default=None, max_length=15)

    invoice_prefix: str = Field(
        default="INV",
        min_length=1,
        max_length=10
    )

    logo_path: Optional[str] = None


class BusinessUpdate(BaseModel):
    business_name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=200
    )

    owner_name: Optional[str] = Field(
        default=None,
        max_length=100
    )

    phone: Optional[str] = Field(
        default=None,
        max_length=20
    )

    email: Optional[EmailStr] = None

    address: Optional[str] = Field(
        default=None,
        max_length=500
    )

    gst_number: Optional[str] = Field(
        default=None,
        max_length=15
    )

    invoice_prefix: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=10
    )

    logo_path: Optional[str] = None


class BusinessResponse(BaseModel):
    id: uuid.UUID

    business_name: str
    owner_name: Optional[str] = None

    phone: Optional[str] = None
    email: Optional[EmailStr] = None

    address: Optional[str] = None
    gst_number: Optional[str] = None

    invoice_prefix: str
    logo_path: Optional[str] = None

    is_active: bool = True

    created_at: datetime
    updated_at: datetime

    deleted_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True
    }