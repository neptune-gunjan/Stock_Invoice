"""
Demonstrates the Open/Closed + Dependency Inversion seam in the stock
layer: StockService is exercised here against a fake, in-memory
StockRepository it has never seen before (not JsonFileStockRepository).
No changes to StockService were needed to make this work -- that's the
point. The real Postgres-backed repository (added later) plugs in the
same way.
"""

from __future__ import annotations

import uuid
from typing import Optional

from app.models.stock import StockItem
from app.repositories.stock import StockRepository
from app.schemas.stock import StockCreate, StockUpdate
from app.services.stock_service import StockService


class InMemoryStockRepository(StockRepository):
    def __init__(self) -> None:
        self._items: dict[uuid.UUID, StockItem] = {}

    def list_active(self) -> list[StockItem]:
        return [item for item in self._items.values() if item.is_active]

    def get(self, item_id: uuid.UUID) -> Optional[StockItem]:
        return self._items.get(item_id)

    def add(self, item: StockItem) -> StockItem:
        self._items[item.id] = item
        return item

    def update(self, item: StockItem) -> StockItem:
        self._items[item.id] = item
        return item

    def soft_delete(self, item_id: uuid.UUID) -> bool:
        item = self._items.get(item_id)
        if item is None or not item.is_active:
            return False
        item.deleted_at = item.updated_at
        return True


def test_stock_service_works_against_any_repository_implementation() -> None:
    service = StockService(InMemoryStockRepository())

    created = service.create_stock(
        StockCreate(name="Sugar", unit="kg", unit_price=42, quantity_available=80, aliases=["shakkar"])
    )
    assert created in service.list_stock()

    updated = service.update_stock(created.id, StockUpdate(quantity_available=75))
    assert updated.quantity_available == 75

    service.delete_stock(created.id)
    assert service.list_stock() == []
