"""Pydantic request/response DTOs for /customers."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1)
    phone: Optional[str] = None


class CustomerRead(BaseModel):
    id: uuid.UUID
    name: str
    phone: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
