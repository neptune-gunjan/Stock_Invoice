from __future__ import annotations

import uuid
from abc import ABC, abstractmethod

from app.models.payment import Payment


class PaymentRepository(ABC):

    @abstractmethod
    def add(self, payment: Payment) -> Payment:
        ...

    @abstractmethod
    def get(self, payment_id: uuid.UUID) -> Payment | None:
        ...

    @abstractmethod
    def list_by_invoice(self, invoice_id: uuid.UUID) -> list[Payment]:
        ...