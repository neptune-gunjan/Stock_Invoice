"""Authentication request and response schemas."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100,
    )

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=72,
    )

    business_name: str = Field(
        min_length=2,
        max_length=200,
    )


class LoginRequest(BaseModel):
    email: EmailStr

    password: str = Field(
        min_length=1,
        max_length=72,
    )


class UserRead(BaseModel):
    id: uuid.UUID

    name: str
    email: EmailStr

    business_id: uuid.UUID | None = None

    is_active: bool

    model_config = {
        "from_attributes": True,
    }


class TokenResponse(BaseModel):
    access_token: str

    token_type: str = "bearer"

    user: UserRead