"""Phase 1 -- Stock Catalog API."""

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

from app.dependencies import get_current_user, get_stock_service
from app.models.user import User
from app.schemas.stock import StockCreate, StockRead, StockUpdate
from app.services.stock_service import StockNotFoundError, StockService
from app.schemas.stock_import import StockImportResult


router = APIRouter(
    prefix="/stock",
    tags=["stock"],
)


@router.get(
    "",
    response_model=list[StockRead],
)
def list_stock(
    service: StockService = Depends(get_stock_service),
    current_user: User = Depends(get_current_user),
) -> list[StockRead]:

    return service.list_stock(
        business_id=current_user.business_id
    )


@router.post(
    "",
    response_model=StockRead,
    status_code=status.HTTP_201_CREATED,
)
def create_stock(
    payload: StockCreate,
    service: StockService = Depends(get_stock_service),
    current_user: User = Depends(get_current_user),
) -> StockRead:

    return service.create_stock(
        payload,
        business_id=current_user.business_id,
    )


@router.post(
    "/import",
)

async def import_stock(
    file: UploadFile = File(...),
    service: StockService = Depends(
        get_stock_service
    ),
    current_user: User = Depends(
        get_current_user
    ),
):
    if current_user.business_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a business.",
        )

    filename = (
        file.filename or ""
    ).lower()

    if not filename.endswith(
        (".csv", ".xlsx")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and XLSX files are supported.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    try:
        if filename.endswith(".xlsx"):
            return service.import_xlsx(
                content,
                business_id=current_user.business_id,
            )

        return service.import_csv(
            content,
            business_id=current_user.business_id,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.patch(
    "/{item_id}",
    response_model=StockRead,
)
def update_stock(
    item_id: uuid.UUID,
    payload: StockUpdate,
    service: StockService = Depends(get_stock_service),
    current_user: User = Depends(get_current_user),
) -> StockRead:

    try:
        return service.update_stock(
            item_id,
            payload,
            business_id=current_user.business_id,
        )

    except StockNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_stock(
    item_id: uuid.UUID,
    service: StockService = Depends(get_stock_service),
    current_user: User = Depends(get_current_user),
) -> None:

    try:
        service.delete_stock(
            item_id,
            business_id=current_user.business_id,
        )

    except StockNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

