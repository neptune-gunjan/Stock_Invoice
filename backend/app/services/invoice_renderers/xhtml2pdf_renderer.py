"""xhtml2pdf implementation of InvoiceRenderer."""

from __future__ import annotations

import io
import os

from xhtml2pdf import pisa

from app.services.invoice_renderers.base import (
    InvoiceRenderer,
    InvoiceRenderingError,
)


FONT_DIR = "/usr/share/fonts/truetype/dejavu"


def link_callback(uri: str, rel: str) -> str:
    """
    Resolve local font files for xhtml2pdf.
    """

    if uri.startswith("file://"):
        return uri[7:]

    if uri.startswith("/"):
        return uri

    path = os.path.join(FONT_DIR, uri)

    if os.path.exists(path):
        return path

    return uri


class Xhtml2PdfInvoiceRenderer(InvoiceRenderer):

    def render_pdf(self, html: str) -> bytes:
        buffer = io.BytesIO()

        result = pisa.CreatePDF(
            html,
            dest=buffer,
            encoding="UTF-8",
            link_callback=link_callback,
        )

        if result.err:
            raise InvoiceRenderingError(
                f"xhtml2pdf failed to render invoice (err={result.err})"
            )

        return buffer.getvalue()