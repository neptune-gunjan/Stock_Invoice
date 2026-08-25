"""Pydantic response DTOs for the /extract and /match APIs."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.extraction import ExtractionJobStatus


class ExtractedItemRead(BaseModel):
    id: uuid.UUID
    extraction_job_id: uuid.UUID
    raw_text: str
    qty: Optional[float]
    unit: Optional[str]
    matched_stock_id: Optional[uuid.UUID]
    matched_stock_name: Optional[str] = None
    confidence_score: Optional[float]
    needs_review: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ExtractionJobRead(BaseModel):
    id: uuid.UUID
    image_path: str
    status: ExtractionJobStatus
    error_message: Optional[str]
    created_at: datetime
    items: list[ExtractedItemRead] = []

    model_config = {"from_attributes": True}
