"""Business/shop management endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.models.user import User
from app.repositories.business import BusinessRepository
from app.repositories.factory import (get_business_repository, get_user_repository)
from app.schemas.business import (
    BusinessCreate,
    BusinessResponse,
    BusinessUpdate,
)
from app.services.business_service import BusinessService
from app.repositories.user import UserRepository


router = APIRouter(
    prefix="/business",
    tags=["business"],
)


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


@router.get(
    "",
    response_model=BusinessResponse | None,
)
def get_business(
    service: BusinessService = Depends(get_business_service),
    current_user: User = Depends(get_current_user),
):
    return service.get_business(current_user.id)


@router.post(
    "",
    response_model=BusinessResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_business(
    data: BusinessCreate,
    service: BusinessService = Depends(get_business_service),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.create_business(
            data,
            current_user.id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.patch(
    "/{business_id}",
    response_model=BusinessResponse,
)
def update_business(
    business_id: uuid.UUID,
    data: BusinessUpdate,
    service: BusinessService = Depends(get_business_service),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.update_business(
            business_id,
            data,
            current_user.id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc