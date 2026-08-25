"""
Parses the raw text returned by an ExtractionProvider into structured item
guesses. Deterministic and network-free by design (see
docs/phase2-extraction.md: "LLM returns non-JSON -> log raw output, return
an error, do not attempt to silently parse partial garbage") so it's
testable without ever calling the vision API.
"""

from __future__ import annotations

import json
from typing import Optional

from pydantic import BaseModel, ValidationError


class ExtractionParseError(Exception):
    pass


class RawExtractedItem(BaseModel):
    raw_text: str
    qty: Optional[float] = None
    unit: Optional[str] = None


def parse_extraction_output(raw_text: str) -> list[RawExtractedItem]:
    stripped = raw_text.strip()
    # Be lenient about markdown fences even though the prompt asks the
    # model not to use them -- models don't always comply.
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.lower().startswith("json"):
            stripped = stripped[4:]
        stripped = stripped.strip()

    try:
        parsed = json.loads(stripped)
    except json.JSONDecodeError as exc:
        raise ExtractionParseError(f"model output was not valid JSON: {exc}") from exc

    if not isinstance(parsed, list):
        raise ExtractionParseError("model output was valid JSON but not a JSON array")

    try:
        return [RawExtractedItem.model_validate(entry) for entry in parsed]
    except ValidationError as exc:
        raise ExtractionParseError(f"model output did not match the expected item shape: {exc}") from exc
