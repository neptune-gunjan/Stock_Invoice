"""Authentication API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.models.user import User
from app.repositories.business import BusinessRepository
from app.repositories.factory import (
    get_business_repository,
    get_user_repository,
)
from app.repositories.user import UserRepository
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserRead,
)
from app.security import (
    create_access_token,
    hash_password,
    verify_password,
)


router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
)


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
def register(
    data: RegisterRequest,
    user_repository: UserRepository = Depends(
        get_user_repository
    ),
    business_repository: BusinessRepository = Depends(
        get_business_repository
    ),
) -> UserRead:

    # 1. Check existing user
    existing_user = user_repository.get_by_email(
        data.email
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    # 2. Hash password
    try:
        password_hash = hash_password(data.password)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # 3. Create IDs
    import uuid
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    business_id = uuid.uuid4()
    user_id = uuid.uuid4()

    # 4. Create business
    from app.models.business import Business

    business = Business(
        id=business_id,
        owner_user_id=user_id,
        business_name=data.business_name.strip(),
        owner_name=data.name.strip(),
        is_active=True,
        created_at=now,
        updated_at=now,
    )

    business_repository.add(business)

    # 5. Create user
    user = User(
        id=user_id,
        business_id=business_id,
        name=data.name.strip(),
        email=data.email.strip().lower(),
        password_hash=password_hash,
        is_active=True,
        created_at=now,
        updated_at=now,
    )

    user_repository.add(user)

    return UserRead.model_validate(
        user,
        from_attributes=True,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    data: LoginRequest,
    repository: UserRepository = Depends(
        get_user_repository
    ),
) -> TokenResponse:

    user = repository.get_by_email(
        data.email
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    if not verify_password(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    access_token = create_access_token(
        user.id
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserRead,
)
def get_me(
    current_user: User = Depends(
        get_current_user
    ),
) -> UserRead:

    return UserRead.model_validate(
        current_user
    )