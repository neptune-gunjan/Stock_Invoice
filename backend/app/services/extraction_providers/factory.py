"""Composition root for ExtractionProvider. The only place that decides
which vision backend is in use -- ExtractionService never does."""

from __future__ import annotations

from functools import lru_cache

from app.config import Settings, get_settings
from app.services.extraction_providers.base import ExtractionProvider
from app.services.extraction_providers.groq_vision import GroqVisionExtractionProvider


def build_extraction_provider(settings: Settings) -> ExtractionProvider:
    if settings.extraction_provider == "groq":
        return GroqVisionExtractionProvider(
            api_key=settings.groq_api_key or "",
            model=settings.groq_vision_model,
        )
    raise ValueError(f"Unknown extraction_provider: {settings.extraction_provider!r}")


@lru_cache
def get_extraction_provider() -> ExtractionProvider:
    return build_extraction_provider(get_settings())
