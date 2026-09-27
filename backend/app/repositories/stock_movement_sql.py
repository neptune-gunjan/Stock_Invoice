import uuid
from typing import Optional
from datetime import datetime, timezone
from app.repositories.stock_movement import StockMovementRepository
from app.models.stock_movement import StockMovement
from app.models.sql import SqlStockMovement
from app.db import SessionLocal

def utcnow():
    return datetime.now(timezone.utc)

class SqlAlchemyStockMovementRepository(StockMovementRepository):
    def _to_pydantic(self, row: SqlStockMovement) -> StockMovement:
        return StockMovement(
            id=row.id,
            stock_id=row.stock_id,
            movement_type=row.movement_type,
            quantity=row.quantity,
            quantity_before=row.quantity_before,
            quantity_after=row.quantity_after,
            reference_id=row.reference_id,
            created_at=row.created_at
        )

    def add(self, movement: StockMovement) -> StockMovement:
        with SessionLocal() as session:
            row = SqlStockMovement(
                id=movement.id,
                stock_id=movement.stock_id,
                movement_type=movement.movement_type,
                quantity=movement.quantity,
                quantity_before=movement.quantity_before,
                quantity_after=movement.quantity_after,
                reference_id=movement.reference_id,
                created_at=movement.created_at
            )
            session.add(row)
            session.commit()
            return movement

    def list_by_stock(self, stock_id: uuid.UUID) -> list[StockMovement]:
        with SessionLocal() as session:
            rows = session.query(SqlStockMovement).filter(
                SqlStockMovement.stock_id == stock_id
            ).all()
            return [self._to_pydantic(r) for r in rows]

    def list_all(self) -> list[StockMovement]:
        with SessionLocal() as session:
            rows = session.query(SqlStockMovement).all()
            return [self._to_pydantic(r) for r in rows]

    def list_recent(
        self,
        business_id: uuid.UUID,
        limit: int = 50,
    ) -> list[StockMovement]:
        # SqlStockMovement model belongs to a stock_item, so we join stock_items to filter by business_id
        from app.models.sql import SqlStockItem
        with SessionLocal() as session:
            rows = session.query(SqlStockMovement).join(SqlStockItem).filter(
                SqlStockItem.business_id == business_id
            ).order_by(SqlStockMovement.created_at.desc()).limit(limit).all()
            return [self._to_pydantic(r) for r in rows]
