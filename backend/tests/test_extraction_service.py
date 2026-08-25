"""
Exercises ExtractionService against a FakeExtractionProvider that never
touches the network -- the same OCP seam demonstrated for StockRepository
in test_stock_service_ocp.py, applied to ExtractionProvider.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.repositories.extraction_json import JsonFileExtractionRepository
from app.services.extraction_providers.base import ExtractionProvider, ExtractionProviderError
from app.services.extraction_service import ExtractionFailedError, ExtractionService


class FakeExtractionProvider(ExtractionProvider):
    def __init__(self, response: str | None = None, error: str | None = None) -> None:
        self._response = response
        self._error = error

    def extract_raw_text(self, image_bytes: bytes, mime_type: str) -> str:
        if self._error:
            raise ExtractionProviderError(self._error)
        assert self._response is not None
        return self._response


@pytest.fixture
def repository(tmp_path: Path) -> JsonFileExtractionRepository:
    return JsonFileExtractionRepository(tmp_path / "jobs.json", tmp_path / "items.json")


def test_successful_extraction_persists_job_and_items(repository, tmp_path: Path) -> None:
    provider = FakeExtractionProvider(
        response='[{"raw_text": "atta", "qty": 2, "unit": "kg"}, {"raw_text": "oil", "qty": null, "unit": null}]'
    )
    service = ExtractionService(repository, provider, tmp_path / "uploads")

    job = service.run_extraction(b"fake-image-bytes", "image/png", "note.png")

    assert job.status == "success"
    assert job.raw_llm_output is not None

    fetched_job, items = service.get_job(job.id)
    assert fetched_job.status == "success"
    assert len(items) == 2
    assert items[0].raw_text == "atta"
    assert items[0].qty == 2
    assert items[1].qty is None


def test_provider_failure_marks_job_failed_and_still_raises(repository, tmp_path: Path) -> None:
    provider = FakeExtractionProvider(error="rate limited")
    service = ExtractionService(repository, provider, tmp_path / "uploads")

    with pytest.raises(ExtractionFailedError) as exc_info:
        service.run_extraction(b"fake-image-bytes", "image/png", "note.png")

    job_id = exc_info.value.job_id
    job, items = service.get_job(job_id)
    assert job.status == "failed"
    assert "rate limited" in job.error_message
    assert items == []


def test_non_json_response_marks_job_failed_but_keeps_raw_output(repository, tmp_path: Path) -> None:
    provider = FakeExtractionProvider(response="I couldn't quite read this note, sorry!")
    service = ExtractionService(repository, provider, tmp_path / "uploads")

    with pytest.raises(ExtractionFailedError) as exc_info:
        service.run_extraction(b"fake-image-bytes", "image/png", "note.png")

    job, items = service.get_job(exc_info.value.job_id)
    assert job.status == "failed"
    # Raw output must be preserved for audit even though parsing failed.
    assert job.raw_llm_output == "I couldn't quite read this note, sorry!"
    assert items == []
