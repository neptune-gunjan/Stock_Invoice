"""JSON-backed repository implementation for users."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from app.models.user import User
from app.repositories.json_store import JsonCollection
from app.repositories.user import UserRepository


class JsonFileUserRepository(UserRepository):

    def __init__(self, data_file) -> None:
        self._collection = JsonCollection[User](
            data_file,
            User,
        )

    def get(self, user_id: uuid.UUID) -> Optional[User]:
        with self._collection.lock:
            users = self._collection.read_all()

            for user in users:
                if (
                    user.id == user_id
                    and user.is_active
                    and user.deleted_at is None
                ):
                    return user

        return None

    def get_by_email(self, email: str) -> Optional[User]:
        normalized_email = email.strip().lower()

        with self._collection.lock:
            users = self._collection.read_all()

            for user in users:
                if (
                    user.email.strip().lower() == normalized_email
                    and user.is_active
                    and user.deleted_at is None
                ):
                    return user

        return None

    def add(self, user: User) -> User:
        with self._collection.lock:
            users = self._collection.read_all()

            users.append(user)

            self._collection.write_all(users)

        return user

    def update(self, user: User) -> User:
        with self._collection.lock:
            users = self._collection.read_all()

            for index, existing in enumerate(users):
                if existing.id == user.id:
                    users[index] = user
                    self._collection.write_all(users)
                    return user

        raise ValueError(f"User not found: {user.id}")


    def delete(self, user_id: uuid.UUID) -> bool:
        with self._collection.lock:
            users = self._collection.read_all()

            for index, user in enumerate(users):
                if user.id == user_id and user.is_active:
                    now = datetime.now(timezone.utc)

                    user.is_active = False
                    user.deleted_at = now
                    user.updated_at = now

                    users[index] = user
                    self._collection.write_all(users)

                    return True

        return False