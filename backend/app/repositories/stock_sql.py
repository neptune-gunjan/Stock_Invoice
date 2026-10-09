import uuid
from typing import Optional
from app.repositories.stock import StockRepository
from app.models.stock import StockItem, utcnow
from app.models.sql import SqlStockItem
from app.db import SessionLocal

class SqlAlchemyStockRepository(StockRepository):
    def _to_pydantic(self, row: SqlStockItem) -> StockItem:
        return StockItem(
            id=row.id,
            business_id=row.business_id,
            name=row.name,
            sku=row.sku,
            aliases=row.aliases or [],
            unit=row.unit,
            unit_price=row.unit_price,
            quantity_available=row.quantity_available,
            low_stock_threshold=row.low_stock_threshold,
            created_at=row.created_at,
            updated_at=row.updated_at,
            deleted_at=row.deleted_at
        )

    def _to_sql(self, item: StockItem) -> SqlStockItem:
        return SqlStockItem(
            id=item.id,
            business_id=item.business_id,
            name=item.name,
            sku=item.sku,
            aliases=item.aliases,
            unit=item.unit,
            unit_price=item.unit_price,
            quantity_available=item.quantity_available,
            low_stock_threshold=item.low_stock_threshold,
            created_at=item.created_at,
            updated_at=item.updated_at,
            deleted_at=item.deleted_at
        )

    def list_active(self, business_id: uuid.UUID) -> list[StockItem]:
        with SessionLocal() as session:
            rows = session.query(SqlStockItem).filter(
                SqlStockItem.business_id == business_id,
                SqlStockItem.deleted_at.is_(None)
            ).all()
            return [self._to_pydantic(r) for r in rows]

    def get(self, item_id: uuid.UUID) -> Optional[StockItem]:
        with SessionLocal() as session:
            row = session.query(SqlStockItem).filter(SqlStockItem.id == item_id).first()
            return self._to_pydantic(row) if row else None

    def add(self, item: StockItem) -> StockItem:
        with SessionLocal() as session:
            row = self._to_sql(item)
            session.add(row)
            session.commit()
            return item

    def update(self, item: StockItem) -> StockItem:
        with SessionLocal() as session:
            row = session.query(SqlStockItem).filter(SqlStockItem.id == item.id).first()
            if row:
                row.name = item.name
                row.sku = item.sku
                row.aliases = item.aliases
                row.unit = item.unit
                row.unit_price = item.unit_price
                row.quantity_available = item.quantity_available
                row.low_stock_threshold = item.low_stock_threshold
                row.updated_at = utcnow()
                row.deleted_at = item.deleted_at
                session.commit()
            return item

    def soft_delete(self, item_id: uuid.UUID) -> bool:
        with SessionLocal() as session:
            row = session.query(SqlStockItem).filter(SqlStockItem.id == item_id).first()
            if row and row.deleted_at is None:
                row.deleted_at = utcnow()
                session.commit()
                return True
            return False
