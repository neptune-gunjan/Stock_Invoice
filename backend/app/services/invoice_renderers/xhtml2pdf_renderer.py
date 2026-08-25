"""xhtml2pdf implementation of InvoiceRenderer -- pure Python, no native
system libraries required. Current default; see base.py for why this is
swappable."""

from __future__ import annotations

import io

from xhtml2pdf import pisa

from app.services.invoice_renderers.base import InvoiceRenderer, InvoiceRenderingError


class Xhtml2PdfInvoiceRenderer(InvoiceRenderer):
    def render_pdf(self, html: str) -> bytes:
        buffer = io.BytesIO()
        result = pisa.CreatePDF(html, dest=buffer)
        if result.err:
            raise InvoiceRenderingError(f"xhtml2pdf failed to render invoice (err={result.err})")
        return buffer.getvalue()
