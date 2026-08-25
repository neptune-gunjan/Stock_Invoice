"""
Generic, thread-safe, atomically-written JSON-array store for a single
Pydantic model type.

Every *_json.py repository in this package (stock, extraction, customer,
transaction) composes one of these per file instead of reimplementing
read/write/locking. Each repository still defines and implements its own
narrow domain interface (StockRepository, ExtractionRepository, ...) --
this class only owns file I/O, never domain rules.
"""

from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class JsonCollection(Generic[T]):
    def __init__(self, file_path: Path, model: type[T]) -> None:
        self._file_path = Path(file_path)
        self._model = model
        self.lock = threading.Lock()
        self._file_path.parent.mkdir(parents=True, exist_ok=True)
        if not self._file_path.exists():
            self.write_all([])

    def read_all(self) -> list[T]:
        raw = self._file_path.read_text(encoding="utf-8")
        records = json.loads(raw) if raw.strip() else []
        return [self._model.model_validate(record) for record in records]

    def write_all(self, items: list[T]) -> None:
        payload = json.dumps([item.model_dump(mode="json") for item in items], indent=2)
        tmp_path = self._file_path.with_suffix(".tmp")
        tmp_path.write_text(payload, encoding="utf-8")
        os.replace(tmp_path, self._file_path)
