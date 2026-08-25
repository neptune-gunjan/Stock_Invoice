"""Phase 1 -- Stock Catalog API. See docs/phase1-stock-catalog.md."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_stock_service
from app.schemas.stock import StockCreate, StockRead, StockUpdate
from app.services.stock_service import StockNotFoundError, StockService

router = APIRouter(prefix="/stock", tags=["stock"])


@router.get("", response_model=list[StockRead])
def list_stock(service: StockService = Depends(get_stock_service)) -> list[StockRead]:
    return service.list_stock()


@router.post("", response_model=StockRead, status_code=status.HTTP_201_CREATED)
def create_stock(
    payload: StockCreate,
    service: StockService = Depends(get_stock_service),
) -> StockRead:
    return service.create_stock(payload)


@router.patch("/{item_id}", response_model=StockRead)
def update_stock(
    item_id: uuid.UUID,
    payload: StockUpdate,
    service: StockService = Depends(get_stock_service),
) -> StockRead:
    try:
        return service.update_stock(item_id, payload)
    except StockNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stock(
    item_id: uuid.UUID,
    service: StockService = Depends(get_stock_service),
) -> None:
    try:
        service.delete_stock(item_id)
    except StockNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
