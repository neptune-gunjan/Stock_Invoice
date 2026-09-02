from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import (
    get_current_user,
    get_payment_service,
)
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentRead
from app.services.payment_service import (
    InvoiceNotFoundError,
    InvalidPaymentError,
    PaymentService,
)


router = APIRouter(
    prefix="/invoices",
    tags=["payments"],
)


@router.post(
    "/{invoice_id}/payments",
    response_model=PaymentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_payment(
    invoice_id: uuid.UUID,
    payload: PaymentCreate,
    service: PaymentService = Depends(get_payment_service),
    current_user: User = Depends(get_current_user),
) -> PaymentRead:

    try:
        payment = service.create_payment(
            invoice_id,
            payload,
            current_user.business_id,
        )

    except InvoiceNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except InvalidPaymentError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return PaymentRead.model_validate(payment)


@router.get(
    "/{invoice_id}/payments",
    response_model=list[PaymentRead],
)
def list_payments(
    invoice_id: uuid.UUID,
    service: PaymentService = Depends(get_payment_service),
    current_user: User = Depends(get_current_user),
) -> list[PaymentRead]:

    try:
        payments = service.list_by_invoice(
            invoice_id,
            current_user.business_id,
        )

    except InvoiceNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    return [
        PaymentRead.model_validate(payment)
        for payment in payments
    ]


@router.get(
    "/payments/{payment_id}",
    response_model=PaymentRead,
)
def get_payment(
    payment_id: uuid.UUID,
    service: PaymentService = Depends(get_payment_service),
    current_user: User = Depends(get_current_user),
) -> PaymentRead:

    payment = service.get(payment_id, current_user.business_id)

    if payment is None:
        raise HTTPException(
            status_code=404,
            detail="Payment not found",
        )

    return PaymentRead.model_validate(payment)