"""Persistence contract for users."""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional

from app.models.user import User


class UserRepository(ABC):

    @abstractmethod
    def get(self, user_id: uuid.UUID) -> Optional[User]:
        ...

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[User]:
        ...

    @abstractmethod
    def add(self, user: User) -> User:
        ...

    @abstractmethod
    def update(self, user: User) -> User:
        ...

    @abstractmethod
    def delete(self, user_id: uuid.UUID) -> bool:
        ...