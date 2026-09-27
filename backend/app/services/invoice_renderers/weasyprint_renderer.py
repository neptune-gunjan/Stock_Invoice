"""WeasyPrint implementation of InvoiceRenderer."""

from __future__ import annotations

from weasyprint import HTML

from app.services.invoice_renderers.base import (
    InvoiceRenderer,
    InvoiceRenderingError,
)

class WeasyPrintInvoiceRenderer(InvoiceRenderer):
    def render_pdf(self, html: str) -> bytes:
        try:
            return HTML(string=html).write_pdf()
        except Exception as e:
            raise InvoiceRenderingError(f"WeasyPrint failed to render invoice: {e}") from e
