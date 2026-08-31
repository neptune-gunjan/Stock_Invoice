"""
JSON-file-backed StockRepository.
"""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

from app.models.stock import StockItem, utcnow
from app.repositories.json_store import JsonCollection
from app.repositories.stock import StockRepository


class JsonFileStockRepository(StockRepository):

    def __init__(self, file_path: Path) -> None:
        self._store: JsonCollection[StockItem] = JsonCollection(
            file_path,
            StockItem,
        )

    def list_active(
        self,
        business_id: uuid.UUID,
    ) -> list[StockItem]:

        return [
            item
            for item in self._store.read_all()
            if (
                item.is_active
                and item.business_id == business_id
            )
        ]

    def get(
        self,
        item_id: uuid.UUID,
    ) -> Optional[StockItem]:

        for item in self._store.read_all():
            if item.id == item_id:
                return item

        return None

    def add(
        self,
        item: StockItem,
    ) -> StockItem:

        with self._store.lock:
            items = self._store.read_all()
            items.append(item)
            self._store.write_all(items)

        return item

    def update(
        self,
        item: StockItem,
    ) -> StockItem:

        with self._store.lock:
            items = self._store.read_all()

            for index, existing in enumerate(items):
                if existing.id == item.id:

                    # Extra safety:
                    # business ownership cannot change accidentally.
                    if existing.business_id != item.business_id:
                        raise ValueError(
                            "Cannot change stock business ownership."
                        )

                    items[index] = item
                    self._store.write_all(items)

                    return item

            raise KeyError(
                f"stock item {item.id} not found"
            )

    def soft_delete(
        self,
        item_id: uuid.UUID,
    ) -> bool:

        with self._store.lock:
            items = self._store.read_all()

            for item in items:

                if (
                    item.id == item_id
                    and item.is_active
                ):
                    now = utcnow()

                    item.deleted_at = now
                    item.updated_at = now

                    self._store.write_all(items)

                    return True

        return False