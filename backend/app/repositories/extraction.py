"""
Persistence contract for extraction jobs and their extracted items.

Same OCP/DIP seam as app/repositories/stock.py: ExtractionService depends
on this abstraction, not on JsonFileExtractionRepository directly, so a
future Postgres-backed implementation is a drop-in.
"""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional

from app.models.extraction import ExtractedItem, ExtractionJob


class ExtractionRepository(ABC):
    @abstractmethod
    def add_job(self, job: ExtractionJob) -> ExtractionJob:
        ...

    @abstractmethod
    def get_job(self, job_id: uuid.UUID) -> Optional[ExtractionJob]:
        ...

    @abstractmethod
    def update_job(self, job: ExtractionJob) -> ExtractionJob:
        ...

    @abstractmethod
    def add_items(self, items: list[ExtractedItem]) -> list[ExtractedItem]:
        ...

    @abstractmethod
    def list_items(self, job_id: uuid.UUID) -> list[ExtractedItem]:
        ...

    @abstractmethod
    def get_item(self, item_id: uuid.UUID) -> Optional[ExtractedItem]:
        ...

    @abstractmethod
    def update_item(self, item: ExtractedItem) -> ExtractedItem:
        ...

    @abstractmethod
    def replace_items(self, job_id: uuid.UUID, items: list[ExtractedItem]) -> list[ExtractedItem]:
        """Replace the full item list for a job (used by Phase 3 matching,
        which recomputes matches for every item in one pass)."""
