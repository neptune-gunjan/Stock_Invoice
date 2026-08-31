"""Persistence contract for businesses."""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional

from app.models.business import Business


class BusinessRepository(ABC):

    @abstractmethod
    def get(
        self,
        business_id: uuid.UUID,
    ) -> Optional[Business]:
        """Return an active business by its id."""
        ...

    @abstractmethod
    def get_by_owner(
        self,
        user_id: uuid.UUID,
    ) -> Optional[Business]:
        """Return the active business owned by the given user."""
        ...

    @abstractmethod
    def add(
        self,
        business: Business,
    ) -> Business:
        """Persist a new business."""
        ...

    @abstractmethod
    def update(
        self,
        business: Business,
    ) -> Business:
        """Persist changes to an existing business."""
        ...

    @abstractmethod
    def delete(
        self,
        business_id: uuid.UUID,
    ) -> bool:
        """Soft-delete an active business."""
        ...