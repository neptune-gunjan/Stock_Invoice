"""Low-level client for Meta's WhatsApp Cloud API."""

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
        self._phone_number_id = phone_number_id
        self._base_url = (
            f"https://graph.facebook.com/"
            f"{api_version}/"
            f"{phone_number_id}"
        )

        self.is_configured = bool(
            access_token and phone_number_id
        )

        if not self.is_configured:
            logger.warning(
                "WhatsApp Cloud API credentials missing "
                "(WHATSAPP_ACCESS_TOKEN / "
                "WHATSAPP_PHONE_NUMBER_ID). "
                "Messages will be logged instead of sent."
            )

    @staticmethod
    def _normalize_phone_number(phone: str) -> str:
        """
        Convert an Indian phone number to Meta-compatible format.

        Examples:
            9782126483       -> 919782126483
            +919782126483    -> 919782126483
            919782126483     -> 919782126483
            91 9782126483    -> 919782126483
        """

        # Keep only digits
        digits = "".join(
            character for character in phone
            if character.isdigit()
        )

        # Already has India country code
        if digits.startswith("91") and len(digits) == 12:
            return digits

        # 10-digit Indian mobile number
        if len(digits) == 10:
            return f"91{digits}"

        # Don't silently modify unexpected numbers
        return digits

    async def send_text(
        self,
        to: str,
        text: str,
    ) -> bool:
        """Send a text message through WhatsApp Cloud API."""

        normalized_to = self._normalize_phone_number(to)

        try:
            response = await self._post_json(
                "messages",
                {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": normalized_to,
                    "type": "text",
                    "text": {
                        "body": text,
                    },
                },
            )

            logger.info(
                "WhatsApp text sent successfully to %s. "
                "Meta response: %s",
                normalized_to,
                response,
            )

            return True

        except Exception:
            logger.exception(
                "Failed to send WhatsApp text to %s",
                normalized_to,
            )
            return False

    async def send_document(
        self,
        to: str,
        document_bytes: bytes,
        filename: str,
        caption: Optional[str] = None,
    ) -> bool:
        """Upload and send a PDF document through WhatsApp."""

        normalized_to = self._normalize_phone_number(to)

        try:
            # Step 1: Upload PDF to Meta
            media_id = await self._upload_media(
                document_bytes=document_bytes,
                filename=filename,
            )

            logger.info(
                "WhatsApp media uploaded successfully. "
                "media_id=%s",
                media_id,
            )

            # Step 2: Build document payload
            document: dict = {
                "id": media_id,
                "filename": filename,
            }

            if caption:
                document["caption"] = caption

            # Step 3: Send document messa
            response = await self._post_json(
                "messages",
                {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": normalized_to,
                    "type": "document",
                    "document": document,
                },
            )

            logger.info(
                "WhatsApp document sent successfully to %s. "
                "Meta response: %s",
                normalized_to,
                response,
            )

            return True

        except Exception:
            logger.exception(
                "Failed to send WhatsApp document to %s",
                normalized_to,
            )
            return False

    async def _upload_media(
        self,
        document_bytes: bytes,
        filename: str,
    ) -> str:
        """Upload a PDF to Meta and return its media ID."""

        if not self.is_configured:
            logger.info(
                "[MOCK WHATSAPP] media upload: %s (%s bytes)",
                filename,
                len(document_bytes),
            )
            return "mock-media-id"

        logger.info(
            "WhatsApp config: token_present=%s token_length=%s phone_number_id=%s",
            bool(self._token),
            len(self._token or ""),
            self._phone_number_id,
        )

        headers = {
            "Authorization": f"Bearer {self._token}",
        }

        files = {
            "file": (
                filename,
                document_bytes,
                "application/pdf",
            )
        }

        data = {
            "messaging_product": "whatsapp",
            "type": "application/pdf",
        }

        async with httpx.AsyncClient(
            timeout=30
        ) as client:
            response = await client.post(
                f"{self._base_url}/media",
                headers=headers,
                data=data,
                files=files,
            )

            if response.is_error:
                logger.error(
                    "WhatsApp media upload failed. "
                    "Status=%s Response=%s",
                    response.status_code,
                    response.text,
                )

            response.raise_for_status()

            result = response.json()

            logger.info(
                "WhatsApp media upload response: %s",
                result,
            )

            media_id = result.get("id")

            if not media_id:
                raise RuntimeError(
                    "Meta WhatsApp API did not return a media ID"
                )

            return media_id

    async def _post_json(
        self,
        path: str,
        payload: dict,
    ) -> dict:
        """POST JSON to Meta WhatsApp Cloud API."""

        if not self.is_configured:
            logger.info(
                "[MOCK WHATSAPP] POST %s: %s",
                path,
                payload,
            )
            return {
                "mock": True,
            }

        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(
            timeout=30
        ) as client:
            response = await client.post(
                f"{self._base_url}/{path}",
                json=payload,
                headers=headers,
            )

            if response.is_error:
                logger.error(
                    "WhatsApp API request failed. "
                    "URL=%s Status=%s Response=%s",
                    response.request.url,
                    response.status_code,
                    response.text,
                )

            response.raise_for_status()

            result = response.json()

            logger.info(
                "WhatsApp API response: %s",
                result,
            )

            return result