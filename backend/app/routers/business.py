"""Business/shop management endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.repositories.factory import get_business_repository
from app.repositories.business import BusinessRepository
from app.schemas.business import (
    BusinessCreate,
    BusinessResponse,
    BusinessUpdate,
)
from app.services.business_service import BusinessService


router = APIRouter(
    prefix="/business",
    tags=["business"],
)


def get_business_service(
    repository: BusinessRepository = Depends(get_business_repository),
) -> BusinessService:
    return BusinessService(repository)


@router.get(
    "",
    response_model=BusinessResponse | None,
)
def get_business(
    service: BusinessService = Depends(get_business_service),
):
    return service.get_business()


@router.post(
    "",
    response_model=BusinessResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_business(
    data: BusinessCreate,
    service: BusinessService = Depends(get_business_service),
):
    try:
        return service.create_business(data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )


@router.patch(
    "/{business_id}",
    response_model=BusinessResponse,
)
def update_business(
    business_id: uuid.UUID,
    data: BusinessUpdate,
    service: BusinessService = Depends(get_business_service),
):
    try:
        return service.update_business(
            business_id,
            data,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )