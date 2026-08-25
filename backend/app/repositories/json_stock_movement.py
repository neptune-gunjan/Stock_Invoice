from __future__ import annotations

import uuid
from pathlib import Path

from app.models.stock_movement import StockMovement
from app.repositories.json_store import JsonCollection
from app.repositories.stock_movement import StockMovementRepository


class JsonFileStockMovementRepository(
    StockMovementRepository
):
    def __init__(self, file_path: Path) -> None:
        self._store: JsonCollection[StockMovement] = JsonCollection(
            file_path,
            StockMovement,
        )

    def add(
        self,
        movement: StockMovement,
    ) -> StockMovement:
        with self._store.lock:
            movements = self._store.read_all()
            movements.append(movement)
            self._store.write_all(movements)

        return movement

    def list_by_stock(
        self,
        stock_id: uuid.UUID,
    ) -> list[StockMovement]:
        return [
            movement
            for movement in self._store.read_all()
            if movement.stock_id == stock_id
        ]

    def list_all(self) -> list[StockMovement]:
        return self._store.read_all()