"""Business domain service."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.models.business import Business
from app.repositories.business import BusinessRepository
from app.repositories.user import UserRepository
from app.schemas.business import BusinessCreate, BusinessUpdate


class BusinessService:

    def __init__(
        self,
        repository: BusinessRepository,
        user_repository: UserRepository,
    ) -> None:
        self.repository = repository
        self.user_repository = user_repository

    def get_business(
        self,
        user_id: uuid.UUID,
    ) -> Business | None:

        return self.repository.get_by_owner(user_id)

    def create_business(
        self,
        data: BusinessCreate,
        user_id: uuid.UUID,
    ) -> Business:

        # Check whether this user already owns a business
        existing = self.repository.get_by_owner(user_id)

        if existing is not None:
            raise ValueError(
                "Business already exists for this user."
            )

        # Verify user exists
        user = self.user_repository.get(user_id)

        if user is None:
            raise ValueError(
                "User not found."
            )

        now = datetime.now(timezone.utc)

        # Create business
        business = Business(
            id=uuid.uuid4(),
            owner_user_id=user_id,

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

        # Save business
        created_business = self.repository.add(
            business
        )

        # Link business to user
        user.business_id = created_business.id
        user.updated_at = now

        self.user_repository.update(user)

        return created_business

    def update_business(
        self,
        business_id: uuid.UUID,
        data: BusinessUpdate,
        user_id: uuid.UUID,
    ) -> Business:

        business = self.repository.get(business_id)

        if (
            business is None
            or not business.is_active
            or business.owner_user_id != user_id
        ):
            raise ValueError(
                "Business not found."
            )

        updates = data.model_dump(
            exclude_unset=True
        )

        for field, value in updates.items():
            setattr(
                business,
                field,
                value,
            )

        business.updated_at = datetime.now(
            timezone.utc
        )

        return self.repository.update(
            business
        )

    def delete_business(
        self,
        user_id: uuid.UUID,
    ) -> bool:

        business = self.repository.get_by_owner(
            user_id
        )

        if business is None:
            return False

        deleted = self.repository.delete(
            business.id
        )

        if deleted:
            user = self.user_repository.get(
                user_id
            )

            if user is not None:
                user.business_id = None
                user.updated_at = datetime.now(
                    timezone.utc
                )

                self.user_repository.update(user)

        return deleted

