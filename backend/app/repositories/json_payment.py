from __future__ import annotations

import uuid
from pathlib import Path

from app.models.payment import Payment
from app.repositories.payment import PaymentRepository
from app.repositories.json_store import JsonCollection


class JsonFilePaymentRepository(PaymentRepository):

    def __init__(self, file_path: Path) -> None:
        self._store = JsonCollection(
            file_path,
            Payment,
        )

    def add(self, payment: Payment) -> Payment:
        with self._store.lock:
            payments = self._store.read_all()
            payments.append(payment)
            self._store.write_all(payments)

        return payment

    def get(self, payment_id: uuid.UUID) -> Payment | None:
        for payment in self._store.read_all():
            if payment.id == payment_id:
                return payment

        return None

    def list_by_invoice(
        self,
        invoice_id: uuid.UUID,
    ) -> list[Payment]:
        return [
            payment
            for payment in self._store.read_all()
            if payment.invoice_id == invoice_id
        ]