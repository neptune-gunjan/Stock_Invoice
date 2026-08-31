"""Dashboard API."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import (
    get_current_user,
    get_dashboard_service,
)
from app.models.user import User
from app.schemas.dashboard import (
    DashboardSummary,
    SalesData,
    RecentInvoiceRead,
    LowStockProductRead,
)
from app.services.dashboard_service import DashboardService


router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
)


@router.get(
    "",
    response_model=DashboardSummary,
)
def get_dashboard(
    service: DashboardService = Depends(
        get_dashboard_service
    ),
    current_user: User = Depends(
        get_current_user
    ),
) -> DashboardSummary:

    return service.get_summary(
        current_user.business_id
    )


@router.get(
    "/sales",
    response_model=list[SalesData],
)
def get_sales_overview(
    service: DashboardService = Depends(
        get_dashboard_service
    ),
    current_user: User = Depends(
        get_current_user
    ),
) -> list[SalesData]:

    return service.get_sales_overview(
        current_user.business_id
    )


@router.get(
    "/recent-invoices",
    response_model=list[RecentInvoiceRead],
)
def get_recent_invoices(
    service: DashboardService = Depends(
        get_dashboard_service
    ),
    current_user: User = Depends(
        get_current_user
    ),
) -> list[RecentInvoiceRead]:

    return service.get_recent_invoices(
        current_user.business_id
    )


@router.get(
    "/low-stock",
    response_model=list[LowStockProductRead],
)
def get_low_stock_products(
    service: DashboardService = Depends(
        get_dashboard_service
    ),
    current_user: User = Depends(
        get_current_user
    ),
) -> list[LowStockProductRead]:

    return service.get_low_stock_products(
        current_user.business_id
    )