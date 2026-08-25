"""Domain entities for handwriting extraction (Phase 2) and matching
(Phase 3). Storage-agnostic on purpose -- see docs/phase2-extraction.md and
docs/phase3-matching.md for the field spec."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models.stock import utcnow

ExtractionJobStatus = Literal["pending", "success", "failed"]


class ExtractionJob(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    image_path: str
    raw_llm_output: Optional[str] = None
    status: ExtractionJobStatus = "pending"
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)


class ExtractedItem(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    extraction_job_id: uuid.UUID
    raw_text: str
    qty: Optional[float] = None
    unit: Optional[str] = None

    # Added by Phase 3 matching (app/services/matching_service.py). Left at
    # their defaults until /match runs against this job.
    matched_stock_id: Optional[uuid.UUID] = None
    confidence_score: Optional[float] = None
    needs_review: bool = True

    created_at: datetime = Field(default_factory=utcnow)
