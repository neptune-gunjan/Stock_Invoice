"""Phase 4 -- confirm reviewed items into a real transaction. See
docs/phase4-review.md. This is the only route that decrements stock."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_transaction_service
from app.schemas.transaction import ConfirmRequest, TransactionRead
from app.services.customer_service import CustomerNotFoundError
from app.services.stock_service import StockNotFoundError
from app.services.transaction_service import InsufficientStockError, TransactionService

router = APIRouter(tags=["confirm"])


@router.post("/confirm", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def confirm_transaction(
    payload: ConfirmRequest,
    service: TransactionService = Depends(get_transaction_service),
) -> TransactionRead:
    try:
        transaction, items = service.confirm(payload)
    except (StockNotFoundError, CustomerNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except InsufficientStockError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return TransactionRead(**transaction.model_dump(), items=items)


@router.get("/transactions/{transaction_id}", response_model=TransactionRead)
def get_transaction(
    transaction_id: uuid.UUID,
    service: TransactionService = Depends(get_transaction_service),
) -> TransactionRead:
    result = service.get(transaction_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    transaction, items = result
    return TransactionRead(**transaction.model_dump(), items=items)
