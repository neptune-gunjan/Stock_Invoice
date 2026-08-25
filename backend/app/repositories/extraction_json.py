"""JSON-file-backed ExtractionRepository. Two JsonCollections (jobs,
items) behind one repository so callers don't deal with two objects."""

from __future__ import annotations

import threading
import uuid
from pathlib import Path
from typing import Optional

from app.models.extraction import ExtractedItem, ExtractionJob
from app.repositories.extraction import ExtractionRepository
from app.repositories.json_store import JsonCollection


class JsonFileExtractionRepository(ExtractionRepository):
    def __init__(self, jobs_file: Path, items_file: Path) -> None:
        self._jobs: JsonCollection[ExtractionJob] = JsonCollection(jobs_file, ExtractionJob)
        self._items: JsonCollection[ExtractedItem] = JsonCollection(items_file, ExtractedItem)
        self._lock = threading.Lock()

    def add_job(self, job: ExtractionJob) -> ExtractionJob:
        with self._lock:
            jobs = self._jobs.read_all()
            jobs.append(job)
            self._jobs.write_all(jobs)
        return job

    def get_job(self, job_id: uuid.UUID) -> Optional[ExtractionJob]:
        for job in self._jobs.read_all():
            if job.id == job_id:
                return job
        return None

    def update_job(self, job: ExtractionJob) -> ExtractionJob:
        with self._lock:
            jobs = self._jobs.read_all()
            for index, existing in enumerate(jobs):
                if existing.id == job.id:
                    jobs[index] = job
                    break
            else:
                raise KeyError(f"extraction job {job.id} not found")
            self._jobs.write_all(jobs)
        return job

    def add_items(self, items: list[ExtractedItem]) -> list[ExtractedItem]:
        with self._lock:
            existing = self._items.read_all()
            existing.extend(items)
            self._items.write_all(existing)
        return items

    def list_items(self, job_id: uuid.UUID) -> list[ExtractedItem]:
        return [item for item in self._items.read_all() if item.extraction_job_id == job_id]

    def get_item(self, item_id: uuid.UUID) -> Optional[ExtractedItem]:
        for item in self._items.read_all():
            if item.id == item_id:
                return item
        return None

    def update_item(self, item: ExtractedItem) -> ExtractedItem:
        with self._lock:
            items = self._items.read_all()
            for index, existing in enumerate(items):
                if existing.id == item.id:
                    items[index] = item
                    break
            else:
                raise KeyError(f"extracted item {item.id} not found")
            self._items.write_all(items)
        return item

    def replace_items(self, job_id: uuid.UUID, items: list[ExtractedItem]) -> list[ExtractedItem]:
        with self._lock:
            all_items = [i for i in self._items.read_all() if i.extraction_job_id != job_id]
            all_items.extend(items)
            self._items.write_all(all_items)
        return items
