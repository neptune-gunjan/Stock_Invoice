from __future__ import annotations

import io
from pathlib import Path

import pytest
from pypdf import PdfReader

from app.config import Settings
from app.repositories.customer_json import JsonFileCustomerRepository
from app.repositories.stock_json import JsonFileStockRepository
from app.repositories.transaction_json import JsonFileTransactionRepository
from app.schemas.customer import CustomerCreate
from app.schemas.stock import StockCreate
from app.schemas.transaction import ConfirmItemInput, ConfirmRequest
from app.services.customer_service import CustomerService
from app.services.invoice_renderers.xhtml2pdf_renderer import Xhtml2PdfInvoiceRenderer
from app.services.invoice_service import InvoiceService, TransactionNotFoundError
from app.services.stock_service import StockService
from app.services.transaction_service import TransactionService


@pytest.fixture
def wiring(tmp_path: Path):
    stock_service = StockService(JsonFileStockRepository(tmp_path / "stock.json"))
    customer_service = CustomerService(JsonFileCustomerRepository(tmp_path / "customers.json"))
    transaction_service = TransactionService(
        JsonFileTransactionRepository(tmp_path / "tx.json", tmp_path / "tx_items.json"),
        stock_service,
        customer_service,
    )
    invoice_service = InvoiceService(
        transaction_service,
        customer_service,
        Xhtml2PdfInvoiceRenderer(),
        Settings(shop_name="Test Kirana Store", shop_address="123 Market Rd"),
    )
    return stock_service, customer_service, transaction_service, invoice_service


def extract_text(pdf_bytes: bytes) -> str:
    return "".join(page.extract_text() for page in PdfReader(io.BytesIO(pdf_bytes)).pages)


def test_render_invoice_pdf_for_anonymous_transaction(wiring) -> None:
    stock_service, _customer_service, transaction_service, invoice_service = wiring
    stock = stock_service.create_stock(
        StockCreate(name="Atta", unit="kg", unit_price=45, quantity_available=10)
    )
    transaction, _ = transaction_service.confirm(
        ConfirmRequest(items=[ConfirmItemInput(stock_id=stock.id, qty=2)])
    )

    pdf_bytes = invoice_service.render_invoice_pdf(transaction.id)

    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 100


def test_render_invoice_pdf_includes_customer(wiring) -> None:
    stock_service, customer_service, transaction_service, invoice_service = wiring
    stock = stock_service.create_stock(
        StockCreate(name="Sugar", unit="kg", unit_price=42, quantity_available=10)
    )
    customer = customer_service.create_customer(CustomerCreate(name="Ramesh", phone="9999999999"))
    transaction, _ = transaction_service.confirm(
        ConfirmRequest(customer_id=customer.id, items=[ConfirmItemInput(stock_id=stock.id, qty=1)])
    )

    pdf_bytes = invoice_service.render_invoice_pdf(transaction.id)
    text = extract_text(pdf_bytes)
    assert "Ramesh" in text
    assert "9999999999" in text


def test_render_invoice_pdf_omits_customer_when_anonymous(wiring) -> None:
    stock_service, _customer_service, transaction_service, invoice_service = wiring
    stock = stock_service.create_stock(
        StockCreate(name="Oil", unit="litre", unit_price=150, quantity_available=10)
    )
    transaction, _ = transaction_service.confirm(
        ConfirmRequest(items=[ConfirmItemInput(stock_id=stock.id, qty=1)])
    )

    text = extract_text(invoice_service.render_invoice_pdf(transaction.id))
    assert "Ramesh" not in text


def test_same_transaction_produces_deterministic_content(wiring) -> None:
    """Same transaction -> same rendered *content* every time. PDF bytes
    themselves aren't byte-identical because the underlying PDF library
    (like any of them) stamps a CreationDate into the file metadata -- that
    is a property of the PDF format, not of our template/data, so we
    compare extracted text instead of raw bytes."""
    stock_service, _customer_service, transaction_service, invoice_service = wiring
    stock = stock_service.create_stock(
        StockCreate(name="Rice", unit="kg", unit_price=60, quantity_available=10)
    )
    transaction, _ = transaction_service.confirm(
        ConfirmRequest(items=[ConfirmItemInput(stock_id=stock.id, qty=3)])
    )

    first = extract_text(invoice_service.render_invoice_pdf(transaction.id))
    second = extract_text(invoice_service.render_invoice_pdf(transaction.id))
    assert first == second
    assert "Rice" in first


def test_unknown_transaction_raises(wiring) -> None:
    import uuid

    _stock_service, _customer_service, _transaction_service, invoice_service = wiring
    with pytest.raises(TransactionNotFoundError):
        invoice_service.render_invoice_pdf(uuid.uuid4())
