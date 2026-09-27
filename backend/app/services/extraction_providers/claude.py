import base64
from app.services.extraction_providers.base import ExtractionProvider, ExtractionProviderError
import anthropic

class ClaudeExtractionProvider(ExtractionProvider):
    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20240620"):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    def extract_raw_text(self, image_bytes: bytes, mime_type: str) -> str:
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        
        prompt = (
            "You are an AI tasked with transcribing handwritten text on physical shop stock-taking "
            "receipts, notes, and registers. The images provided contain counts of items.\n\n"
            "Return the transcribed text in valid JSON format. It must be an array of objects. "
            "Each object must have 'raw_text' (the exact text read). If you can determine it, "
            "include 'qty' (number) and 'unit' (string). Return only the raw JSON. Nothing else."
        )

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": mime_type,
                                    "data": base64_image,
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ]
            )
            return message.content[0].text
        except Exception as e:
            raise ExtractionProviderError(f"Claude API failed: {e}") from e
