from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

from app.models.invoice import Invoice
from app.repositories.invoice import InvoiceRepository
from app.repositories.json_store import JsonCollection


class JsonFileInvoiceRepository(InvoiceRepository):
    def __init__(self, file_path: Path) -> None:
        self._store: JsonCollection[Invoice] = JsonCollection(
            file_path,
            Invoice,
        )

    def add(self, invoice: Invoice) -> Invoice:
        with self._store.lock:
            invoices = self._store.read_all()
            invoices.append(invoice)
            self._store.write_all(invoices)

        return invoice

    def get(self, invoice_id: uuid.UUID) -> Optional[Invoice]:
        for invoice in self._store.read_all():
            if invoice.id == invoice_id:
                return invoice

        return None

    def get_by_number(
        self,
        invoice_number: str,
    ) -> Optional[Invoice]:
        for invoice in self._store.read_all():
            if invoice.invoice_number == invoice_number:
                return invoice

        return None

    def get_by_transaction(
        self,
        transaction_id: uuid.UUID,
    ) -> Optional[Invoice]:
        for invoice in self._store.read_all():
            if invoice.transaction_id == transaction_id:
                return invoice

        return None

    def list_all(self) -> list[Invoice]:
        return [
            invoice
            for invoice in self._store.read_all()
            if invoice.deleted_at is None
        ]

    def update(self, invoice: Invoice) -> Invoice:
        with self._store.lock:
            invoices = self._store.read_all()

            for index, existing in enumerate(invoices):
                if existing.id == invoice.id:
                    invoices[index] = invoice
                    self._store.write_all(invoices)
                    return invoice

        raise ValueError(
            f"Invoice not found: {invoice.id}"
        )