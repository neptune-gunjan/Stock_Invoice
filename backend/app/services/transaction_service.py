"""
Phase 4 -- confirm reviewed items into a real transaction and decrement
stock. This is the ONLY place in the whole system that mutates stock
levels (docs/phase4-review.md) -- StockService.update_stock exists for
Phase 1 CRUD, but only TransactionService.confirm calls it as a side
effect of a sale.

Note on atomicity: with the JSON-file backend, writing the transaction and
decrementing each stock item are separate, sequential file writes -- not a
single atomic operation. A crash mid-confirm could leave a transaction
recorded without every stock decrement applied. This is an accepted MVP
limitation; Postgres (planned upgrade, see docs/architecture.md) gets this
for free via a real DB transaction, which is one more reason it's the
eventual backend.
"""

from __future__ import annotations

import uuid

from app.models.transaction import Transaction, TransactionItem
from app.repositories.transaction import TransactionRepository
from app.schemas.stock import StockUpdate
from app.schemas.transaction import ConfirmRequest
from app.services.customer_service import CustomerService
from app.services.stock_service import StockNotFoundError, StockService


class InsufficientStockError(Exception):
    def __init__(self, stock_id: uuid.UUID, requested: float, available: float) -> None:
        self.stock_id = stock_id
        super().__init__(
            f"stock item {stock_id} has {available} available, but {requested} were requested"
        )


class TransactionService:
    def __init__(
        self,
        repository: TransactionRepository,
        stock_service: StockService,
        customer_service: CustomerService,
    ) -> None:
        self._repository = repository
        self._stock_service = stock_service
        self._customer_service = customer_service

    def confirm(self, request: ConfirmRequest) -> tuple[Transaction, list[TransactionItem]]:
        # Validate the customer (if any) up front, alongside every line,
        # before writing anything -- see the atomicity note above.
        if request.customer_id is not None:
            self._customer_service.require_active(request.customer_id)

        resolved = []
        for line in request.items:
            stock_item = self._stock_service.get_active(line.stock_id)
            if stock_item is None:
                raise StockNotFoundError(line.stock_id)
            if stock_item.quantity_available < line.qty:
                raise InsufficientStockError(line.stock_id, line.qty, stock_item.quantity_available)
            resolved.append((stock_item, line.qty))

        transaction = Transaction(
            customer_id=request.customer_id,
            total_amount=sum(stock_item.unit_price * qty for stock_item, qty in resolved),
        )
        items = [
            TransactionItem(
                transaction_id=transaction.id,
                stock_id=stock_item.id,
                stock_name=stock_item.name,
                unit=stock_item.unit,
                qty=qty,
                unit_price=stock_item.unit_price,
                line_total=stock_item.unit_price * qty,
            )
            for stock_item, qty in resolved
        ]
        self._repository.add(transaction, items)

        for stock_item, qty in resolved:
            self._stock_service.update_stock(
                stock_item.id, StockUpdate(quantity_available=stock_item.quantity_available - qty)
            )

        return transaction, items

    def get(self, transaction_id: uuid.UUID) -> tuple[Transaction, list[TransactionItem]] | None:
        transaction = self._repository.get(transaction_id)
        if transaction is None:
            return None
        return transaction, self._repository.list_items(transaction_id)

    def list_by_customer(self, customer_id: uuid.UUID) -> list[Transaction]:
        return self._repository.list_by_customer(customer_id)
