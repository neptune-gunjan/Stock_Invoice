import uuid
from typing import Optional
from datetime import datetime, timezone
from app.repositories.business import BusinessRepository
from app.models.business import Business
from app.models.sql import SqlBusiness
from app.db import SessionLocal

def utcnow():
    return datetime.now(timezone.utc)

class SqlAlchemyBusinessRepository(BusinessRepository):
    def _to_pydantic(self, row: SqlBusiness) -> Business:
        return Business(
            id=row.id,
            owner_user_id=row.owner_user_id,
            business_name=row.business_name,
            owner_name=row.owner_name,
            phone=row.phone,
            email=row.email,
            address=row.address,
            gst_number=row.gst_number,
            upi_vpa=row.upi_vpa,
            invoice_prefix=row.invoice_prefix,
            logo_path=row.logo_path,
            is_active=row.is_active,
            created_at=row.created_at,
            updated_at=row.updated_at,
            deleted_at=row.deleted_at
        )

    def _to_sql(self, business: Business) -> SqlBusiness:
        return SqlBusiness(
            id=business.id,
            owner_user_id=business.owner_user_id,
            business_name=business.business_name,
            owner_name=business.owner_name,
            phone=business.phone,
            email=business.email,
            address=business.address,
            gst_number=business.gst_number,
            upi_vpa=business.upi_vpa,
            invoice_prefix=business.invoice_prefix,
            logo_path=business.logo_path,
            is_active=business.is_active,
            created_at=business.created_at,
            updated_at=business.updated_at,
            deleted_at=business.deleted_at
        )

    def get(self, business_id: uuid.UUID) -> Optional[Business]:
        with SessionLocal() as session:
            row = session.query(SqlBusiness).filter(SqlBusiness.id == business_id).first()
            return self._to_pydantic(row) if row else None

    def get_by_owner(self, user_id: uuid.UUID) -> Optional[Business]:
        with SessionLocal() as session:
            row = session.query(SqlBusiness).filter(
                SqlBusiness.owner_user_id == user_id,
                SqlBusiness.deleted_at.is_(None)
            ).first()
            return self._to_pydantic(row) if row else None

    def add(self, business: Business) -> Business:
        with SessionLocal() as session:
            row = self._to_sql(business)
            session.add(row)
            session.commit()
            return business

    def update(self, business: Business) -> Business:
        with SessionLocal() as session:
            row = session.query(SqlBusiness).filter(SqlBusiness.id == business.id).first()
            if row:
                row.business_name = business.business_name
                row.owner_name = business.owner_name
                row.phone = business.phone
                row.email = business.email
                row.address = business.address
                row.gst_number = business.gst_number
                row.upi_vpa = business.upi_vpa
                row.invoice_prefix = business.invoice_prefix
                row.logo_path = business.logo_path
                row.is_active = business.is_active
                row.updated_at = utcnow()
                row.deleted_at = business.deleted_at
                session.commit()
            return business

    def delete(self, business_id: uuid.UUID) -> bool:
        with SessionLocal() as session:
            row = session.query(SqlBusiness).filter(SqlBusiness.id == business_id).first()
            if row and row.deleted_at is None:
                row.deleted_at = utcnow()
                session.commit()
                return True
            return False
