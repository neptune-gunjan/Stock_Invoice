"""Phase 6 -- Customers & Transaction History API. See docs/phase6-history.md."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_customer_service, get_transaction_service
from app.schemas.customer import CustomerCreate, CustomerRead
from app.schemas.transaction import TransactionRead
from app.services.customer_service import CustomerNotFoundError, CustomerService
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerRead])
def list_customers(service: CustomerService = Depends(get_customer_service)) -> list[CustomerRead]:
    return service.list_customers()


@router.post("", response_model=CustomerRead, status_code=201)
def create_customer(
    payload: CustomerCreate,
    service: CustomerService = Depends(get_customer_service),
) -> CustomerRead:
    return service.create_customer(payload)


@router.get("/{customer_id}/transactions", response_model=list[TransactionRead])
def list_customer_transactions(
    customer_id: uuid.UUID,
    customer_service: CustomerService = Depends(get_customer_service),
    transaction_service: TransactionService = Depends(get_transaction_service),
) -> list[TransactionRead]:
    try:
        customer_service.require_active(customer_id)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    transactions = transaction_service.list_by_customer(customer_id)
    return [
        TransactionRead(**t.model_dump(), items=transaction_service.get(t.id)[1])
        for t in transactions
    ]
