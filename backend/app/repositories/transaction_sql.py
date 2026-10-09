import uuid
from typing import Optional
from datetime import datetime, timezone
from app.repositories.transaction import TransactionRepository
from app.models.transaction import Transaction, TransactionItem
from app.models.sql import SqlTransaction, SqlTransactionItem
from app.db import SessionLocal

def utcnow():
    return datetime.now(timezone.utc)

class SqlAlchemyTransactionRepository(TransactionRepository):
    def _to_pydantic_tx(self, row: SqlTransaction) -> Transaction:
        return Transaction(
            id=row.id,
            business_id=row.business_id,
            customer_id=row.customer_id,
            status=row.status,
            subtotal=row.subtotal,
            discount=row.discount,
            tax=row.tax,
            total_amount=row.total_amount,
            created_at=row.created_at,
            deleted_at=row.deleted_at
        )

    def _to_pydantic_item(self, row: SqlTransactionItem) -> TransactionItem:
        return TransactionItem(
            id=row.id,
            transaction_id=row.transaction_id,
            stock_id=row.stock_id,
            stock_name=row.stock_name,
            unit=row.unit,
            qty=row.qty,
            unit_price=row.unit_price,
            line_total=row.line_total
        )

    def add(self, transaction: Transaction, items: list[TransactionItem]) -> Transaction:
        with SessionLocal() as session:
            sql_tx = SqlTransaction(
                id=transaction.id,
                business_id=transaction.business_id,
                customer_id=transaction.customer_id,
                status=transaction.status,
                subtotal=transaction.subtotal,
                discount=transaction.discount,
                tax=transaction.tax,
                total_amount=transaction.total_amount,
                created_at=transaction.created_at,
                deleted_at=transaction.deleted_at
            )
            session.add(sql_tx)
            
            for item in items:
                sql_item = SqlTransactionItem(
                    id=item.id,
                    transaction_id=item.transaction_id,
                    stock_id=item.stock_id,
                    stock_name=item.stock_name,
                    unit=item.unit,
                    qty=item.qty,
                    unit_price=item.unit_price,
                    line_total=item.line_total
                )
                session.add(sql_item)
            
            session.commit()
            return transaction

    def get(self, transaction_id: uuid.UUID, business_id: uuid.UUID) -> Optional[Transaction]:
        with SessionLocal() as session:
            row = session.query(SqlTransaction).filter(
                SqlTransaction.id == transaction_id,
                SqlTransaction.business_id == business_id
            ).first()
            return self._to_pydantic_tx(row) if row else None

    def list_items(self, transaction_id: uuid.UUID, business_id: uuid.UUID) -> list[TransactionItem]:
        with SessionLocal() as session:
            rows = session.query(SqlTransactionItem).filter(
                SqlTransactionItem.transaction_id == transaction_id
            ).all()
            return [self._to_pydantic_item(r) for r in rows]

    def list_all(self, business_id: uuid.UUID) -> list[Transaction]:
        with SessionLocal() as session:
            rows = session.query(SqlTransaction).filter(
                SqlTransaction.business_id == business_id,
                SqlTransaction.deleted_at.is_(None)
            ).all()
            return [self._to_pydantic_tx(r) for r in rows]

    def list_by_customer(self, customer_id: uuid.UUID, business_id: uuid.UUID) -> list[Transaction]:
        with SessionLocal() as session:
            rows = session.query(SqlTransaction).filter(
                SqlTransaction.customer_id == customer_id,
                SqlTransaction.business_id == business_id,
                SqlTransaction.deleted_at.is_(None)
            ).all()
            return [self._to_pydantic_tx(r) for r in rows]

