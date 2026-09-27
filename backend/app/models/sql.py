from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone

from app.db import Base

def utcnow():
    return datetime.now(timezone.utc)

class SqlStockItem(Base):
    __tablename__ = "stock_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    name = Column(String, index=True, nullable=False)
    sku = Column(String, index=True, nullable=True)
    aliases = Column(JSON, default=list)
    unit = Column(String, nullable=False)
    unit_price = Column(Float, nullable=False)
    quantity_available = Column(Float, nullable=False)
    low_stock_threshold = Column(Float, default=0)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

class SqlCustomer(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    name = Column(String, index=True, nullable=False)
    phone = Column(String, index=True, nullable=True)
    business_name = Column(String, nullable=True)
    address = Column(String, nullable=True)
    gst_number = Column(String, nullable=True)
    credit_limit = Column(Float, default=0)
    payment_terms_days = Column(Float, default=0)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

# Note: We will add Transaction, Invoice, User, and Business tables here next.

class SqlBusiness(Base):
    __tablename__ = "businesses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    business_name = Column(String, nullable=False)
    owner_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    gst_number = Column(String, nullable=True)
    upi_vpa = Column(String, nullable=True)
    invoice_prefix = Column(String, default="INV")
    logo_path = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

class SqlTransaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)
    status = Column(String, nullable=False, default="confirmed")
    subtotal = Column(Float, nullable=False, default=0)
    discount = Column(Float, nullable=False, default=0)
    tax = Column(Float, nullable=False, default=0)
    total_amount = Column(Float, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

class SqlTransactionItem(Base):
    __tablename__ = "transaction_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=False)
    stock_id = Column(UUID(as_uuid=True), ForeignKey("stock_items.id"), nullable=False)
    stock_name = Column(String, nullable=False)
    unit = Column(String, nullable=False)
    qty = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    line_total = Column(Float, nullable=False)

class SqlInvoice(Base):
    __tablename__ = "invoices"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    invoice_number = Column(String, index=True, nullable=False)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)
    subtotal = Column(Float, nullable=False, default=0)
    discount = Column(Float, nullable=False, default=0)
    tax_rate = Column(Float, nullable=False, default=0)
    tax_amount = Column(Float, nullable=False, default=0)
    total_amount = Column(Float, nullable=False, default=0)
    status = Column(String, nullable=False, default="issued")
    payment_status = Column(String, nullable=False, default="pending")
    payment_method = Column(String, nullable=True)
    pdf_path = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    deleted_at = Column(DateTime(timezone=True), nullable=True)


class SqlUser(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

class SqlPayment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String, nullable=False)
    paid_at = Column(DateTime(timezone=True), default=utcnow)
    reference_number = Column(String, nullable=True)

class SqlStockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stock_id = Column(UUID(as_uuid=True), ForeignKey("stock_items.id"), nullable=False)
    movement_type = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    quantity_before = Column(Float, nullable=False)
    quantity_after = Column(Float, nullable=False)
    reference_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class SqlPasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token_hash = Column(String, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class SqlExtractionJob(Base):
    __tablename__ = "extraction_jobs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    image_path = Column(String, nullable=False)
    raw_llm_output = Column(String, nullable=True)
    status = Column(String, default="pending")
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class SqlExtractedItem(Base):
    __tablename__ = "extracted_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    extraction_job_id = Column(UUID(as_uuid=True), ForeignKey("extraction_jobs.id"), nullable=False)
    raw_text = Column(String, nullable=False)
    qty = Column(Float, nullable=True)
    unit = Column(String, nullable=True)
    matched_stock_id = Column(UUID(as_uuid=True), ForeignKey("stock_items.id"), nullable=True)
    confidence_score = Column(Float, nullable=True)
    needs_review = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
