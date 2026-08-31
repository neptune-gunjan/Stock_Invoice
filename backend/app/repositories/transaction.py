from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional

from app.models.transaction import Transaction, TransactionItem


class TransactionRepository(ABC):

    @abstractmethod
    def add(
        self,
        transaction: Transaction,
        items: list[TransactionItem],
    ) -> Transaction:
        ...

    @abstractmethod
    def get(
        self,
        transaction_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> Optional[Transaction]:
        ...

    @abstractmethod
    def list_items(
        self,
        transaction_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> list[TransactionItem]:
        ...

    @abstractmethod
    def list_by_customer(
        self,
        customer_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> list[Transaction]:
        ...