"""Phase 5 -- Invoice PDF API. See docs/phase5-invoice.md."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response

from app.dependencies import get_invoice_service
from app.services.invoice_service import InvoiceService, TransactionNotFoundError

router = APIRouter(prefix="/invoice", tags=["invoice"])


@router.get("/{transaction_id}")
def get_invoice_pdf(
    transaction_id: uuid.UUID,
    service: InvoiceService = Depends(get_invoice_service),
) -> Response:
    try:
        pdf_bytes = service.render_invoice_pdf(transaction_id)
    except TransactionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="invoice-{transaction_id}.pdf"'},
    )
