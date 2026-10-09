import uuid
from typing import Optional
from datetime import datetime, timezone
from app.repositories.invoice import InvoiceRepository
from app.models.invoice import Invoice
from app.models.sql import SqlInvoice
from app.db import SessionLocal

def utcnow():
    return datetime.now(timezone.utc)

class SqlAlchemyInvoiceRepository(InvoiceRepository):
    def _to_pydantic(self, row: SqlInvoice) -> Invoice:
        return Invoice(
            id=row.id,
            business_id=row.business_id,
            invoice_number=row.invoice_number,
            transaction_id=row.transaction_id,
            customer_id=row.customer_id,
            subtotal=row.subtotal,
            discount=row.discount,
            tax_rate=row.tax_rate,
            tax_amount=row.tax_amount,
            total_amount=row.total_amount,
            status=row.status,
            payment_status=row.payment_status,
            payment_method=row.payment_method,
            pdf_path=row.pdf_path,
            created_at=row.created_at,
            updated_at=row.updated_at,
            deleted_at=row.deleted_at
        )

    def add(self, invoice: Invoice) -> Invoice:
        with SessionLocal() as session:
            sql_inv = SqlInvoice(
                id=invoice.id,
                business_id=invoice.business_id,
                invoice_number=invoice.invoice_number,
                transaction_id=invoice.transaction_id,
                customer_id=invoice.customer_id,
                subtotal=invoice.subtotal,
                discount=invoice.discount,
                tax_rate=invoice.tax_rate,
                tax_amount=invoice.tax_amount,
                total_amount=invoice.total_amount,
                status=invoice.status,
                payment_status=invoice.payment_status,
                payment_method=invoice.payment_method,
                pdf_path=invoice.pdf_path,
                created_at=invoice.created_at,
                updated_at=invoice.updated_at,
                deleted_at=invoice.deleted_at
            )
            session.add(sql_inv)
            session.commit()
            return invoice

    def get(self, invoice_id: uuid.UUID, business_id: uuid.UUID) -> Optional[Invoice]:
        with SessionLocal() as session:
            row = session.query(SqlInvoice).filter(
                SqlInvoice.id == invoice_id,
                SqlInvoice.business_id == business_id
            ).first()
            return self._to_pydantic(row) if row else None

    def get_by_number(self, invoice_number: str, business_id: uuid.UUID) -> Optional[Invoice]:
        with SessionLocal() as session:
            row = session.query(SqlInvoice).filter(
                SqlInvoice.invoice_number == invoice_number,
                SqlInvoice.business_id == business_id
            ).first()
            return self._to_pydantic(row) if row else None

    def get_by_transaction(self, transaction_id: uuid.UUID, business_id: uuid.UUID) -> Optional[Invoice]:
        with SessionLocal() as session:
            row = session.query(SqlInvoice).filter(
                SqlInvoice.transaction_id == transaction_id,
                SqlInvoice.business_id == business_id
            ).first()
            return self._to_pydantic(row) if row else None

    def list_all(self, business_id: uuid.UUID) -> list[Invoice]:
        with SessionLocal() as session:
            rows = session.query(SqlInvoice).filter(
                SqlInvoice.business_id == business_id,
                SqlInvoice.deleted_at.is_(None)
            ).all()
            return [self._to_pydantic(r) for r in rows]

    def update(self, invoice: Invoice, business_id: uuid.UUID) -> Invoice:
        with SessionLocal() as session:
            row = session.query(SqlInvoice).filter(
                SqlInvoice.id == invoice.id,
                SqlInvoice.business_id == business_id
            ).first()
            if row:
                row.invoice_number = invoice.invoice_number
                row.transaction_id = invoice.transaction_id
                row.customer_id = invoice.customer_id
                row.subtotal = invoice.subtotal
                row.discount = invoice.discount
                row.tax_rate = invoice.tax_rate
                row.tax_amount = invoice.tax_amount
                row.total_amount = invoice.total_amount
                row.status = invoice.status
                row.payment_status = invoice.payment_status
                row.payment_method = invoice.payment_method
                row.pdf_path = invoice.pdf_path
                row.updated_at = utcnow()
                row.deleted_at = invoice.deleted_at
                session.commit()
            return invoice
