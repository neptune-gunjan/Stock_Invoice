"""Composition root for InvoiceRenderer."""

from __future__ import annotations

from functools import lru_cache

from app.config import Settings, get_settings
from app.services.invoice_renderers.base import InvoiceRenderer
from app.services.invoice_renderers.xhtml2pdf_renderer import Xhtml2PdfInvoiceRenderer


def build_invoice_renderer(settings: Settings) -> InvoiceRenderer:
    if settings.invoice_renderer == "xhtml2pdf":
        return Xhtml2PdfInvoiceRenderer()
    raise ValueError(f"Unknown invoice_renderer: {settings.invoice_renderer!r}")


@lru_cache
def get_invoice_renderer() -> InvoiceRenderer:
    return build_invoice_renderer(get_settings())
