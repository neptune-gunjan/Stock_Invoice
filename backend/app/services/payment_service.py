from __future__ import annotations

import uuid

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

        invoice = self._invoice_repository.get(invoice_id, business_id)

        if invoice is None or invoice.deleted_at is not None:
            raise InvoiceNotFoundError(invoice_id)

        if invoice.status == "cancelled":
            raise InvalidPaymentError(
                "Cannot make payment for a cancelled invoice"
            )

        existing_payments = (
            self._payment_repository.list_by_invoice(invoice_id)
        )

        paid_amount = sum(
            payment.amount
            for payment in existing_payments
        )

        remaining_amount = invoice.total_amount - paid_amount

        if request.amount > remaining_amount:
            raise InvalidPaymentError(
                f"Payment exceeds remaining amount. "
                f"Remaining amount: {remaining_amount:.2f}"
            )

        payment = Payment(
            invoice_id=invoice_id,
            amount=request.amount,
            payment_method=request.payment_method,
            reference_number=request.reference_number,
        )

        self._payment_repository.add(payment)

        # Include the newly created payment
        all_payments = existing_payments + [payment]

        new_paid_amount = paid_amount + request.amount

        # Update payment status
        if new_paid_amount >= invoice.total_amount:
            invoice.payment_status = "paid"
        elif new_paid_amount > 0:
            invoice.payment_status = "partial"
        else:
            invoice.payment_status = "pending"

        # Update payment method
        payment_methods = {
            p.payment_method
            for p in all_payments
        }

        if len(payment_methods) == 1:
            invoice.payment_method = next(iter(payment_methods))
        else:
            invoice.payment_method = "multiple"

        self._invoice_repository.update(invoice, business_id)

        return payment

    def get(
        self,
        payment_id: uuid.UUID,
    ) -> Payment | None:
        return self._payment_repository.get(payment_id)

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