import uuid
from typing import Optional
from datetime import datetime, timezone
from app.repositories.payment import PaymentRepository
from app.models.payment import Payment
from app.models.sql import SqlPayment
from app.db import SessionLocal

def utcnow():
    return datetime.now(timezone.utc)

class SqlAlchemyPaymentRepository(PaymentRepository):
    def _to_pydantic(self, row: SqlPayment) -> Payment:
        return Payment(
            id=row.id,
            invoice_id=row.invoice_id,
            amount=row.amount,
            payment_method=row.payment_method,
            paid_at=row.paid_at,
            reference_number=row.reference_number
        )

    def add(self, payment: Payment) -> Payment:
        with SessionLocal() as session:
            row = SqlPayment(
                id=payment.id,
                invoice_id=payment.invoice_id,
                amount=payment.amount,
                payment_method=payment.payment_method,
                paid_at=payment.paid_at,
                reference_number=payment.reference_number
            )
            session.add(row)
            session.commit()
            return payment

    def get(self, payment_id: uuid.UUID) -> Optional[Payment]:
        with SessionLocal() as session:
            row = session.query(SqlPayment).filter(SqlPayment.id == payment_id).first()
            return self._to_pydantic(row) if row else None

    def list_by_invoice(self, invoice_id: uuid.UUID) -> list[Payment]:
        with SessionLocal() as session:
            rows = session.query(SqlPayment).filter(SqlPayment.invoice_id == invoice_id).all()
            return [self._to_pydantic(r) for r in rows]

    def list_by_invoices(self, invoice_ids: list[uuid.UUID]) -> list[Payment]:
        if not invoice_ids:
            return []
        with SessionLocal() as session:
            rows = session.query(SqlPayment).filter(SqlPayment.invoice_id.in_(invoice_ids)).all()
            return [self._to_pydantic(r) for r in rows]

    def create_payment_atomic(self, payment: Payment, business_id: uuid.UUID) -> Payment:
        from app.models.sql import SqlInvoice
        with SessionLocal() as session:
            invoice_row = session.query(SqlInvoice).filter(
                SqlInvoice.id == payment.invoice_id,
                SqlInvoice.business_id == business_id
            ).with_for_update().first()
            
            if not invoice_row:
                raise ValueError("Invoice not found")
                
            if invoice_row.status == "cancelled":
                raise ValueError("Cannot make payment for a cancelled invoice")
                
            existing_payments = session.query(SqlPayment).filter(SqlPayment.invoice_id == payment.invoice_id).all()
            paid_amount = sum(p.amount for p in existing_payments)
            
            remaining = invoice_row.total_amount - paid_amount
            if payment.amount > remaining:
                raise ValueError(f"Payment exceeds remaining amount. Remaining amount: {remaining:.2f}")
                
            payment_row = SqlPayment(
                id=payment.id,
                invoice_id=payment.invoice_id,
                amount=payment.amount,
                payment_method=payment.payment_method,
                paid_at=payment.paid_at,
                reference_number=payment.reference_number
            )
            session.add(payment_row)
            
            new_paid_amount = paid_amount + payment.amount
            if new_paid_amount >= invoice_row.total_amount:
                invoice_row.payment_status = "paid"
            elif new_paid_amount > 0:
                invoice_row.payment_status = "partial"
            else:
                invoice_row.payment_status = "pending"
                
            methods = {p.payment_method for p in existing_payments}
            methods.add(payment.payment_method)
            
            if len(methods) == 1:
                invoice_row.payment_method = next(iter(methods))
            else:
                invoice_row.payment_method = "multiple"
                
            invoice_row.updated_at = utcnow()
            
            session.commit()
            return payment
