"""Pydantic request/response DTOs for the /stock API. Kept separate from
the domain model (app/models/stock.py) so API contracts and storage shape
can change independently."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field, field_validator


class StockCreate(BaseModel):
    name: str = Field(min_length=1)
    sku: Optional[str] = None
    hsn_code: Optional[str] = None

    unit: str = Field(min_length=1)
    unit_price: float = Field(ge=0)
    quantity_available: float = Field(ge=0)

    low_stock_threshold: float = Field(default=0, ge=0)
    gst_rate: float = Field(default=0, ge=0)

    aliases: list[str] = Field(default_factory=list)

class StockUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    sku: Optional[str] = None
    hsn_code: Optional[str] = None

    unit: Optional[str] = Field(default=None, min_length=1)
    unit_price: Optional[float] = Field(default=None, ge=0)
    quantity_available: Optional[float] = Field(default=None, ge=0)

    low_stock_threshold: Optional[float] = Field(default=None, ge=0)
    gst_rate: Optional[float] = Field(default=None, ge=0)

    aliases: Optional[list[str]] = None
    
class StockRead(BaseModel):
    id: uuid.UUID
    name: str
    sku: Optional[str]
    hsn_code: Optional[str]
    aliases: list[str]

    unit: str
    unit_price: float
    quantity_available: float
    low_stock_threshold: float
    gst_rate: float

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class StockMovementRead(BaseModel):
    id: uuid.UUID
    stock_id: uuid.UUID
    movement_type: str
    quantity: float
    quantity_before: float
    quantity_after: float
    reference_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class StockMovementCreate(BaseModel):
    movement_type: Literal["purchase", "return", "damage"]
    quantity: float = Field(gt=0)

class BulkPurchaseItem(BaseModel):
    stock_id: uuid.UUID
    qty: float = Field(gt=0)
    unit_cost: Optional[float] = None

class BulkPurchaseRequest(BaseModel):
    supplier_name: Optional[str] = None
    items: list[BulkPurchaseItem]