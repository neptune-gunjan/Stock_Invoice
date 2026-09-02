"""FastAPI dependency wiring.

Routers depend on services and authentication dependencies.
Concrete repositories/providers remain hidden from the HTTP layer.
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings
from app.models.user import User
from app.repositories.business import BusinessRepository
from app.repositories.customer import CustomerRepository
from app.repositories.extraction import ExtractionRepository
from app.repositories.factory import (
    get_business_repository,
    get_customer_repository,
    get_extraction_repository,
    get_invoice_repository,
    get_payment_repository,
    get_stock_movement_repository,
    get_stock_repository,
    get_transaction_repository,
    get_user_repository,
)
from app.repositories.invoice import InvoiceRepository
from app.repositories.payment import PaymentRepository
from app.repositories.stock import StockRepository
from app.repositories.stock_movement import StockMovementRepository
from app.repositories.transaction import TransactionRepository
from app.repositories.user import UserRepository
from app.security import decode_access_token
from app.services.business_service import BusinessService
from app.services.customer_service import CustomerService
from app.services.extraction_providers.base import ExtractionProvider
from app.services.extraction_providers.factory import get_extraction_provider
from app.services.extraction_service import ExtractionService
from app.services.invoice_renderers.base import InvoiceRenderer
from app.services.invoice_renderers.factory import get_invoice_renderer
from app.services.invoice_service import InvoiceService
from app.services.matching_service import MatchingService
from app.services.payment_service import PaymentService
from app.services.stock_service import StockService
from app.services.transaction_service import TransactionService
from app.services.dashboard_service import DashboardService


# ============================================================
# Authentication
# ============================================================

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    repository: UserRepository = Depends(get_user_repository),
) -> User:

    try:
        user_id = decode_access_token(
            credentials.credentials
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        ) from exc

    user = repository.get(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    if user.business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with a business",
        )

    return user


# ============================================================
# Stock
# ============================================================

def get_stock_service(
    repository: StockRepository = Depends(
        get_stock_repository
    ),
) -> StockService:
    return StockService(repository)


# ============================================================
# Customer
# ============================================================

def get_customer_service(
    repository: CustomerRepository = Depends(
        get_customer_repository
    ),
) -> CustomerService:
    return CustomerService(repository)


# ============================================================
# Business
# ============================================================

def get_business_service(
    repository: BusinessRepository = Depends(
        get_business_repository
    ),
    user_repository: UserRepository = Depends(
        get_user_repository
    ),
) -> BusinessService:

    return BusinessService(
        repository,
        user_repository,
    )


# ============================================================
# Extraction
# ============================================================

def get_extraction_service(
    repository: ExtractionRepository = Depends(
        get_extraction_repository
    ),
    provider: ExtractionProvider = Depends(
        get_extraction_provider
    ),
    settings: Settings = Depends(
        get_settings
    ),
) -> ExtractionService:

    return ExtractionService(
        repository,
        provider,
        settings.upload_dir,
    )


# ============================================================
# Matching
# ============================================================

def get_matching_service(
    repository: ExtractionRepository = Depends(
        get_extraction_repository
    ),
    stock_service: StockService = Depends(
        get_stock_service
    ),
    settings: Settings = Depends(
        get_settings
    ),
) -> MatchingService:

    return MatchingService(
        repository,
        stock_service,
        settings.match_threshold,
    )


# ============================================================
# Transaction
# ============================================================

def get_transaction_service(
    repository: TransactionRepository = Depends(
        get_transaction_repository
    ),
    stock_service: StockService = Depends(
        get_stock_service
    ),
    customer_service: CustomerService = Depends(
        get_customer_service
    ),
    stock_movement_repository: StockMovementRepository = Depends(
        get_stock_movement_repository
    ),
    invoice_repository: InvoiceRepository = Depends(
        get_invoice_repository
    ),
) -> TransactionService:

    return TransactionService(
        repository,
        stock_service,
        customer_service,
        stock_movement_repository,
        invoice_repository,
    )


# ============================================================
# Invoice
# ============================================================

def get_invoice_service(
    transaction_service: TransactionService = Depends(
        get_transaction_service
    ),
    customer_service: CustomerService = Depends(
        get_customer_service
    ),
    business_repository: BusinessRepository = Depends(
        get_business_repository
    ),
    repository: InvoiceRepository = Depends(
        get_invoice_repository
    ),
    payment_repository: PaymentRepository = Depends(
        get_payment_repository
    ),
    renderer: InvoiceRenderer = Depends(
        get_invoice_renderer
    ),
    settings: Settings = Depends(
        get_settings
    ),
) -> InvoiceService:

    return InvoiceService(
        transaction_service,
        customer_service,
        business_repository,
        repository,
        payment_repository,
        renderer,
        settings,
    )


# ============================================================
# Payment
# ============================================================

def get_payment_service(
    payment_repository: PaymentRepository = Depends(
        get_payment_repository
    ),
    invoice_repository: InvoiceRepository = Depends(
        get_invoice_repository
    ),
) -> PaymentService:

    return PaymentService(
        payment_repository,
        invoice_repository,
    )

# ============================================================
# Dashboard
# ============================================================

def get_dashboard_service(
    invoice_repository: InvoiceRepository = Depends(
        get_invoice_repository
    ),
    stock_repository: StockRepository = Depends(
        get_stock_repository
    ),
    customer_repository: CustomerRepository = Depends(
        get_customer_repository
    ),
    payment_repository: PaymentRepository = Depends(
        get_payment_repository
    ),
) -> DashboardService:

    return DashboardService(
        invoice_repository,
        stock_repository,
        customer_repository,
        payment_repository,
    )