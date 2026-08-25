"""
Groq vision implementation of ExtractionProvider.

This is the ONLY file in the codebase allowed to import the `groq` client
or hold an API key for it -- see docs/phase2-extraction.md ("no other part
of the codebase calls the LLM API"). Everything downstream of
extract_raw_text() is plain, deterministic Python.
"""

from __future__ import annotations

import base64

import groq

from app.services.extraction_providers.base import ExtractionProvider, ExtractionProviderError

EXTRACTION_PROMPT = """
Look at the provided image of a handwritten shop stock/order list.

Extract every visible item.

IMPORTANT:
Return ONLY a valid JSON array.
Do NOT return explanations.
Do NOT return markdown.
Do NOT use ```json fences.
Do NOT describe your reasoning.

Each array element MUST contain exactly these keys:
- "raw_text": string
- "qty": number or null
- "unit": string or null

Example of the REQUIRED output format:

[
  {
    "raw_text": "atta",
    "qty": 1,
    "unit": "kg"
  },
  {
    "raw_text": "oil",
    "qty": 2,
    "unit": "litre"
  }
]

Rules:
- Preserve the item name as written.
- Extract the quantity if visible.
- Extract the unit if visible.
- If quantity is unclear, use null.
- If unit is unclear, use null.
- Do not guess missing information.
- If there are no readable items, return [].
"""


class GroqVisionExtractionProvider(ExtractionProvider):
    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise ValueError("GROQ_API_KEY is required to use the Groq extraction provider")
        self._client = groq.Groq(api_key=api_key)
        self._model = model

    def extract_raw_text(self, image_bytes: bytes, mime_type: str) -> str:
        data_url = f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('ascii')}"
        try:
            response = self._client.chat.completions.create(
                model=self._model,
                temperature=0,
                reasoning_effort="none",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": EXTRACTION_PROMPT},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    }
                ],
            )
        except groq.GroqError as exc:
            raise ExtractionProviderError(f"Groq vision API call failed: {exc}") from exc

        content = response.choices[0].message.content

        if not content:
            raise ExtractionProviderError(
                "Groq vision API returned an empty response"
            )

        print("\n========== GROQ RAW RESPONSE ==========")
        print(repr(content))
        print("=======================================\n")

        return content
