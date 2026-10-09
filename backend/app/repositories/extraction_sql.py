import uuid
from typing import Optional
from datetime import datetime, timezone
from app.repositories.extraction import ExtractionRepository
from app.models.extraction import ExtractedItem, ExtractionJob
from app.models.sql import SqlExtractionJob, SqlExtractedItem
from app.db import SessionLocal

def utcnow():
    return datetime.now(timezone.utc)

class SqlAlchemyExtractionRepository(ExtractionRepository):
    def _to_pydantic_job(self, row: SqlExtractionJob) -> ExtractionJob:
        return ExtractionJob(
            id=row.id,
            image_path=row.image_path,
            raw_llm_output=row.raw_llm_output,
            status=row.status,
            error_message=row.error_message,
            created_at=row.created_at
        )

    def _to_pydantic_item(self, row: SqlExtractedItem) -> ExtractedItem:
        return ExtractedItem(
            id=row.id,
            extraction_job_id=row.extraction_job_id,
            raw_text=row.raw_text,
            qty=row.qty,
            unit=row.unit,
            matched_stock_id=row.matched_stock_id,
            confidence_score=row.confidence_score,
            needs_review=row.needs_review,
            created_at=row.created_at
        )

    def add_job(self, job: ExtractionJob) -> ExtractionJob:
        with SessionLocal() as session:
            sql_job = SqlExtractionJob(
                id=job.id,
                image_path=job.image_path,
                raw_llm_output=job.raw_llm_output,
                status=job.status,
                error_message=job.error_message,
                created_at=job.created_at
            )
            session.add(sql_job)
            session.commit()
            return job

    def get_job(self, job_id: uuid.UUID) -> Optional[ExtractionJob]:
        with SessionLocal() as session:
            row = session.query(SqlExtractionJob).filter(SqlExtractionJob.id == job_id).first()
            return self._to_pydantic_job(row) if row else None

    def update_job(self, job: ExtractionJob) -> ExtractionJob:
        with SessionLocal() as session:
            row = session.query(SqlExtractionJob).filter(SqlExtractionJob.id == job.id).first()
            if row:
                row.image_path = job.image_path
                row.raw_llm_output = job.raw_llm_output
                row.status = job.status
                row.error_message = job.error_message
                session.commit()
            return job

    def add_items(self, items: list[ExtractedItem]) -> list[ExtractedItem]:
        if not items:
            return []
        with SessionLocal() as session:
            for item in items:
                sql_item = SqlExtractedItem(
                    id=item.id,
                    extraction_job_id=item.extraction_job_id,
                    raw_text=item.raw_text,
                    qty=item.qty,
                    unit=item.unit,
                    matched_stock_id=item.matched_stock_id,
                    confidence_score=item.confidence_score,
                    needs_review=item.needs_review,
                    created_at=item.created_at
                )
                session.add(sql_item)
            session.commit()
            return items

    def list_items(self, job_id: uuid.UUID) -> list[ExtractedItem]:
        with SessionLocal() as session:
            rows = session.query(SqlExtractedItem).filter(SqlExtractedItem.extraction_job_id == job_id).all()
            return [self._to_pydantic_item(r) for r in rows]

    def get_item(self, item_id: uuid.UUID) -> Optional[ExtractedItem]:
        with SessionLocal() as session:
            row = session.query(SqlExtractedItem).filter(SqlExtractedItem.id == item_id).first()
            return self._to_pydantic_item(row) if row else None

    def update_item(self, item: ExtractedItem) -> ExtractedItem:
        with SessionLocal() as session:
            row = session.query(SqlExtractedItem).filter(SqlExtractedItem.id == item.id).first()
            if row:
                row.raw_text = item.raw_text
                row.qty = item.qty
                row.unit = item.unit
                row.matched_stock_id = item.matched_stock_id
                row.confidence_score = item.confidence_score
                row.needs_review = item.needs_review
                session.commit()
            return item

    def replace_items(self, job_id: uuid.UUID, items: list[ExtractedItem]) -> list[ExtractedItem]:
        with SessionLocal() as session:
            session.query(SqlExtractedItem).filter(SqlExtractedItem.extraction_job_id == job_id).delete()
            for item in items:
                sql_item = SqlExtractedItem(
                    id=item.id,
                    extraction_job_id=item.extraction_job_id,
                    raw_text=item.raw_text,
                    qty=item.qty,
                    unit=item.unit,
                    matched_stock_id=item.matched_stock_id,
                    confidence_score=item.confidence_score,
                    needs_review=item.needs_review,
                    created_at=item.created_at
                )
                session.add(sql_item)
            session.commit()
            return items
