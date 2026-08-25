from __future__ import annotations

from pathlib import Path

import pytest

from app.repositories.customer_json import JsonFileCustomerRepository
from app.repositories.stock_json import JsonFileStockRepository
from app.repositories.transaction_json import JsonFileTransactionRepository
from app.schemas.stock import StockCreate
from app.schemas.transaction import ConfirmItemInput, ConfirmRequest
from app.services.customer_service import CustomerService
from app.services.stock_service import StockNotFoundError, StockService
from app.services.transaction_service import InsufficientStockError, TransactionService


@pytest.fixture
def stock_service(tmp_path: Path) -> StockService:
    service = StockService(JsonFileStockRepository(tmp_path / "stock.json"))
    service.create_stock(StockCreate(name="Atta", unit="kg", unit_price=45, quantity_available=10))
    service.create_stock(StockCreate(name="Sugar", unit="kg", unit_price=42, quantity_available=5))
    return service


@pytest.fixture
def customer_service(tmp_path: Path) -> CustomerService:
    return CustomerService(JsonFileCustomerRepository(tmp_path / "customers.json"))


@pytest.fixture
def transaction_service(
    tmp_path: Path, stock_service: StockService, customer_service: CustomerService
) -> TransactionService:
    repository = JsonFileTransactionRepository(tmp_path / "transactions.json", tmp_path / "items.json")
    return TransactionService(repository, stock_service, customer_service)


def test_confirm_creates_transaction_and_decrements_stock(transaction_service, stock_service) -> None:
    atta, sugar = stock_service.list_stock()

    request = ConfirmRequest(items=[
        ConfirmItemInput(stock_id=atta.id, qty=2),
        ConfirmItemInput(stock_id=sugar.id, qty=1),
    ])
    transaction, items = transaction_service.confirm(request)

    assert transaction.total_amount == 45 * 2 + 42 * 1
    assert transaction.status == "confirmed"
    assert len(items) == 2

    catalog_by_id = {item.id: item for item in stock_service.list_stock()}
    assert catalog_by_id[atta.id].quantity_available == 8
    assert catalog_by_id[sugar.id].quantity_available == 4


def test_confirm_rejects_insufficient_stock_and_writes_nothing(transaction_service, stock_service) -> None:
    atta = stock_service.list_stock()[0]

    request = ConfirmRequest(items=[ConfirmItemInput(stock_id=atta.id, qty=999)])
    with pytest.raises(InsufficientStockError):
        transaction_service.confirm(request)

    # Stock must be untouched -- validation happens before any write.
    assert stock_service.list_stock()[0].quantity_available == 10


def test_confirm_rejects_unknown_stock_id(transaction_service) -> None:
    import uuid

    request = ConfirmRequest(items=[ConfirmItemInput(stock_id=uuid.uuid4(), qty=1)])
    with pytest.raises(StockNotFoundError):
        transaction_service.confirm(request)


def test_get_transaction_by_id(transaction_service, stock_service) -> None:
    atta = stock_service.list_stock()[0]
    request = ConfirmRequest(items=[ConfirmItemInput(stock_id=atta.id, qty=1)])
    created, _ = transaction_service.confirm(request)

    fetched, items = transaction_service.get(created.id)
    assert fetched.id == created.id
    assert len(items) == 1
    assert items[0].stock_name == "Atta"
