"""JSON-backed repository implementation for businesses."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from app.models.business import Business
from app.repositories.business import BusinessRepository
from app.repositories.json_store import JsonCollection


class JsonFileBusinessRepository(BusinessRepository):

    def __init__(self, data_file) -> None:
        self._collection = JsonCollection[Business](
            data_file,
            Business,
        )

    def get(
        self,
        business_id: uuid.UUID,
    ) -> Optional[Business]:

        with self._collection.lock:
            businesses = self._collection.read_all()

            for business in businesses:
                if (
                    business.id == business_id
                    and business.is_active
                    and business.deleted_at is None
                ):
                    return business

        return None


    def get_by_owner(
        self,
        user_id: uuid.UUID,
    ) -> Optional[Business]:

        with self._collection.lock:
            businesses = self._collection.read_all()

            for business in businesses:
                if (
                    business.owner_user_id == user_id
                    and business.is_active
                    and business.deleted_at is None
                ):
                    return business

        return None

    def add(
        self,
        business: Business,
    ) -> Business:

        with self._collection.lock:
            businesses = self._collection.read_all()

            businesses.append(business)

            self._collection.write_all(businesses)

        return business

    def update(
        self,
        business: Business,
    ) -> Business:

        with self._collection.lock:
            businesses = self._collection.read_all()

            for index, existing in enumerate(businesses):

                if existing.id == business.id:
                    businesses[index] = business

                    self._collection.write_all(businesses)

                    return business

        raise ValueError(
            f"Business not found: {business.id}"
        )

    def delete(
        self,
        business_id: uuid.UUID,
    ) -> bool:

        with self._collection.lock:
            businesses = self._collection.read_all()

            for index, business in enumerate(businesses):

                if (
                    business.id == business_id
                    and business.is_active
                    and business.deleted_at is None
                ):
                    now = datetime.now(timezone.utc)

                    business.deleted_at = now
                    business.updated_at = now

                    businesses[index] = business

                    self._collection.write_all(
                        businesses
                    )

                    return True

        return False