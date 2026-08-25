from __future__ import annotations

import uuid
from abc import ABC, abstractmethod

from app.models.stock_movement import StockMovement


class StockMovementRepository(ABC):
    @abstractmethod
    def add(self, movement: StockMovement) -> StockMovement:
        """Persist a new stock movement."""

    @abstractmethod
    def list_by_stock(
        self,
        stock_id: uuid.UUID,
    ) -> list[StockMovement]:
        """Return movement history for a stock item."""

    @abstractmethod
    def list_all(self) -> list[StockMovement]:
        """Return all stock movements."""