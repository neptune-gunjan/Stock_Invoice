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
    sku: Optional[str] = None

    unit: str = Field(min_length=1)
    unit_price: float = Field(ge=0)
    quantity_available: float = Field(ge=0)

    low_stock_threshold: float = Field(default=0, ge=0)

    aliases: list[str] = Field(default_factory=list)

class StockUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    sku: Optional[str] = None

    unit: Optional[str] = Field(default=None, min_length=1)
    unit_price: Optional[float] = Field(default=None, ge=0)
    quantity_available: Optional[float] = Field(default=None, ge=0)

    low_stock_threshold: Optional[float] = Field(default=None, ge=0)

    aliases: Optional[list[str]] = None
    
class StockRead(BaseModel):
    id: uuid.UUID
    name: str
    sku: Optional[str]
    aliases: list[str]

    unit: str
    unit_price: float
    quantity_available: float
    low_stock_threshold: float

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}