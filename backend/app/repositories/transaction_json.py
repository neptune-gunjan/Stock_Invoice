"""JSON-file-backed TransactionRepository."""

from __future__ import annotations

import threading
import uuid
from pathlib import Path
from typing import Optional

from app.models.transaction import Transaction, TransactionItem
from app.repositories.json_store import JsonCollection
from app.repositories.transaction import TransactionRepository


class JsonFileTransactionRepository(TransactionRepository):
    def __init__(self, transactions_file: Path, items_file: Path) -> None:
        self._transactions: JsonCollection[Transaction] = JsonCollection(transactions_file, Transaction)
        self._items: JsonCollection[TransactionItem] = JsonCollection(items_file, TransactionItem)
        self._lock = threading.Lock()

    def add(self, transaction: Transaction, items: list[TransactionItem]) -> Transaction:
        with self._lock:
            transactions = self._transactions.read_all()
            transactions.append(transaction)
            self._transactions.write_all(transactions)

            all_items = self._items.read_all()
            all_items.extend(items)
            self._items.write_all(all_items)
        return transaction

    def get(
        self,
        transaction_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> Optional[Transaction]:

        for transaction in self._transactions.read_all():
            if (
                transaction.id == transaction_id
                and transaction.business_id == business_id
                and transaction.deleted_at is None
            ):
                return transaction

        return None


    def list_items(self, transaction_id: uuid.UUID, business_id: uuid.UUID,) -> list[TransactionItem]:
        transaction = self.get(
            transaction_id,
            business_id,
        )

        if transaction is None:
            return []
        return [item for item in self._items.read_all() if item.transaction_id == transaction_id]

    def list_all(
        self,
        business_id: uuid.UUID,
    ) -> list[Transaction]:

        return [
            transaction
            for transaction in self._transactions.read_all()
            if (
                transaction.business_id == business_id
                and transaction.deleted_at is None
            )
        ]

    def list_by_customer(
        self,
        customer_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> list[Transaction]:

        return [
            transaction
            for transaction in self._transactions.read_all()
            if (
                transaction.customer_id == customer_id
                and transaction.business_id == business_id
                and transaction.deleted_at is None
            )
        ]
