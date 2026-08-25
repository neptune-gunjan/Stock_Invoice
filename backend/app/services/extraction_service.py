"""
Phase 2 orchestration: save the image, call the (one and only) LLM step,
parse its output, persist everything for audit -- see
docs/phase2-extraction.md.

Depends on ExtractionProvider and ExtractionRepository abstractions only
(dependency inversion), so it's testable with a fake provider that never
touches the network -- see tests/test_extraction_service.py.
"""

from __future__ import annotations

import uuid
from pathlib import Path

from app.models.extraction import ExtractedItem, ExtractionJob
from app.repositories.extraction import ExtractionRepository
from app.services.extraction_parsing import ExtractionParseError, parse_extraction_output
from app.services.extraction_providers.base import ExtractionProvider, ExtractionProviderError


class ExtractionFailedError(Exception):
    """Raised when extraction fails, after the job has already been
    persisted as `failed` with its raw output (if any) for audit. Callers
    can always fetch the job by id to see exactly what went wrong."""

    def __init__(self, job_id: uuid.UUID, message: str) -> None:
        self.job_id = job_id
        super().__init__(message)


class ExtractionService:
    def __init__(
        self,
        repository: ExtractionRepository,
        provider: ExtractionProvider,
        upload_dir: Path,
    ) -> None:
        self._repository = repository
        self._provider = provider
        self._upload_dir = Path(upload_dir)

    def run_extraction(self, image_bytes: bytes, mime_type: str, filename: str) -> ExtractionJob:
        image_path = self._save_image(image_bytes, filename)
        job = self._repository.add_job(ExtractionJob(image_path=str(image_path), status="pending"))

        try:
            raw_text = self._provider.extract_raw_text(image_bytes, mime_type)
        except ExtractionProviderError as exc:
            job.status = "failed"
            job.error_message = str(exc)
            self._repository.update_job(job)
            raise ExtractionFailedError(job.id, str(exc)) from exc

        job.raw_llm_output = raw_text

        try:
            raw_items = parse_extraction_output(raw_text)
        except ExtractionParseError as exc:
            job.status = "failed"
            job.error_message = str(exc)
            self._repository.update_job(job)
            raise ExtractionFailedError(job.id, str(exc)) from exc

        job.status = "success"
        self._repository.update_job(job)

        items = [
            ExtractedItem(extraction_job_id=job.id, raw_text=i.raw_text, qty=i.qty, unit=i.unit)
            for i in raw_items
        ]
        self._repository.add_items(items)
        return job

    def get_job(self, job_id: uuid.UUID) -> tuple[ExtractionJob, list[ExtractedItem]] | None:
        job = self._repository.get_job(job_id)
        if job is None:
            return None
        return job, self._repository.list_items(job_id)

    def _save_image(self, image_bytes: bytes, filename: str) -> Path:
        self._upload_dir.mkdir(parents=True, exist_ok=True)
        safe_name = f"{uuid.uuid4()}_{Path(filename).name}"
        path = self._upload_dir / safe_name
        path.write_bytes(image_bytes)
        return path
