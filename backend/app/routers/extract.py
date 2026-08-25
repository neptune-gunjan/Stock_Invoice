"""Phase 2 -- Handwriting Extraction API. See docs/phase2-extraction.md."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.dependencies import get_extraction_service, get_stock_service
from app.routers._enrich import enrich_items
from app.schemas.extraction import ExtractionJobRead
from app.services.extraction_service import ExtractionFailedError, ExtractionService
from app.services.stock_service import StockService

router = APIRouter(prefix="/extract", tags=["extraction"])


@router.post("", response_model=ExtractionJobRead, status_code=status.HTTP_201_CREATED)
async def extract_image(
    file: UploadFile = File(...),
    service: ExtractionService = Depends(get_extraction_service),
    stock_service: StockService = Depends(get_stock_service),
) -> ExtractionJobRead:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        job = service.run_extraction(image_bytes, file.content_type, file.filename or "upload")
    except ExtractionFailedError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Extraction failed (job {exc.job_id}): {exc}",
        ) from exc

    items = service.get_job(job.id)[1]
    return ExtractionJobRead(**job.model_dump(), items=enrich_items(items, stock_service.list_stock()))


@router.get("/{job_id}", response_model=ExtractionJobRead)
def get_extraction_job(
    job_id: uuid.UUID,
    service: ExtractionService = Depends(get_extraction_service),
    stock_service: StockService = Depends(get_stock_service),
) -> ExtractionJobRead:
    result = service.get_job(job_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Extraction job not found")
    job, items = result
    return ExtractionJobRead(**job.model_dump(), items=enrich_items(items, stock_service.list_stock()))
