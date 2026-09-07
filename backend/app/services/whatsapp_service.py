"""Sends an invoice PDF, plus a UPI payment-request link when the invoice
has an outstanding balance and the business has a UPI VPA on file, to the
invoice's customer over WhatsApp.
"""

from __future__ import annotations

import urllib.parse
import uuid

from app.repositories.business import BusinessRepository
from app.schemas.whatsapp import WhatsAppSendResult
from app.services.customer_service import CustomerService
from app.services.invoice_service import InvoiceService
from app.services.whatsapp_client import WhatsAppClient


class InvoiceNotFoundError(Exception):
    def __init__(self, invoice_id: uuid.UUID) -> None:
        self.invoice_id = invoice_id
        super().__init__(f"invoice {invoice_id} not found")


class CustomerPhoneMissingError(Exception):
    pass


def build_upi_link(
    vpa: str,
    payee_name: str,
    amount: float,
    note: str,
) -> str:
    params = {
        "pa": vpa,
        "pn": payee_name,
        "am": f"{amount:.2f}",
        "cu": "INR",
        "tn": note,
    }
    return "upi://pay?" + urllib.parse.urlencode(params)


class WhatsAppService:
    def __init__(
        self,
        invoice_service: InvoiceService,
        customer_service: CustomerService,
        business_repository: BusinessRepository,
        client: WhatsAppClient,
    ) -> None:
        self._invoice_service = invoice_service
        self._customer_service = customer_service
        self._business_repository = business_repository
        self._client = client

    async def send_invoice(
        self,
        invoice_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> WhatsAppSendResult:

        detail = self._invoice_service.get_detail(
            invoice_id,
            business_id,
        )

        if detail is None:
            raise InvoiceNotFoundError(invoice_id)

        invoice, _items, _payments, _paid_amount, remaining_amount = detail

        if invoice.deleted_at is not None:
            raise InvoiceNotFoundError(invoice_id)

        if invoice.customer_id is None:
            raise CustomerPhoneMissingError(
                "Invoice has no customer to send to"
            )

        customer = self._customer_service.get_active(
            invoice.customer_id,
            business_id,
        )

        if customer is None or not customer.phone:
            raise CustomerPhoneMissingError(
                "Customer has no phone number on file"
            )

        business = self._business_repository.get(business_id)

        pdf_bytes = self._invoice_service.render_invoice_pdf(
            invoice.transaction_id,
            business_id,
        )

        business_name = (
            business.business_name if business else "us"
        )

        document_sent = await self._client.send_document(
            to=customer.phone,
            document_bytes=pdf_bytes,
            filename=f"invoice-{invoice.invoice_number}.pdf",
            caption=f"Invoice {invoice.invoice_number} from {business_name}",
        )

        upi_link = None
        payment_link_sent = False

        if remaining_amount > 0 and business is not None and business.upi_vpa:
            upi_link = build_upi_link(
                vpa=business.upi_vpa,
                payee_name=business_name,
                amount=remaining_amount,
                note=f"Invoice {invoice.invoice_number}",
            )

            payment_link_sent = await self._client.send_text(
                to=customer.phone,
                text=(
                    f"Payment request for invoice {invoice.invoice_number} "
                    f"(Rs {remaining_amount:.2f} due):\n{upi_link}"
                ),
            )

        return WhatsAppSendResult(
            document_sent=document_sent,
            payment_link_sent=payment_link_sent,
            upi_link=upi_link,
            whatsapp_configured=self._client.is_configured,
        )
