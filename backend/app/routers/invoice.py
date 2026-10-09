"""Invoice API."""

from __future__ import annotations
import csv
import io

import uuid

from fastapi import APIRouter, Depends, Response, HTTPException, Response

from app.dependencies import (
    get_current_user,
    get_invoice_service,
)
from app.models.user import User
from app.schemas.invoice import (
    InvoiceRead,
    InvoiceDetailRead,
    InvoiceItemRead,
)
from app.services.invoice_service import (
    InvoiceService,
    TransactionNotFoundError,
    InvoiceNotFoundError, 
    InvalidInvoiceStateError,
)


router = APIRouter(
    prefix="/invoices",
    tags=["invoices"],
)



@router.get(
    "/export/csv",
    summary="Export all invoices to CSV",
)
def export_invoices_csv(
    service: InvoiceService = Depends(get_invoice_service),
    current_user: User = Depends(get_current_user),
):
    invoices = service.list_all(current_user.business_id)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Invoice Number", "Date", "Customer ID", 
        "Subtotal", "Discount", "Tax Rate", "Tax Amount", 
        "Total Amount", "Status", "Payment Status", "Payment Method"
    ])
    
    for inv in invoices:
        writer.writerow([
            inv.invoice_number,
            inv.created_at.strftime("%Y-%m-%d %H:%M:%S") if inv.created_at else "",
            str(inv.customer_id) if inv.customer_id else "",
            inv.subtotal,
            inv.discount,
            inv.tax_rate,
            inv.tax_amount,
            inv.total_amount,
            inv.status.value if hasattr(inv.status, 'value') else inv.status,
            inv.payment_status.value if hasattr(inv.payment_status, 'value') else inv.payment_status,
            inv.payment_method or ""
        ])
    
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=invoices_export.csv"
    return response


@router.get(
    "",
    response_model=list[InvoiceRead],
)
def list_invoices(
    service: InvoiceService = Depends(get_invoice_service),
    current_user: User = Depends(get_current_user),
) -> list[InvoiceRead]:

    invoices = service.list_all(current_user.business_id)

    return [
        InvoiceRead.model_validate(invoice)
        for invoice in invoices
    ]


@router.get(
    "/{invoice_id}",
    response_model=InvoiceDetailRead,
)
def get_invoice(
    invoice_id: uuid.UUID,
    service: InvoiceService = Depends(get_invoice_service),
    current_user: User = Depends(get_current_user),
) -> InvoiceDetailRead:

    result = service.get_detail(
        invoice_id,
        current_user.business_id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    invoice, items, payments, paid_amount, remaining_amount = result

    if invoice.deleted_at is not None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    return InvoiceDetailRead(
        **invoice.model_dump(),
        items=[
            InvoiceItemRead.model_validate(item)
            for item in items
        ],
        payments=payments,
        paid_amount=paid_amount,
        remaining_amount=remaining_amount,
    )


@router.get(
    "/{invoice_id}/pdf",
)
def get_invoice_pdf(
    invoice_id: uuid.UUID,
    service: InvoiceService = Depends(get_invoice_service),
    current_user: User = Depends(get_current_user),
) -> Response:

    invoice = service.get(
        invoice_id,
        current_user.business_id,
    )

    if invoice is None or invoice.deleted_at is not None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    try:
        pdf_bytes = service.render_invoice_pdf(
            invoice.transaction_id,
            current_user.business_id,
        )

    except TransactionNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'inline; filename="invoice-{invoice.invoice_number}.pdf"'
            )
        },
    )


@router.patch(
    "/{invoice_id}/cancel",
    response_model=InvoiceRead,
)
def cancel_invoice(
    invoice_id: uuid.UUID,
    service: InvoiceService = Depends(get_invoice_service),
    current_user: User = Depends(get_current_user),
) -> InvoiceRead:

    try:
        invoice = service.cancel_invoice(
            invoice_id,
            current_user.business_id,
        )

    except InvoiceNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except TransactionNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except InvalidInvoiceStateError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    return InvoiceRead.model_validate(invoice)

