"""Domain entity for business/shop profile."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.stock import utcnow


class Business(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)

    business_name: str
    owner_name: Optional[str] = None

    phone: Optional[str] = None
    email: Optional[str] = None

    address: Optional[str] = None
    gst_number: Optional[str] = None

    invoice_prefix: str = "INV"

    logo_path: Optional[str] = None

    is_active: bool = True

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    deleted_at: Optional[datetime] = None

    @property
    def is_active(self) -> bool:
        return self.deleted_at is None