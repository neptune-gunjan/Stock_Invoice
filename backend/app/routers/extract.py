"""Phase 2 -- Handwriting Extraction API. See docs/phase2-extraction.md."""

from __future__ import annotations

import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)

from app.dependencies import (
    get_current_user,
    get_extraction_service,
    get_stock_service,
)
from app.models.user import User
from app.routers._enrich import enrich_items
from app.schemas.extraction import ExtractionJobRead
from app.services.extraction_service import (
    ExtractionFailedError,
    ExtractionService,
)
from app.services.stock_service import StockService


router = APIRouter(
    prefix="/extract",
    tags=["extraction"],
)


@router.post(
    "",
    response_model=ExtractionJobRead,
    status_code=status.HTTP_201_CREATED,
)
async def extract_image(
    file: UploadFile = File(...),
    service: ExtractionService = Depends(get_extraction_service),
    stock_service: StockService = Depends(get_stock_service),
    current_user: User = Depends(get_current_user),
) -> ExtractionJobRead:

    # User must belong to a business
    if current_user.business_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a business.",
        )

    # Validate uploaded file
    if (
        not file.content_type
        or not file.content_type.startswith("image/")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload an image file.",
        )

    # Read image
    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # Run extraction
    try:
        job = service.run_extraction(
            image_bytes,
            file.content_type,
            file.filename or "upload",
        )

    except ExtractionFailedError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Extraction failed (job {exc.job_id}): {exc}",
        ) from exc

    # Get extracted items
    result = service.get_job(job.id)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extraction job not found.",
        )

    job, items = result

    # Get stock for current business
    stock_items = stock_service.list_stock(
        business_id=current_user.business_id
    )

    # Enrich extracted items with stock information
    enriched_items = enrich_items(
        items,
        stock_items,
    )

    return ExtractionJobRead(
        **job.model_dump(),
        items=enriched_items,
    )


@router.get(
    "/{job_id}",
    response_model=ExtractionJobRead,
)
def get_extraction_job(
    job_id: uuid.UUID,
    service: ExtractionService = Depends(get_extraction_service),
    stock_service: StockService = Depends(get_stock_service),
    current_user: User = Depends(get_current_user),
) -> ExtractionJobRead:

    if current_user.business_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a business.",
        )

    result = service.get_job(job_id)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extraction job not found",
        )

    job, items = result

    # Get stock for current business
    stock_items = stock_service.list_stock(
        business_id=current_user.business_id
    )

    enriched_items = enrich_items(
        items,
        stock_items,
    )

    return ExtractionJobRead(
        **job.model_dump(),
        items=enriched_items,
    )

