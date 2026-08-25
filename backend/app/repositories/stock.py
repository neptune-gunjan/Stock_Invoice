"""
Persistence contract for the stock catalog.

This interface is the seam that keeps the app open for extension / closed
for modification (SOLID's OCP) and lets StockService depend on an
abstraction rather than a concrete store (DIP). Today only
JsonFileStockRepository implements it (see stock_json.py, per the project's
current "keep it in a JSON file for now" decision); adding Postgres later
means writing a new class that implements this same interface -- neither
StockService nor the API routes change.
"""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional

from app.models.stock import StockItem


class StockRepository(ABC):
    @abstractmethod
    def list_active(self) -> list[StockItem]:
        """Return all non-soft-deleted stock items."""

    @abstractmethod
    def get(self, item_id: uuid.UUID) -> Optional[StockItem]:
        """Return a stock item by id, including soft-deleted ones, or None."""

    @abstractmethod
    def add(self, item: StockItem) -> StockItem:
        """Persist a brand-new stock item."""

    @abstractmethod
    def update(self, item: StockItem) -> StockItem:
        """Persist changes to an existing stock item (full replace by id)."""

    @abstractmethod
    def soft_delete(self, item_id: uuid.UUID) -> bool:
        """Mark an active item as deleted. Returns False if not found/already deleted."""
