"""Send an invoice PDF (+ UPI payment link) to a customer over WhatsApp."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, get_whatsapp_service
from app.models.user import User
from app.schemas.whatsapp import WhatsAppSendResult
from app.services.invoice_service import (
    BusinessNotFoundError,
    TransactionNotFoundError,
)
from app.services.whatsapp_service import (
    CustomerPhoneMissingError,
    InvoiceNotFoundError,
    WhatsAppService,
)


router = APIRouter(
    prefix="/invoices",
    tags=["whatsapp"],
)


@router.post(
    "/{invoice_id}/send-whatsapp",
    response_model=WhatsAppSendResult,
)
async def send_invoice_whatsapp(
    invoice_id: uuid.UUID,
    service: WhatsAppService = Depends(get_whatsapp_service),
    current_user: User = Depends(get_current_user),
) -> WhatsAppSendResult:

    try:
        return await service.send_invoice(
            invoice_id,
            current_user.business_id,
        )

    except InvoiceNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except CustomerPhoneMissingError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except TransactionNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except BusinessNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc
