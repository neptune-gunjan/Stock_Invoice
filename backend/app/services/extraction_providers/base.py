"""
The seam where the ONE permitted LLM call in this system lives (see
PLAN.md section 2 and docs/architecture.md). ExtractionService depends on
this abstraction, never on a concrete vision API client -- swapping
providers (Groq today, Claude later, ...) means adding one new class here,
not touching ExtractionService or the /extract route.

Deliberately narrow: a provider's only job is "send an image, get back
whatever text the model said." It does not parse or validate JSON -- that
is a separate, deterministic, network-free step (see
app/services/extraction_parsing.py) so extraction failures can be told
apart from parse failures, per docs/phase2-extraction.md.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class ExtractionProviderError(Exception):
    """Raised when the vision API call itself fails (bad image, network,
    auth, rate limit) -- distinct from the model returning non-JSON text,
    which is a parsing failure, not a provider failure."""


class ExtractionProvider(ABC):
    @abstractmethod
    def extract_raw_text(self, image_bytes: bytes, mime_type: str) -> str:
        """Send the image to the vision model and return its raw text
        response verbatim. Raises ExtractionProviderError on API-level
        failure."""
