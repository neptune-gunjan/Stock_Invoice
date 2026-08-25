"""
Renderer abstraction for turning invoice HTML into PDF bytes.

InvoiceService depends on this, not on a concrete PDF library, so the
backend can be swapped per-environment: xhtml2pdf today (pure Python, no
native deps -- works out of the box on Windows) or WeasyPrint once its
Pango/GObject native libraries are available (better CSS support). Same
OCP/DIP seam as ExtractionProvider and every *Repository interface in this
app -- see app/services/extraction_providers/base.py for the sibling
pattern.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class InvoiceRenderingError(Exception):
    pass


class InvoiceRenderer(ABC):
    @abstractmethod
    def render_pdf(self, html: str) -> bytes:
        """Render an HTML string to PDF bytes. Raises InvoiceRenderingError
        on failure."""
