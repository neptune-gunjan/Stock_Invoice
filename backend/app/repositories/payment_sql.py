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
