"""Pydantic request/response DTOs for the /stock API. Kept separate from
the domain model (app/models/stock.py) so API contracts and storage shape
can change independently."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class StockCreate(BaseModel):
    name: str = Field(min_length=1)
    unit: str = Field(min_length=1)
    unit_price: float = Field(ge=0)
    quantity_available: float = Field(ge=0)
    aliases: list[str] = Field(default_factory=list)

    @field_validator("name", "unit")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class StockUpdate(BaseModel):
    """PATCH payload. Every field is optional; only fields explicitly
    provided by the caller are applied (see model_dump(exclude_unset=True)
    in StockService.update_stock)."""

    name: Optional[str] = Field(default=None, min_length=1)
    unit: Optional[str] = Field(default=None, min_length=1)
    unit_price: Optional[float] = Field(default=None, ge=0)
    quantity_available: Optional[float] = Field(default=None, ge=0)
    aliases: Optional[list[str]] = None


class StockRead(BaseModel):
    id: uuid.UUID
    name: str
    aliases: list[str]
    unit: str
    unit_price: float
    quantity_available: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
