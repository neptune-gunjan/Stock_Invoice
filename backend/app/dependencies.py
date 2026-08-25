"""FastAPI dependency wiring. Routers ask for a *Service; they never see
concrete repositories or providers, keeping the HTTP layer decoupled from
storage and from the LLM client."""

from __future__ import annotations

from fastapi import Depends

from app.config import Settings, get_settings
from app.repositories.customer import CustomerRepository
from app.repositories.extraction import ExtractionRepository
from app.repositories.factory import (
    get_customer_repository,
    get_extraction_repository,
    get_stock_repository,
    get_transaction_repository,
)
from app.repositories.stock import StockRepository
from app.repositories.transaction import TransactionRepository
from app.services.customer_service import CustomerService
from app.services.extraction_providers.base import ExtractionProvider
from app.services.extraction_providers.factory import get_extraction_provider
from app.services.extraction_service import ExtractionService
from app.services.invoice_renderers.base import InvoiceRenderer
from app.services.invoice_renderers.factory import get_invoice_renderer
from app.services.invoice_service import InvoiceService
from app.services.matching_service import MatchingService
from app.services.stock_service import StockService
from app.services.transaction_service import TransactionService


def get_stock_service(
    repository: StockRepository = Depends(get_stock_repository),
) -> StockService:
    return StockService(repository)


def get_customer_service(
    repository: CustomerRepository = Depends(get_customer_repository),
) -> CustomerService:
    return CustomerService(repository)


def get_extraction_service(
    repository: ExtractionRepository = Depends(get_extraction_repository),
    provider: ExtractionProvider = Depends(get_extraction_provider),
    settings: Settings = Depends(get_settings),
) -> ExtractionService:
    return ExtractionService(repository, provider, settings.upload_dir)


def get_matching_service(
    repository: ExtractionRepository = Depends(get_extraction_repository),
    stock_service: StockService = Depends(get_stock_service),
    settings: Settings = Depends(get_settings),
) -> MatchingService:
    return MatchingService(repository, stock_service, settings.match_threshold)


def get_transaction_service(
    repository: TransactionRepository = Depends(get_transaction_repository),
    stock_service: StockService = Depends(get_stock_service),
    customer_service: CustomerService = Depends(get_customer_service),
) -> TransactionService:
    return TransactionService(repository, stock_service, customer_service)


def get_invoice_service(
    transaction_service: TransactionService = Depends(get_transaction_service),
    customer_service: CustomerService = Depends(get_customer_service),
    renderer: InvoiceRenderer = Depends(get_invoice_renderer),
    settings: Settings = Depends(get_settings),
) -> InvoiceService:
    return InvoiceService(transaction_service, customer_service, renderer, settings)
