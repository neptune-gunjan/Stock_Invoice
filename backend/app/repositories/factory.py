"""
Composition root for every repository in the app.

This is the ONLY module that should import a concrete repository
implementation (JsonFileStockRepository, JsonFileExtractionRepository,
...). Everything else -- services, routers, scripts -- takes a repository
*interface* through its constructor and never knows which backend it's
talking to. Adding Postgres later means adding one branch per entity here;
no service or router changes.
"""

from __future__ import annotations

from functools import lru_cache

from app.config import Settings, get_settings
from app.repositories.customer import CustomerRepository
from app.repositories.customer_json import JsonFileCustomerRepository
from app.repositories.extraction import ExtractionRepository
from app.repositories.extraction_json import JsonFileExtractionRepository
from app.repositories.stock import StockRepository
from app.repositories.stock_json import JsonFileStockRepository
from app.repositories.transaction import TransactionRepository
from app.repositories.transaction_json import JsonFileTransactionRepository
from app.repositories.stock_movement import StockMovementRepository
from app.repositories.json_stock_movement import JsonFileStockMovementRepository
from app.repositories.invoice import InvoiceRepository
from app.repositories.json_invoice import JsonFileInvoiceRepository
from app.repositories.payment import PaymentRepository
from app.repositories.json_payment import JsonFilePaymentRepository
from app.repositories.business import BusinessRepository
from app.repositories.json_business import JsonFileBusinessRepository
from app.repositories.user import UserRepository
from app.repositories.user_json import JsonFileUserRepository


def build_stock_repository(settings: Settings) -> StockRepository:
    if settings.stock_storage_backend == "json_file":
        return JsonFileStockRepository(settings.stock_data_file)
    raise ValueError(f"Unknown stock_storage_backend: {settings.stock_storage_backend!r}")


@lru_cache
def get_stock_repository() -> StockRepository:
    """Process-wide singleton so all requests share one repository instance
    (and, for the JSON backend, one write lock)."""
    return build_stock_repository(get_settings())


def build_extraction_repository(settings: Settings) -> ExtractionRepository:
    if settings.extraction_storage_backend == "json_file":
        return JsonFileExtractionRepository(
            settings.extraction_jobs_data_file, settings.extracted_items_data_file
        )
    raise ValueError(f"Unknown extraction_storage_backend: {settings.extraction_storage_backend!r}")


@lru_cache
def get_extraction_repository() -> ExtractionRepository:
    return build_extraction_repository(get_settings())


def build_transaction_repository(settings: Settings) -> TransactionRepository:
    if settings.transaction_storage_backend == "json_file":
        return JsonFileTransactionRepository(
            settings.transaction_data_file, settings.transaction_items_data_file
        )
    raise ValueError(f"Unknown transaction_storage_backend: {settings.transaction_storage_backend!r}")

def build_invoice_repository(settings: Settings) -> InvoiceRepository:
    if settings.invoice_storage_backend == "json_file":
        return JsonFileInvoiceRepository(settings.invoice_data_file)

    raise ValueError(
        f"Unknown invoice_storage_backend: {settings.invoice_storage_backend!r}"
    )


@lru_cache
def get_invoice_repository() -> InvoiceRepository:
    return build_invoice_repository(get_settings())


@lru_cache
def get_transaction_repository() -> TransactionRepository:
    return build_transaction_repository(get_settings())

def build_stock_movement_repository(
    settings: Settings,
) -> StockMovementRepository:
    if settings.stock_movement_storage_backend == "json_file":
        return JsonFileStockMovementRepository(
            settings.stock_movement_data_file
        )

    raise ValueError(
        f"Unknown stock_movement_storage_backend: "
        f"{settings.stock_movement_storage_backend!r}"
    )

@lru_cache
def get_stock_movement_repository() -> StockMovementRepository:
    return build_stock_movement_repository(get_settings())

def build_customer_repository(settings: Settings) -> CustomerRepository:
    if settings.customer_storage_backend == "json_file":
        return JsonFileCustomerRepository(settings.customer_data_file)
    raise ValueError(f"Unknown customer_storage_backend: {settings.customer_storage_backend!r}")


@lru_cache
def get_customer_repository() -> CustomerRepository:
    return build_customer_repository(get_settings())

def build_payment_repository(
    settings: Settings,
) -> PaymentRepository:
    if settings.payment_storage_backend == "json_file":
        return JsonFilePaymentRepository(
            settings.payment_data_file
        )

    raise ValueError(
        f"Unknown payment_storage_backend: "
        f"{settings.payment_storage_backend!r}"
    )


@lru_cache
def get_payment_repository() -> PaymentRepository:
    return build_payment_repository(get_settings())

def build_business_repository(settings: Settings) -> BusinessRepository:
    if settings.business_storage_backend == "json_file":
        return JsonFileBusinessRepository(
            settings.business_data_file
        )

    raise ValueError(
        f"Unknown business_storage_backend: "
        f"{settings.business_storage_backend!r}"
    )


@lru_cache
def get_business_repository() -> BusinessRepository:
    return build_business_repository(get_settings())

def build_user_repository(settings: Settings) -> UserRepository:
    if settings.user_storage_backend == "json_file":
        return JsonFileUserRepository(
            settings.user_data_file
        )

    raise ValueError(
        f"Unknown user_storage_backend: "
        f"{settings.user_storage_backend!r}"
    )


@lru_cache
def get_user_repository() -> UserRepository:
    return build_user_repository(get_settings())