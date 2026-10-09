"""
Factory functions to instantiate repositories.

Now exclusively uses PostgreSQL implementations.
"""

from __future__ import annotations

from functools import lru_cache

from app.config import Settings, get_settings

# Core interfaces
from app.repositories.customer import CustomerRepository
from app.repositories.extraction import ExtractionRepository
from app.repositories.stock import StockRepository
from app.repositories.transaction import TransactionRepository
from app.repositories.stock_movement import StockMovementRepository
from app.repositories.invoice import InvoiceRepository
from app.repositories.payment import PaymentRepository
from app.repositories.business import BusinessRepository
from app.repositories.user import UserRepository
from app.repositories.password_reset import PasswordResetTokenRepository

# SQL Implementations
from app.repositories.stock_sql import SqlAlchemyStockRepository
from app.repositories.extraction_sql import SqlAlchemyExtractionRepository
from app.repositories.transaction_sql import SqlAlchemyTransactionRepository
from app.repositories.stock_movement_sql import SqlAlchemyStockMovementRepository
from app.repositories.invoice_sql import SqlAlchemyInvoiceRepository
from app.repositories.customer_sql import SqlAlchemyCustomerRepository
from app.repositories.payment_sql import SqlAlchemyPaymentRepository
from app.repositories.business_sql import SqlAlchemyBusinessRepository
from app.repositories.user_sql import SqlAlchemyUserRepository
from app.repositories.password_reset_sql import SqlAlchemyPasswordResetTokenRepository


@lru_cache
def get_stock_repository() -> StockRepository:
    return SqlAlchemyStockRepository()

@lru_cache
def get_extraction_repository() -> ExtractionRepository:
    return SqlAlchemyExtractionRepository()

@lru_cache
def get_invoice_repository() -> InvoiceRepository:
    return SqlAlchemyInvoiceRepository()

@lru_cache
def get_transaction_repository() -> TransactionRepository:
    return SqlAlchemyTransactionRepository()

@lru_cache
def get_stock_movement_repository() -> StockMovementRepository:
    return SqlAlchemyStockMovementRepository()

@lru_cache
def get_customer_repository() -> CustomerRepository:
    return SqlAlchemyCustomerRepository()

@lru_cache
def get_payment_repository() -> PaymentRepository:
    return SqlAlchemyPaymentRepository()

@lru_cache
def get_business_repository() -> BusinessRepository:
    return SqlAlchemyBusinessRepository()

@lru_cache
def get_user_repository() -> UserRepository:
    return SqlAlchemyUserRepository()

@lru_cache
def get_password_reset_repository() -> PasswordResetTokenRepository:
    return SqlAlchemyPasswordResetTokenRepository()
