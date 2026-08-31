from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_sales: float
    total_invoices: int
    total_paid: float
    outstanding_amount: float

    total_customers: int
    total_products: int
    low_stock_products: int


class SalesData(BaseModel):
    date: date
    sales: Decimal
    invoice_count: int


class RecentInvoiceRead(BaseModel):
    id: str
    invoice_number: str
    customer_name: str | None
    total_amount: float
    payment_status: str
    created_at: str

class LowStockProductRead(BaseModel):
    id: str
    name: str
    sku: str
    unit: str
    quantity_available: float
    low_stock_threshold: float