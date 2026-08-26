"""Persistence contract for businesses."""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional

from app.models.business import Business


class BusinessRepository(ABC):
    @abstractmethod
    def get(self, business_id: uuid.UUID) -> Optional[Business]:
        ...

    @abstractmethod
    def get_active(self) -> Optional[Business]:
        ...

    @abstractmethod
    def add(self, business: Business) -> Business:
        ...

    @abstractmethod
    def update(self, business: Business) -> Business:
        ...

    @abstractmethod
    def delete(self, business_id: uuid.UUID) -> bool:
        ...