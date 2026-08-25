"""Phase 3 -- Deterministic Matching API. See docs/phase3-matching.md."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_extraction_service, get_matching_service, get_stock_service
from app.routers._enrich import enrich_items
from app.schemas.extraction import ExtractedItemRead
from app.services.extraction_service import ExtractionService
from app.services.matching_service import MatchingService
from app.services.stock_service import StockService

router = APIRouter(prefix="/match", tags=["matching"])


@router.post("/{job_id}", response_model=list[ExtractedItemRead])
def match_job(
    job_id: uuid.UUID,
    matching_service: MatchingService = Depends(get_matching_service),
    extraction_service: ExtractionService = Depends(get_extraction_service),
    stock_service: StockService = Depends(get_stock_service),
) -> list[ExtractedItemRead]:
    if extraction_service.get_job(job_id) is None:
        raise HTTPException(status_code=404, detail="Extraction job not found")

    matched_items = matching_service.match_job(job_id)
    return enrich_items(matched_items, stock_service.list_stock())
