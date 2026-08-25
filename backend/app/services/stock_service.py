"""Business rules for the stock catalog. Depends only on the
StockRepository abstraction (dependency inversion) so it works unchanged
against any storage backend that satisfies that interface."""

from __future__ import annotations

import uuid
from typing import Optional

from app.models.stock import StockItem, utcnow
from app.repositories.stock import StockRepository
from app.schemas.stock import StockCreate, StockUpdate


class StockNotFoundError(Exception):
    def __init__(self, item_id: uuid.UUID) -> None:
        self.item_id = item_id
        super().__init__(f"stock item {item_id} not found")


def _clean_aliases(aliases: list[str]) -> list[str]:
    return list(dict.fromkeys(alias.strip() for alias in aliases if alias.strip()))


class StockService:
    def __init__(self, repository: StockRepository) -> None:
        self._repository = repository

    def list_stock(self) -> list[StockItem]:
        return self._repository.list_active()

    def get_active(self, item_id: uuid.UUID) -> Optional[StockItem]:
        item = self._repository.get(item_id)
        if item is None or not item.is_active:
            return None
        return item

    def create_stock(self, data: StockCreate) -> StockItem:
        item = StockItem(
            name=data.name,
            sku=data.sku,
            unit=data.unit,
            unit_price=data.unit_price,
            quantity_available=data.quantity_available,
            low_stock_threshold=data.low_stock_threshold,
            aliases=_clean_aliases(data.aliases),
        )
        return self._repository.add(item)

    def update_stock(self, item_id: uuid.UUID, data: StockUpdate) -> StockItem:
        existing = self._repository.get(item_id)
        if existing is None or not existing.is_active:
            raise StockNotFoundError(item_id)

        updates = data.model_dump(exclude_unset=True)
        if updates.get("aliases") is not None:
            updates["aliases"] = _clean_aliases(updates["aliases"])
        updated = existing.model_copy(update={**updates, "updated_at": utcnow()})
        return self._repository.update(updated)

    def delete_stock(self, item_id: uuid.UUID) -> None:
        existing = self._repository.get(item_id)
        if existing is None or not existing.is_active:
            raise StockNotFoundError(item_id)
        self._repository.soft_delete(item_id)
