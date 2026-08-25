"""
JSON-file-backed StockRepository -- the MVP storage backend used until
Postgres is wired up (see docs/phase1-stock-catalog.md). Implements the
StockRepository contract from stock.py so it's a drop-in for whatever
calls it; nothing here is FastAPI- or business-rule-aware.
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
        self._store: JsonCollection[StockItem] = JsonCollection(file_path, StockItem)

    def list_active(self) -> list[StockItem]:
        return [item for item in self._store.read_all() if item.is_active]

    def get(self, item_id: uuid.UUID) -> Optional[StockItem]:
        for item in self._store.read_all():
            if item.id == item_id:
                return item
        return None

    def add(self, item: StockItem) -> StockItem:
        with self._store.lock:
            items = self._store.read_all()
            items.append(item)
            self._store.write_all(items)
        return item

    def update(self, item: StockItem) -> StockItem:
        with self._store.lock:
            items = self._store.read_all()
            for index, existing in enumerate(items):
                if existing.id == item.id:
                    items[index] = item
                    break
            else:
                raise KeyError(f"stock item {item.id} not found")
            self._store.write_all(items)
        return item

    def soft_delete(self, item_id: uuid.UUID) -> bool:
        with self._store.lock:
            items = self._store.read_all()
            for item in items:
                if item.id == item_id and item.is_active:
                    item.deleted_at = item.updated_at = utcnow()
                    self._store.write_all(items)
                    return True
            return False
