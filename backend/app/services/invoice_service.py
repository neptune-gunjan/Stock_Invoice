"""
Phase 5 -- render a confirmed transaction as a PDF invoice. Zero LLM/API
calls; the rendered *content* for a given transaction id is always
identical (the invoice date comes from the stored transaction's
created_at, not wall-clock time). The PDF *bytes* can still differ between
renders because the underlying PDF library stamps its own CreationDate
into the file metadata -- a property of the PDF format itself, not
something this service controls. See docs/phase5-invoice.md and
tests/test_invoice_service.py for how determinism is actually verified
(extracted text, not raw bytes).

Depends on InvoiceRenderer (abstraction, see invoice_renderers/base.py)
and TransactionService/CustomerService, not on xhtml2pdf directly.
"""

from __future__ import annotations

import uuid
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import Settings
from app.services.customer_service import CustomerService
from app.services.invoice_renderers.base import InvoiceRenderer
from app.services.transaction_service import TransactionService

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"


class TransactionNotFoundError(Exception):
    def __init__(self, transaction_id: uuid.UUID) -> None:
        self.transaction_id = transaction_id
        super().__init__(f"transaction {transaction_id} not found")


class InvoiceService:
    def __init__(
        self,
        transaction_service: TransactionService,
        customer_service: CustomerService,
        renderer: InvoiceRenderer,
        settings: Settings,
    ) -> None:
        self._transaction_service = transaction_service
        self._customer_service = customer_service
        self._renderer = renderer
        self._settings = settings
        self._jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=select_autoescape(["html"]),
        )

    def render_invoice_pdf(self, transaction_id: uuid.UUID) -> bytes:
        result = self._transaction_service.get(transaction_id)
        if result is None:
            raise TransactionNotFoundError(transaction_id)
        transaction, items = result

        customer = None
        if transaction.customer_id is not None:
            customer = self._customer_service.get_active(transaction.customer_id)

        template = self._jinja_env.get_template("invoice.html")
        html = template.render(
            shop_name=self._settings.shop_name,
            shop_address=self._settings.shop_address,
            invoice_number=str(transaction.id)[:8].upper(),
            invoice_date=transaction.created_at.strftime("%Y-%m-%d"),
            customer_name=customer.name if customer else None,
            customer_phone=customer.phone if customer else None,
            items=items,
            total_amount=transaction.total_amount,
        )
        return self._renderer.render_pdf(html)
