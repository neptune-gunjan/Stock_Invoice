from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date

from app.repositories.invoice import InvoiceRepository
from app.repositories.stock import StockRepository
from app.repositories.customer import CustomerRepository
from app.repositories.payment import PaymentRepository
from app.schemas.dashboard import (DashboardSummary, SalesData, RecentInvoiceRead, LowStockProductRead,)


class DashboardService:

    def __init__(
        self,
        invoice_repository: InvoiceRepository,
        stock_repository: StockRepository,
        customer_repository: CustomerRepository,
        payment_repository: PaymentRepository,
    ) -> None:
        self._invoice_repository = invoice_repository
        self._stock_repository = stock_repository
        self._customer_repository = customer_repository
        self._payment_repository = payment_repository

    def get_summary(
        self,
        business_id: uuid.UUID,
    ) -> DashboardSummary:

        invoices = self._invoice_repository.list_all(
            business_id
        )

        stock_items = self._stock_repository.list_active(
            business_id
        )

        customers = self._customer_repository.list_active(
            business_id
        )

        total_sales = sum(
            invoice.total_amount
            for invoice in invoices
        )

        total_paid = 0.0

        for invoice in invoices:
            payments = self._payment_repository.list_by_invoice(
                invoice.id
            )

            total_paid += sum(
                payment.amount
                for payment in payments
            )

        outstanding_amount = max(
            total_sales - total_paid,
            0,
        )

        low_stock_products = sum(
            1
            for item in stock_items
            if item.quantity_available
            <= item.low_stock_threshold
        )

        return DashboardSummary(
            total_sales=total_sales,
            total_invoices=len(invoices),
            total_paid=total_paid,
            outstanding_amount=outstanding_amount,
            total_customers=len(customers),
            total_products=len(stock_items),
            low_stock_products=low_stock_products,
        )


    def get_sales_overview(
        self,
        business_id: uuid.UUID,
    ) -> list[SalesData]:

        invoices = self._invoice_repository.list_all(
            business_id
        )

        sales_by_date: dict[date, float] = defaultdict(float)
        invoice_count_by_date: dict[date, int] = defaultdict(int)

        for invoice in invoices:
            invoice_date = invoice.created_at.date()

            sales_by_date[invoice_date] += float(
                invoice.total_amount
            )

            invoice_count_by_date[invoice_date] += 1

        return [
            SalesData(
                date=invoice_date,
                sales=sales_by_date[invoice_date],
                invoice_count=invoice_count_by_date[invoice_date],
            )
            for invoice_date in sorted(sales_by_date)
        ]


    def get_recent_invoices(
        self,
        business_id: uuid.UUID,
        limit: int = 5,
    ) -> list[RecentInvoiceRead]:

        invoices = self._invoice_repository.list_all(
            business_id
        )

        invoices = sorted(
            invoices,
            key=lambda invoice: invoice.created_at,
            reverse=True,
        )

        result = []

        for invoice in invoices[:limit]:

            customer_name = None

            if invoice.customer_id is not None:
                customer = self._customer_repository.get(
                    invoice.customer_id
                )

                if customer is not None:
                    customer_name = customer.name

            result.append(
                RecentInvoiceRead(
                    id=str(invoice.id),
                    invoice_number=invoice.invoice_number,
                    customer_name=customer_name,
                    total_amount=float(invoice.total_amount),
                    payment_status=invoice.payment_status,
                    created_at=invoice.created_at.isoformat(),
                )
            )

        return result


    def get_low_stock_products(
        self,
        business_id: uuid.UUID,
    ) -> list[LowStockProductRead]:

        stock_items = self._stock_repository.list_active(
            business_id
        )

        low_stock_items = [
            item
            for item in stock_items
            if item.quantity_available
            <= item.low_stock_threshold
        ]

        return [
            LowStockProductRead(
                id=str(item.id),
                name=item.name,
                sku=item.sku,
                unit=item.unit,
                quantity_available=float(
                    item.quantity_available
                ),
                low_stock_threshold=float(
                    item.low_stock_threshold
                ),
            )
            for item in low_stock_items
        ]