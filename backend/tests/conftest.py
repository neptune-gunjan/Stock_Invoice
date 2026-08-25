from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.repositories.customer_json import JsonFileCustomerRepository
from app.repositories.extraction_json import JsonFileExtractionRepository
from app.repositories.factory import (
    get_customer_repository,
    get_extraction_repository,
    get_stock_repository,
    get_transaction_repository,
)
from app.repositories.stock_json import JsonFileStockRepository
from app.repositories.transaction_json import JsonFileTransactionRepository
from app.services.extraction_providers.base import ExtractionProvider
from app.services.extraction_providers.factory import get_extraction_provider


class FakeExtractionProvider(ExtractionProvider):
    """Default extraction provider for API-level tests -- never touches
    the network. Tests that care about extraction content override this
    dependency themselves (see test_extract_api.py)."""

    def extract_raw_text(self, image_bytes: bytes, mime_type: str) -> str:
        return '[{"raw_text": "atta", "qty": 2, "unit": "kg"}]'


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    """A TestClient wired to throwaway JSON files per test, so tests never
    touch real backend/data/*.json and never leak state between tests."""
    stock_repository = JsonFileStockRepository(tmp_path / "stock.json")
    extraction_repository = JsonFileExtractionRepository(
        tmp_path / "extraction_jobs.json", tmp_path / "extracted_items.json"
    )
    transaction_repository = JsonFileTransactionRepository(
        tmp_path / "transactions.json", tmp_path / "transaction_items.json"
    )
    customer_repository = JsonFileCustomerRepository(tmp_path / "customers.json")
    app.dependency_overrides[get_stock_repository] = lambda: stock_repository
    app.dependency_overrides[get_extraction_repository] = lambda: extraction_repository
    app.dependency_overrides[get_transaction_repository] = lambda: transaction_repository
    app.dependency_overrides[get_customer_repository] = lambda: customer_repository
    app.dependency_overrides[get_extraction_provider] = lambda: FakeExtractionProvider()
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
