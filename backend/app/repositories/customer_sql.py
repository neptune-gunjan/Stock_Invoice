import uuid
from typing import Optional
from datetime import datetime, timezone
from app.repositories.customer import CustomerRepository
from app.models.customer import Customer
from app.models.sql import SqlCustomer
from app.db import SessionLocal

def utcnow():
    return datetime.now(timezone.utc)

class SqlAlchemyCustomerRepository(CustomerRepository):
    def _to_pydantic(self, row: SqlCustomer) -> Customer:
        return Customer(
            id=row.id,
            business_id=row.business_id,
            name=row.name,
            phone=row.phone,
            business_name=row.business_name,
            address=row.address,
            gst_number=row.gst_number,
            credit_limit=row.credit_limit,
            payment_terms_days=row.payment_terms_days,
            created_at=row.created_at,
            updated_at=row.updated_at,
            deleted_at=row.deleted_at
        )

    def _to_sql(self, customer: Customer) -> SqlCustomer:
        return SqlCustomer(
            id=customer.id,
            business_id=customer.business_id,
            name=customer.name,
            phone=customer.phone,
            business_name=customer.business_name,
            address=customer.address,
            gst_number=customer.gst_number,
            credit_limit=customer.credit_limit,
            payment_terms_days=customer.payment_terms_days,
            created_at=customer.created_at,
            updated_at=customer.updated_at,
            deleted_at=customer.deleted_at
        )

    def list_active(self, business_id: uuid.UUID) -> list[Customer]:
        with SessionLocal() as session:
            rows = session.query(SqlCustomer).filter(
                SqlCustomer.business_id == business_id,
                SqlCustomer.deleted_at.is_(None)
            ).all()
            return [self._to_pydantic(r) for r in rows]

    def get(self, customer_id: uuid.UUID) -> Optional[Customer]:
        with SessionLocal() as session:
            row = session.query(SqlCustomer).filter(SqlCustomer.id == customer_id).first()
            return self._to_pydantic(row) if row else None

    def add(self, customer: Customer) -> Customer:
        with SessionLocal() as session:
            row = self._to_sql(customer)
            session.add(row)
            session.commit()
            return customer

    def update(self, customer: Customer) -> Customer:
        with SessionLocal() as session:
            row = session.query(SqlCustomer).filter(SqlCustomer.id == customer.id).first()
            if row:
                row.name = customer.name
                row.phone = customer.phone
                row.business_name = customer.business_name
                row.address = customer.address
                row.gst_number = customer.gst_number
                row.credit_limit = customer.credit_limit
                row.payment_terms_days = customer.payment_terms_days
                row.updated_at = utcnow()
                row.deleted_at = customer.deleted_at
                session.commit()
            return customer

    def delete(self, customer_id: uuid.UUID) -> bool:
        with SessionLocal() as session:
            row = session.query(SqlCustomer).filter(SqlCustomer.id == customer_id).first()
            if row and row.deleted_at is None:
                row.deleted_at = utcnow()
                session.commit()
                return True
            return False

