"""Low-level client for Meta's WhatsApp Cloud API.

Without WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID configured, calls
are logged instead of sent (`is_configured` is False), so the send-invoice
flow can be built and tested before WhatsApp Business API access exists.
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class WhatsAppClient:
    def __init__(
        self,
        access_token: Optional[str],
        phone_number_id: Optional[str],
        api_version: str = "v21.0",
    ) -> None:
        self._token = access_token
        self._base_url = (
            f"https://graph.facebook.com/{api_version}/{phone_number_id}"
        )
        self.is_configured = bool(access_token and phone_number_id)

        if not self.is_configured:
            logger.warning(
                "WhatsApp Cloud API credentials missing "
                "(WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID). "
                "Messages will be logged instead of sent."
            )

    async def send_text(self, to: str, text: str) -> bool:
        try:
            await self._post_json(
                "messages",
                {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": to,
                    "type": "text",
                    "text": {"body": text},
                },
            )
            return True

        except Exception:
            logger.exception(f"Failed to send WhatsApp text to {to}")
            return False

    async def send_document(
        self,
        to: str,
        document_bytes: bytes,
        filename: str,
        caption: Optional[str] = None,
    ) -> bool:
        try:
            media_id = await self._upload_media(document_bytes, filename)

            document: dict = {"id": media_id, "filename": filename}

            if caption:
                document["caption"] = caption

            await self._post_json(
                "messages",
                {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": to,
                    "type": "document",
                    "document": document,
                },
            )
            return True

        except Exception:
            logger.exception(f"Failed to send WhatsApp document to {to}")
            return False

    async def _upload_media(
        self,
        document_bytes: bytes,
        filename: str,
    ) -> str:
        if not self.is_configured:
            logger.info(
                f"[MOCK WHATSAPP] media upload: "
                f"{filename} ({len(document_bytes)} bytes)"
            )
            return "mock-media-id"

        headers = {"Authorization": f"Bearer {self._token}"}
        files = {"file": (filename, document_bytes, "application/pdf")}
        data = {"messaging_product": "whatsapp", "type": "application/pdf"}

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self._base_url}/media",
                headers=headers,
                data=data,
                files=files,
            )
            response.raise_for_status()
            return response.json()["id"]

    async def _post_json(self, path: str, payload: dict) -> dict:
        if not self.is_configured:
            logger.info(f"[MOCK WHATSAPP] POST {path}: {payload}")
            return {"mock": True}

        headers = {"Authorization": f"Bearer {self._token}"}

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self._base_url}/{path}",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()
