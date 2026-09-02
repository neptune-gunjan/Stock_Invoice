from __future__ import annotations

from pydantic import BaseModel


class StockImportError(BaseModel):
    row: int
    message: str


class StockImportResult(BaseModel):
    imported: int
    skipped: int
    failed: int
    errors: list[StockImportError]