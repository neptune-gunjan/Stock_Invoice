from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class WhatsAppSendResult(BaseModel):
    document_sent: bool
    payment_link_sent: bool
    upi_link: Optional[str] = None
    whatsapp_configured: bool
