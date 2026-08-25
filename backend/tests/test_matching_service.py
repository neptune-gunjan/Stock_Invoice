from __future__ import annotations

from pathlib import Path

import pytest

from app.models.extraction import ExtractedItem, ExtractionJob
from app.repositories.extraction_json import JsonFileExtractionRepository
from app.repositories.stock_json import JsonFileStockRepository
from app.schemas.stock import StockCreate
from app.services.matching_service import MatchingService
from app.services.stock_service import StockService


@pytest.fixture
def stock_service(tmp_path: Path) -> StockService:
    service = StockService(JsonFileStockRepository(tmp_path / "stock.json"))
    service.create_stock(StockCreate(name="Atta", unit="kg", unit_price=45, quantity_available=100, aliases=["aata", "flour"]))
    service.create_stock(StockCreate(name="Sugar", unit="kg", unit_price=42, quantity_available=80, aliases=["shakkar"]))
    return service


@pytest.fixture
def extraction_repository(tmp_path: Path) -> JsonFileExtractionRepository:
    return JsonFileExtractionRepository(tmp_path / "jobs.json", tmp_path / "items.json")


def _seed_job(repo: JsonFileExtractionRepository, raw_texts: list[str]) -> ExtractionJob:
    job = repo.add_job(ExtractionJob(image_path="fake.png", status="success", raw_llm_output="[]"))
    repo.add_items([ExtractedItem(extraction_job_id=job.id, raw_text=t, qty=1, unit="kg") for t in raw_texts])
    return job


def test_close_match_is_auto_matched(extraction_repository, stock_service) -> None:
    job = _seed_job(extraction_repository, ["aata"])
    service = MatchingService(extraction_repository, stock_service, threshold=85)

    matched = service.match_job(job.id)

    assert matched[0].matched_stock_id == stock_service.list_stock()[0].id
    assert matched[0].needs_review is False
    assert matched[0].confidence_score >= 85


def test_poor_match_is_flagged_for_review_but_still_records_best_guess(extraction_repository, stock_service) -> None:
    job = _seed_job(extraction_repository, ["xyz totally unrelated gibberish"])
    service = MatchingService(extraction_repository, stock_service, threshold=85)

    matched = service.match_job(job.id)

    assert matched[0].needs_review is True
    # Best guess is still recorded even though it's below threshold.
    assert matched[0].matched_stock_id is not None


def test_empty_catalog_yields_no_match(extraction_repository, tmp_path: Path) -> None:
    empty_stock_service = StockService(JsonFileStockRepository(tmp_path / "empty_stock.json"))
    job = _seed_job(extraction_repository, ["atta"])
    service = MatchingService(extraction_repository, empty_stock_service, threshold=85)

    matched = service.match_job(job.id)

    assert matched[0].matched_stock_id is None
    assert matched[0].needs_review is True


def test_matching_is_deterministic_and_network_free(extraction_repository, stock_service) -> None:
    job = _seed_job(extraction_repository, ["aata", "shakkar"])
    service = MatchingService(extraction_repository, stock_service, threshold=85)

    first_pass = service.match_job(job.id)
    second_pass = service.match_job(job.id)

    assert [i.matched_stock_id for i in first_pass] == [i.matched_stock_id for i in second_pass]
    assert [i.confidence_score for i in first_pass] == [i.confidence_score for i in second_pass]


def test_threshold_is_configurable(extraction_repository, stock_service) -> None:
    # A near-but-imperfect match: close enough to score well below 100 but
    # well above a permissive threshold, so we can sweep the threshold
    # across it to prove it's actually respected.
    job = _seed_job(extraction_repository, ["aataxyz"])

    lenient = MatchingService(extraction_repository, stock_service, threshold=10)
    matched_lenient = lenient.match_job(job.id)
    assert matched_lenient[0].needs_review is False

    strict = MatchingService(extraction_repository, stock_service, threshold=99.9)
    matched_strict = strict.match_job(job.id)
    assert matched_strict[0].needs_review is True
