from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models.stock import utcnow


StockMovementType = Literal[
    "purchase",
    "sale",
    "adjustment",
    "return",
]


class StockMovement(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)

    stock_id: uuid.UUID

    movement_type: StockMovementType

    quantity: float

    quantity_before: float
    quantity_after: float

    reference_id: Optional[uuid.UUID] = None

    created_at: datetime = Field(default_factory=utcnow)