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
from datetime import datetime

from app.models.transaction import Transaction, TransactionItem
from app.repositories.transaction import TransactionRepository
from app.repositories.stock_movement import StockMovementRepository
from app.schemas.stock import StockUpdate
from app.schemas.transaction import ConfirmRequest
from app.services.customer_service import CustomerService
from app.services.stock_service import StockNotFoundError, StockService
from app.models.stock_movement import StockMovement
from app.models.invoice import Invoice
from app.repositories.invoice import InvoiceRepository

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
        stock_movement_repository: StockMovementRepository,
        invoice_repository: InvoiceRepository,
    ) -> None:
        self._repository = repository
        self._stock_service = stock_service
        self._customer_service = customer_service
        self._stock_movement_repository = stock_movement_repository
        self._invoice_repository = invoice_repository

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

        subtotal = sum(
            stock_item.unit_price * qty
            for stock_item, qty in resolved
        )

        discount = request.discount

        if discount > subtotal:
            raise ValueError("discount cannot be greater than subtotal")

        taxable_amount = subtotal - discount

        tax_amount = taxable_amount * request.tax_rate / 100

        total_amount = taxable_amount + tax_amount

        transaction = Transaction(
            customer_id=request.customer_id,
            subtotal=subtotal,
            discount=discount,
            tax=tax_amount,
            total_amount=total_amount,
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

        invoice = Invoice(
            invoice_number=self._generate_invoice_number(),
            transaction_id=transaction.id,
            customer_id=transaction.customer_id,
            subtotal=transaction.subtotal,
            discount=transaction.discount,
            tax_rate=request.tax_rate,
            tax_amount=transaction.tax,
            total_amount=transaction.total_amount,
        )

        self._invoice_repository.add(invoice)

        for stock_item, qty in resolved:
            quantity_before = stock_item.quantity_available
            quantity_after = quantity_before - qty

            self._stock_service.update_stock(
                stock_item.id,
                StockUpdate(
                    quantity_available=quantity_after
                ),
            )

            self._stock_movement_repository.add(
                StockMovement(
                    stock_id=stock_item.id,
                    movement_type="sale",
                    quantity=qty,
                    quantity_before=quantity_before,
                    quantity_after=quantity_after,
                    reference_id=transaction.id,
                )
            )

        return transaction, items

    def get(self, transaction_id: uuid.UUID) -> tuple[Transaction, list[TransactionItem]] | None:
        transaction = self._repository.get(transaction_id)
        if transaction is None:
            return None
        return transaction, self._repository.list_items(transaction_id)

    def list_by_customer(self, customer_id: uuid.UUID) -> list[Transaction]:
        return self._repository.list_by_customer(customer_id)

    def _generate_invoice_number(self) -> str:
        invoices = self._invoice_repository.list_all()

        year = datetime.now().year
        prefix = f"INV-{year}-"

        numbers = []

        for invoice in invoices:
            if invoice.invoice_number.startswith(prefix):
                try:
                    numbers.append(
                        int(invoice.invoice_number[len(prefix):])
                    )
                except ValueError:
                    continue

        next_number = max(numbers, default=0) + 1

        return f"{prefix}{next_number:06d}"
