"""
Persistence contract for the stock catalog.
"""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional

from app.models.stock import StockItem


class StockRepository(ABC):

    @abstractmethod
    def list_active(
        self,
        business_id: uuid.UUID,
    ) -> list[StockItem]:
        """Return active stock items belonging to a business."""
        ...

    @abstractmethod
    def get(
        self,
        item_id: uuid.UUID,
    ) -> Optional[StockItem]:
        """Return a stock item by id, including soft-deleted ones."""
        ...

    @abstractmethod
    def add(
        self,
        item: StockItem,
    ) -> StockItem:
        """Persist a new stock item."""
        ...

    @abstractmethod
    def update(
        self,
        item: StockItem,
    ) -> StockItem:
        """Persist changes to an existing stock item."""
        ...

    @abstractmethod
    def soft_delete(
        self,
        item_id: uuid.UUID,
    ) -> bool:
        """Soft-delete an active stock item."""
        ...