"""Business domain service."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.models.business import Business
from app.repositories.business import BusinessRepository
from app.schemas.business import BusinessCreate, BusinessUpdate


class BusinessService:
    def __init__(self, repository: BusinessRepository) -> None:
        self.repository = repository

    def get_business(self) -> Business | None:
        return self.repository.get_active()

    def create_business(self, data: BusinessCreate) -> Business:
        existing = self.repository.get_active()

        if existing is not None:
            raise ValueError("Business already exists.")

        now = datetime.now(timezone.utc)

        business = Business(
            id=uuid.uuid4(),
            business_name=data.business_name,
            owner_name=data.owner_name,
            phone=data.phone,
            email=data.email,
            address=data.address,
            gst_number=data.gst_number,
            invoice_prefix=data.invoice_prefix,
            logo_path=data.logo_path,
            is_active=True,
            created_at=now,
            updated_at=now,
            deleted_at=None,
        )

        return self.repository.add(business)

    def update_business(
        self,
        business_id: uuid.UUID,
        data: BusinessUpdate,
    ) -> Business:
        business = self.repository.get(business_id)

        if business is None or not business.is_active:
            raise ValueError("Business not found.")

        updates = data.model_dump(exclude_unset=True)

        for field, value in updates.items():
            setattr(business, field, value)

        business.updated_at = datetime.now(timezone.utc)

        return self.repository.update(business)

    def delete_business(self) -> bool:
        business = self.repository.get_active()

        if business is None:
            return False

        return self.repository.delete(business.id)