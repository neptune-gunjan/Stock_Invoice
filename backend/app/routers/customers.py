"""Customers & Transaction History API."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import (
    get_current_user,
    get_customer_service,
    get_invoice_service,
    get_transaction_service,
)
from app.models.user import User
from app.schemas.customer import (CustomerCreate, CustomerRead, CustomerSummaryRead,)
from app.schemas.transaction import TransactionRead
from app.services.customer_service import (
    CustomerNotFoundError,
    CustomerService,
)
from app.services.invoice_service import InvoiceService
from app.services.transaction_service import TransactionService


router = APIRouter(
    prefix="/customers",
    tags=["customers"],
)


# ============================================================
# Customers
# ============================================================

@router.get(
    "",
    response_model=list[CustomerRead],
)
def list_customers(
    service: CustomerService = Depends(
        get_customer_service
    ),
    current_user: User = Depends(
        get_current_user
    ),
) -> list[CustomerRead]:

    if current_user.business_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a business.",
        )

    return service.list_customers(
        business_id=current_user.business_id
    )


@router.post(
    "",
    response_model=CustomerRead,
    status_code=status.HTTP_201_CREATED,
)
def create_customer(
    payload: CustomerCreate,
    service: CustomerService = Depends(
        get_customer_service
    ),
    current_user: User = Depends(
        get_current_user
    ),
) -> CustomerRead:

    if current_user.business_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a business.",
        )

    return service.create_customer(
        payload,
        business_id=current_user.business_id,
    )


# ============================================================
# Customer Transaction History
# ============================================================

@router.get(
    "/{customer_id}/transactions",
    response_model=list[TransactionRead],
)
def list_customer_transactions(
    customer_id: uuid.UUID,
    customer_service: CustomerService = Depends(
        get_customer_service
    ),
    transaction_service: TransactionService = Depends(
        get_transaction_service
    ),
    invoice_service: InvoiceService = Depends(
        get_invoice_service
    ),
    current_user: User = Depends(
        get_current_user
    ),
) -> list[TransactionRead]:

    if current_user.business_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a business.",
        )

    try:
        customer_service.require_active(
            customer_id,
            business_id=current_user.business_id,
        )

    except CustomerNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    transactions = transaction_service.list_by_customer(
        customer_id,
        business_id=current_user.business_id,
    )

    result: list[TransactionRead] = []

    for transaction in transactions:

        transaction_result = transaction_service.get(
            transaction.id,
            business_id=current_user.business_id,
        )

        if transaction_result is None:
            continue

        transaction, items = transaction_result

        invoice = invoice_service.get_by_transaction(
            transaction.id,
            business_id=current_user.business_id,
        )

        # Transaction without invoice should not be
        # returned because invoice fields are mandatory
        # in TransactionRead.
        if invoice is None:
            continue

        payment_summary = invoice_service.get_payment_summary(
            invoice.id,
            business_id=current_user.business_id,
        )

        if payment_summary is None:
            continue

        paid_amount, remaining_amount, payment_status = payment_summary

        result.append(
            TransactionRead(
                **transaction.model_dump(),
                invoice_id=invoice.id,
                invoice_number=invoice.invoice_number,
                paid_amount=paid_amount,
                remaining_amount=remaining_amount,
                payment_status=payment_status,
                items=items,
            )
        )

    return result


# ============================================================
# Customer Summary
# ============================================================

@router.get(
    "/{customer_id}/summary",
    response_model=CustomerSummaryRead,
)
def get_customer_summary(
    customer_id: uuid.UUID,
    customer_service: CustomerService = Depends(
        get_customer_service
    ),
    transaction_service: TransactionService = Depends(
        get_transaction_service
    ),
    invoice_service: InvoiceService = Depends(
        get_invoice_service
    ),
    current_user: User = Depends(
        get_current_user
    ),
) -> CustomerSummaryRead:

    if current_user.business_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a business.",
        )

    try:
        customer = customer_service.require_active(
            customer_id,
            business_id=current_user.business_id,
        )

    except CustomerNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    transactions = transaction_service.list_by_customer(
        customer_id,
        business_id=current_user.business_id,
    )

    total_invoices = 0
    total_purchase = 0.0
    total_paid = 0.0
    total_due = 0.0
    last_purchase_at = None

    for transaction in transactions:

        invoice = invoice_service.get_by_transaction(
            transaction.id,
            business_id=current_user.business_id,
        )

        if invoice is None:
            continue

        if invoice.deleted_at is not None:
            continue

        total_invoices += 1
        total_purchase += invoice.total_amount

        payment_summary = invoice_service.get_payment_summary(
            invoice.id,
            business_id=current_user.business_id,
        )

        if payment_summary is not None:
            paid_amount, remaining_amount, _ = payment_summary

            total_paid += paid_amount
            total_due += remaining_amount

        if (
            last_purchase_at is None
            or transaction.created_at > last_purchase_at
        ):
            last_purchase_at = transaction.created_at

    return CustomerSummaryRead(
        customer_id=customer.id,
        customer_name=customer.name,
        phone=customer.phone,
        total_invoices=total_invoices,
        total_purchase=total_purchase,
        total_paid=total_paid,
        total_due=total_due,
        last_purchase_at=last_purchase_at,
        customer_since=customer.created_at,
    )