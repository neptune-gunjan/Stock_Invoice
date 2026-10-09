"""
App-wide settings, loaded from environment variables / .env.

Nothing outside this module should read os.environ directly -- routers,
services, and repositories all take their configuration through Settings
so behavior stays testable and swappable.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    upload_dir: Path = Path("uploads")

    # Which ExtractionProvider implementation to use. See
    # app/services/extraction_providers/factory.py -- this is the ONLY
    # component in the app allowed to call an LLM (docs/phase2-extraction.md).
    extraction_provider: str = "groq"
    anthropic_api_key: Optional[str] = None
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
