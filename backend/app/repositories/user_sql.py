import uuid
from typing import Optional
from datetime import datetime, timezone
from app.repositories.user import UserRepository
from app.models.user import User
from app.models.sql import SqlUser
from app.db import SessionLocal

def utcnow():
    return datetime.now(timezone.utc)

class SqlAlchemyUserRepository(UserRepository):
    def _to_pydantic(self, row: SqlUser) -> User:
        return User(
            id=row.id,
            business_id=row.business_id,
            name=row.name,
            email=row.email,
            password_hash=row.password_hash,
            is_active=row.is_active,
            created_at=row.created_at,
            updated_at=row.updated_at,
            deleted_at=row.deleted_at
        )

    def _to_sql(self, user: User) -> SqlUser:
        return SqlUser(
            id=user.id,
            business_id=user.business_id,
            name=user.name,
            email=user.email,
            password_hash=user.password_hash,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
            deleted_at=user.deleted_at
        )

    def get(self, user_id: uuid.UUID) -> Optional[User]:
        with SessionLocal() as session:
            row = session.query(SqlUser).filter(SqlUser.id == user_id).first()
            return self._to_pydantic(row) if row else None

    def get_by_email(self, email: str) -> Optional[User]:
        with SessionLocal() as session:
            row = session.query(SqlUser).filter(SqlUser.email == email).first()
            return self._to_pydantic(row) if row else None

    def add(self, user: User) -> User:
        with SessionLocal() as session:
            row = self._to_sql(user)
            session.add(row)
            session.commit()
            return user

    def update(self, user: User) -> User:
        with SessionLocal() as session:
            row = session.query(SqlUser).filter(SqlUser.id == user.id).first()
            if row:
                row.business_id = user.business_id
                row.name = user.name
                row.email = user.email
                row.password_hash = user.password_hash
                row.is_active = user.is_active
                row.updated_at = utcnow()
                row.deleted_at = user.deleted_at
                session.commit()
            return user

    def delete(self, user_id: uuid.UUID) -> bool:
        with SessionLocal() as session:
            row = session.query(SqlUser).filter(SqlUser.id == user_id).first()
            if row and row.deleted_at is None:
                row.deleted_at = utcnow()
                session.commit()
                return True
            return False
