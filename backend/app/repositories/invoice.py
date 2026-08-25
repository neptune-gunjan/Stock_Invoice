from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional

from app.models.invoice import Invoice


class InvoiceRepository(ABC):
    @abstractmethod
    def add(self, invoice: Invoice) -> Invoice:
        ...

    @abstractmethod
    def get(self, invoice_id: uuid.UUID) -> Optional[Invoice]:
        ...

    @abstractmethod
    def get_by_number(
        self,
        invoice_number: str,
    ) -> Optional[Invoice]:
        ...

    @abstractmethod
    def get_by_transaction(
        self,
        transaction_id: uuid.UUID,
    ) -> Optional[Invoice]:
        ...

    @abstractmethod
    def list_all(self) -> list[Invoice]:
        ...

    @abstractmethod
    def update(self, invoice: Invoice) -> Invoice:
        ...