
"""
Phase 5 -- render a confirmed transaction as a PDF invoice.

InvoiceService depends on abstractions:
- TransactionService
- CustomerService
- BusinessRepository
- InvoiceRepository
- PaymentRepository
- StockMovementRepository
- StockService
- InvoiceRenderer

Business information is loaded dynamically from BusinessRepository.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import Settings
from app.models.invoice import Invoice
from app.models.stock_movement import StockMovement
from app.repositories.business import BusinessRepository
from app.repositories.invoice import InvoiceRepository
from app.repositories.payment import PaymentRepository
from app.repositories.stock_movement import StockMovementRepository
from app.services.customer_service import CustomerService
from app.services.invoice_renderers.base import InvoiceRenderer
from app.services.stock_service import StockNotFoundError, StockService
from app.services.transaction_service import TransactionService
from app.schemas.stock import StockUpdate


TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"


class TransactionNotFoundError(Exception):
    def __init__(self, transaction_id: uuid.UUID) -> None:
        self.transaction_id = transaction_id
        super().__init__(f"transaction {transaction_id} not found")


class BusinessNotFoundError(Exception):
    def __init__(self) -> None:
        super().__init__("active business profile not found")


class InvoiceNotFoundError(Exception):
    def __init__(self, invoice_id: uuid.UUID) -> None:
        self.invoice_id = invoice_id
        super().__init__(f"invoice {invoice_id} not found")


class InvalidInvoiceStateError(Exception):
    pass


class InvoiceService:
    def __init__(
        self,
        transaction_service: TransactionService,
        customer_service: CustomerService,
        business_repository: BusinessRepository,
        repository: InvoiceRepository,
        payment_repository: PaymentRepository,
        stock_movement_repository: StockMovementRepository,
        stock_service: StockService,
        renderer: InvoiceRenderer,
        settings: Settings,
    ) -> None:
        self._transaction_service = transaction_service
        self._customer_service = customer_service
        self._business_repository = business_repository
        self._repository = repository
        self._payment_repository = payment_repository
        self._stock_movement_repository = stock_movement_repository
        self._stock_service = stock_service
        self._renderer = renderer
        self._settings = settings

        self._jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=select_autoescape(["html"]),
        )

    def render_invoice_pdf(
        self,
        transaction_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> bytes:
        # ---------------------------------------------------------
        # 1. Get transaction
        # ---------------------------------------------------------
        result = self._transaction_service.get(
            transaction_id,
            business_id,
        )

        if result is None:
            raise TransactionNotFoundError(transaction_id)

        transaction, items = result

        # ---------------------------------------------------------
        # 2. Get customer
        # ---------------------------------------------------------
        customer = None

        if transaction.customer_id is not None:
            customer = self._customer_service.get_active(
                transaction.customer_id,
                business_id,
            )

        # ---------------------------------------------------------
        # 3. Get active business
        # ---------------------------------------------------------
        business = self._business_repository.get(business_id)

        if business is None:
            raise BusinessNotFoundError()

        # ---------------------------------------------------------
        # 4. Get existing invoice
        # ---------------------------------------------------------
        invoice = self._repository.get_by_transaction(
            transaction.id,
            business_id,
        )

        # ---------------------------------------------------------
        # 5. Create invoice if it doesn't exist
        # ---------------------------------------------------------
        if invoice is None:
            invoice = Invoice(
                business_id=business_id,
                invoice_number=self._generate_invoice_number(
                    business_id
                ),
                transaction_id=transaction.id,
                customer_id=transaction.customer_id,
                subtotal=transaction.subtotal,
                discount=transaction.discount,
                tax_rate=(
                    transaction.tax
                    / (transaction.subtotal - transaction.discount)
                    * 100
                    if transaction.subtotal > transaction.discount
                    else 0
                ),
                tax_amount=transaction.tax,
                total_amount=transaction.total_amount,
            )

            self._repository.add(invoice)

        # ---------------------------------------------------------
        # 6. Payments
        # ---------------------------------------------------------
        payments = self._payment_repository.list_by_invoice(
            invoice.id
        )

        paid_amount = sum(
            payment.amount
            for payment in payments
        )

        remaining_amount = max(
            invoice.total_amount - paid_amount,
            0,
        )

        # ---------------------------------------------------------
        # 7. Render HTML
        # ---------------------------------------------------------
        template = self._jinja_env.get_template(
            "invoice.html"
        )

        html = template.render(
            # Business information
            business_name=business.business_name,
            owner_name=business.owner_name,
            business_phone=business.phone,
            business_email=business.email,
            business_address=business.address,
            gst_number=business.gst_number,
            logo_path=business.logo_path,
            invoice_prefix=business.invoice_prefix,

            # Invoice
            invoice_number=invoice.invoice_number,
            invoice_date=transaction.created_at.strftime(
                "%Y-%m-%d"
            ),

            # Customer
            customer_name=(
                customer.name
                if customer
                else None
            ),
            customer_phone=(
                customer.phone
                if customer
                else None
            ),

            # Items
            items=items,

            # Amounts
            subtotal=invoice.subtotal,
            discount=invoice.discount,
            tax_rate=invoice.tax_rate,
            tax_amount=invoice.tax_amount,
            total_amount=invoice.total_amount,

            # Payment
            payment_status=invoice.payment_status,
            payment_method=invoice.payment_method,
            paid_amount=paid_amount,
            remaining_amount=remaining_amount,
            payments=payments,
        )

        # ---------------------------------------------------------
        # 8. Render PDF
        # ---------------------------------------------------------
        return self._renderer.render_pdf(html)

    # ============================================================
    # Invoice lookup
    # ============================================================

    def get_by_transaction(
        self,
        transaction_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> Invoice | None:
        return self._repository.get_by_transaction(
            transaction_id,
            business_id,
        )

    def get(
        self,
        invoice_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> Invoice | None:
        return self._repository.get(
            invoice_id,
            business_id,
        )

    # ============================================================
    # Invoice detail
    # ============================================================

    def get_detail(
        self,
        invoice_id: uuid.UUID,
        business_id: uuid.UUID,
    ):
        invoice = self._repository.get(
            invoice_id,
            business_id,
        )

        if invoice is None:
            return None

        transaction_result = self._transaction_service.get(
            invoice.transaction_id,
            business_id,
        )

        if transaction_result is None:
            return None

        transaction, items = transaction_result

        payments = self._payment_repository.list_by_invoice(
            invoice_id
        )

        paid_amount = sum(
            payment.amount
            for payment in payments
        )

        remaining_amount = max(
            invoice.total_amount - paid_amount,
            0,
        )

        return (
            invoice,
            items,
            payments,
            paid_amount,
            remaining_amount,
        )

    def get_payment_summary(
        self,
        invoice_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> tuple[float, float, str] | None:

        invoice = self._repository.get(
            invoice_id,
            business_id,
        )

        if invoice is None or invoice.deleted_at is not None:
            return None

        payments = self._payment_repository.list_by_invoice(
            invoice_id
        )

        paid_amount = sum(
            payment.amount
            for payment in payments
        )

        remaining_amount = max(
            invoice.total_amount - paid_amount,
            0,
        )

        if paid_amount >= invoice.total_amount:
            payment_status = "paid"
        elif paid_amount > 0:
            payment_status = "partial"
        else:
            payment_status = "pending"

        return (
            paid_amount,
            remaining_amount,
            payment_status,
        )

    # ============================================================
    # List invoices
    # ============================================================

    def list_all(
        self,
        business_id: uuid.UUID,
    ) -> list[Invoice]:
        return self._repository.list_all(
            business_id
        )

    # ============================================================
    # Cancel invoice + restore stock
    # ============================================================

    def cancel_invoice(
        self,
        invoice_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> Invoice:

        # ---------------------------------------------------------
        # 1. Get invoice
        # ---------------------------------------------------------

        invoice = self._repository.get(
            invoice_id,
            business_id,
        )

        if invoice is None or invoice.deleted_at is not None:
            raise InvoiceNotFoundError(invoice_id)

        # ---------------------------------------------------------
        # 2. Prevent duplicate cancellation
        # ---------------------------------------------------------

        if invoice.status == "cancelled":
            raise InvalidInvoiceStateError(
                "Invoice is already cancelled"
            )

        # ---------------------------------------------------------
        # 3. Get transaction + items
        # ---------------------------------------------------------

        transaction_result = self._transaction_service.get(
            invoice.transaction_id,
            business_id,
        )

        if transaction_result is None:
            raise TransactionNotFoundError(
                invoice.transaction_id
            )

        transaction, items = transaction_result

        # ---------------------------------------------------------
        # STEP 1: PRE-VALIDATE ALL STOCK ITEMS
        # ---------------------------------------------------------

        stock_items = []

        for item in items:
            stock_item = self._stock_service.get_for_business(
                item.stock_id,
                business_id,
            )

            if stock_item is None:
                raise StockNotFoundError(item.stock_id)

            stock_items.append(
                (item, stock_item)
            )

        # ---------------------------------------------------------
        # STEP 2: PRE-BUILD / VALIDATE ALL REVERSAL MOVEMENTS
        #
        # IMPORTANT:
        # No stock has been modified yet.
        # If StockMovement validation fails, cancellation stops safely.
        # ---------------------------------------------------------

        reversal_movements = []

        for item, stock_item in stock_items:

            quantity_before = stock_item.quantity_available
            quantity_after = (
                quantity_before + item.qty
            )

            reversal_movements.append(
                StockMovement(
                    stock_id=item.stock_id,
                    movement_type="sale_reversal",
                    quantity=item.qty,
                    quantity_before=quantity_before,
                    quantity_after=quantity_after,
                    reference_id=transaction.id,
                )
            )

        # ---------------------------------------------------------
        # STEP 3: RESTORE STOCK
        # ---------------------------------------------------------
        
        for item, stock_item in stock_items:

        
            self._stock_service.restore_stock_for_cancellation(
                item.stock_id,
                item.qty,
                business_id,
            )

            # -----------------------------------------------------
            # Record stock reversal
            # -----------------------------------------------------

            for movement in reversal_movements:
                self._stock_movement_repository.add(
                    movement
                )

        # ---------------------------------------------------------
        # STEP 3: CANCEL INVOICE
        # ---------------------------------------------------------

        invoice.status = "cancelled"
        invoice.updated_at = datetime.now(timezone.utc)

        return self._repository.update(
            invoice,
            business_id,
        )
    
    # ============================================================
    # Invoice number generation
    # ============================================================

    def _generate_invoice_number(
        self,
        business_id: uuid.UUID,
    ) -> str:

        invoices = self._repository.list_all(
            business_id
        )

        business = self._business_repository.get(
            business_id
        )

        if business is None:
            raise ValueError(
                "Business profile not found"
            )

        current_year = datetime.now().year

        prefix = (
            f"{business.invoice_prefix}"
            f"-{current_year}-"
        )

        numbers = []

        for invoice in invoices:
            if invoice.invoice_number.startswith(prefix):
                try:
                    numbers.append(
                        int(
                            invoice.invoice_number[
                                len(prefix):
                            ]
                        )
                    )
                except ValueError:
                    continue

        next_number = max(
            numbers,
            default=0,
        ) + 1

        return (
            f"{prefix}"
            f"{next_number:06d}"
        )

