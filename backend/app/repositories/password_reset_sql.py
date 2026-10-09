import uuid
from typing import Optional
from datetime import datetime, timezone
from app.repositories.password_reset import PasswordResetTokenRepository
from app.models.password_reset import PasswordResetToken
from app.models.sql import SqlPasswordResetToken
from app.db import SessionLocal

def utcnow():
    return datetime.now(timezone.utc)

class SqlAlchemyPasswordResetTokenRepository(PasswordResetTokenRepository):
    def _to_pydantic(self, row: SqlPasswordResetToken) -> PasswordResetToken:
        return PasswordResetToken(
            id=row.id,
            user_id=row.user_id,
            token_hash=row.token_hash,
            expires_at=row.expires_at,
            used=row.used,
            created_at=row.created_at
        )

    def get_by_token_hash(self, token_hash: str) -> Optional[PasswordResetToken]:
        with SessionLocal() as session:
            row = session.query(SqlPasswordResetToken).filter(
                SqlPasswordResetToken.token_hash == token_hash,
                SqlPasswordResetToken.used == False
            ).first()
            return self._to_pydantic(row) if row else None

    def add(self, token: PasswordResetToken) -> PasswordResetToken:
        with SessionLocal() as session:
            row = SqlPasswordResetToken(
                id=token.id,
                user_id=token.user_id,
                token_hash=token.token_hash,
                expires_at=token.expires_at,
                used=token.used,
                created_at=token.created_at
            )
            session.add(row)
            session.commit()
            return token

    def update(self, token: PasswordResetToken) -> PasswordResetToken:
        with SessionLocal() as session:
            row = session.query(SqlPasswordResetToken).filter(SqlPasswordResetToken.id == token.id).first()
            if row:
                row.used = token.used
                session.commit()
            return token

    def invalidate_for_user(self, user_id: uuid.UUID) -> None:
        with SessionLocal() as session:
            rows = session.query(SqlPasswordResetToken).filter(
                SqlPasswordResetToken.user_id == user_id,
                SqlPasswordResetToken.used == False
            ).all()
            for row in rows:
                row.used = True
            session.commit()
