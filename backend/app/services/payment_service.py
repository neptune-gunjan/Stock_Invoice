from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.models.payment import Payment
from app.repositories.payment import PaymentRepository
from app.repositories.invoice import InvoiceRepository
from app.schemas.payment import PaymentCreate


class InvoiceNotFoundError(Exception):
    def __init__(self, invoice_id: uuid.UUID) -> None:
        self.invoice_id = invoice_id
        super().__init__(
            f"Invoice not found: {invoice_id}"
        )


class InvalidPaymentError(Exception):
    pass


class PaymentService:

    def __init__(
        self,
        payment_repository: PaymentRepository,
        invoice_repository: InvoiceRepository,
    ) -> None:
        self._payment_repository = payment_repository
        self._invoice_repository = invoice_repository

    def create_payment(
        self,
        invoice_id: uuid.UUID,
        request: PaymentCreate,
        business_id: uuid.UUID,
    ) -> Payment:

        payment = Payment(
            invoice_id=invoice_id,
            amount=request.amount,
            payment_method=request.payment_method,
            reference_number=request.reference_number,
        )

        try:
            return self._payment_repository.create_payment_atomic(payment, business_id)
        except ValueError as exc:
            msg = str(exc)
            if "Invoice not found" in msg:
                raise InvoiceNotFoundError(invoice_id)
            raise InvalidPaymentError(msg)

    def get(
        self,
        payment_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> Payment | None:

        payment = self._payment_repository.get(payment_id)

        if payment is None:
            return None

        invoice = self._invoice_repository.get(
            payment.invoice_id,
            business_id,
        )

        if invoice is None:
            return None

        return payment

    def list_by_invoice(
        self,
        invoice_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> list[Payment]:

        invoice = self._invoice_repository.get(invoice_id, business_id)

        if invoice is None or invoice.deleted_at is not None:
            raise InvoiceNotFoundError(invoice_id)

        return self._payment_repository.list_by_invoice(
            invoice_id
        )