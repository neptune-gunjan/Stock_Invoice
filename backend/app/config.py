"""
App-wide settings, loaded from environment variables / .env.

Nothing outside this module should read os.environ directly -- routers,
services, and repositories all take their configuration through Settings
so behavior stays testable and swappable (e.g. pointing tests at a temp
JSON file, or later switching stock_storage_backend to "postgres").
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Which repository implementation to use per entity. See
    # app/repositories/factory.py -- adding a new backend means adding a new
    # value here and a matching branch there, nothing else.
    stock_storage_backend: str = "json_file"
    stock_data_file: Path = Path("data/stock.json")

    extraction_storage_backend: str = "json_file"
    extraction_jobs_data_file: Path = Path("data/extraction_jobs.json")
    extracted_items_data_file: Path = Path("data/extracted_items.json")

    customer_storage_backend: str = "json_file"
    customer_data_file: Path = Path("data/customers.json")

    transaction_storage_backend: str = "json_file"
    transaction_data_file: Path = Path("data/transactions.json")
    transaction_items_data_file: Path = Path("data/transaction_items.json")

    invoice_storage_backend: str = "json_file"
    invoice_data_file: Path = Path("data/invoices.json")
    # invoice_number_prefix: str = "INV"

    payment_storage_backend: str = "json_file"
    payment_data_file: Path = Path("data/payments.json")

    stock_movement_storage_backend: str = "json_file"
    stock_movement_data_file: Path = Path("data/stock_movements.json")

    user_storage_backend: str = "json_file"
    user_data_file: Path = Path("data/users.json")

    business_storage_backend: str = "json_file"
    business_data_file: Path = Path("data/business.json")


    password_reset_data_file: Path = Path(
        "data/password_reset_tokens.json"
    )


    upload_dir: Path = Path("uploads")

    # Which ExtractionProvider implementation to use. See
    # app/services/extraction_providers/factory.py -- this is the ONLY
    # component in the app allowed to call an LLM (docs/phase2-extraction.md).
    extraction_provider: str = "groq"
    groq_api_key: Optional[str] = None
    groq_vision_model: str = "qwen/qwen3.6-27b"

    # Phase 3 matching threshold (0-100). Configurable, not hardcoded, per
    # docs/phase3-matching.md -- tune after seeing real shop data.
    match_threshold: float = 85.0

    # Which InvoiceRenderer implementation to use. See
    # app/services/invoice_renderers/factory.py.
    invoice_renderer: str = "xhtml2pdf"

    # Authentication. Override jwt_secret_key via env in real deployments.
    # No refresh flow, so expiry = full session length (default 7 days).
    jwt_secret_key: str = "change-this-secret-key-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    # WhatsApp Cloud API (Meta). Left unset -> WhatsAppClient logs instead of
    # sending, so the send-invoice flow stays testable without real access.
    whatsapp_access_token: Optional[str] = None
    whatsapp_phone_number_id: Optional[str] = None
    whatsapp_api_version: str = "v21.0"

   
    # Password reset / email
    resend_api_key: Optional[str] = None
    resend_from_email: str = "onboarding@resend.dev"
    frontend_url: str = "http://localhost:5173"




@lru_cache
def get_settings() -> Settings:
    return Settings()
