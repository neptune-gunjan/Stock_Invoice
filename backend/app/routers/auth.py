"""Authentication API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status


import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from app.models.password_reset import PasswordResetToken
from app.repositories.password_reset import PasswordResetTokenRepository
from app.services.email_service import send_password_reset_email
from app.dependencies import get_current_user
from app.models.user import User
from app.repositories.business import BusinessRepository
from app.repositories.factory import (
    get_business_repository,
    get_password_reset_repository,
    get_user_repository,
)
from app.repositories.user import UserRepository
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
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


@router.post(
    "/forgot-password",
)
def forgot_password(
    data: ForgotPasswordRequest,
    user_repository: UserRepository = Depends(
        get_user_repository
    ),
    password_reset_repository: PasswordResetTokenRepository = Depends(
        get_password_reset_repository
    ),
) -> dict[str, str]:

    user = user_repository.get_by_email(
        data.email
    )

    # Always return the same response whether the email exists
    # or not. This prevents account enumeration.
    if user is None:
        return {
            "message": (
                "If an account exists with this email, "
                "a password reset link has been sent."
            )
        }

    # Invalidate any previous unused reset tokens.
    password_reset_repository.invalidate_for_user(
        user.id
    )

    # Generate a cryptographically secure random token.
    raw_token = secrets.token_urlsafe(48)

    # Only store the hash, never the raw token.
    token_hash = hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()

    now = datetime.now(timezone.utc)

    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=now + timedelta(minutes=30),
        created_at=now,
    )

    password_reset_repository.add(
        reset_token
    )

    try:
        send_password_reset_email(
            recipient_email=user.email,
            reset_token=raw_token,
        )
    except Exception as exc:
        # Do not leave a valid reset token behind if the email
        # could not be sent.
        password_reset_repository.invalidate_for_user(
            user.id
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to send password reset email.",
        ) from exc

    return {
        "message": (
            "If an account exists with this email, "
            "a password reset link has been sent."
        )
    }


@router.post(
    "/reset-password",
)
def reset_password(
    data: ResetPasswordRequest,
    user_repository: UserRepository = Depends(
        get_user_repository
    ),
    password_reset_repository: PasswordResetTokenRepository = Depends(
        get_password_reset_repository
    ),
) -> dict[str, str]:

    token_hash = hashlib.sha256(
        data.token.encode("utf-8")
    ).hexdigest()

    reset_token = password_reset_repository.get_by_token_hash(
        token_hash
    )

    if reset_token is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link.",
        )

    now = datetime.now(timezone.utc)

    if reset_token.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link.",
        )

    user = user_repository.get(
        reset_token.user_id
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link.",
        )

    try:
        new_password_hash = hash_password(
            data.password
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    user.password_hash = new_password_hash
    user.updated_at = now

    user_repository.update(user)

    # One-time use.
    reset_token.used_at = now

    password_reset_repository.update(
        reset_token
    )

    return {
        "message": "Password has been reset successfully."
    }

