"""
Phase 3 -- deterministic matching of extracted item text against the stock
catalog. Zero network calls, zero LLM calls -- see docs/phase3-matching.md.

Depends on StockService (to read the catalog) and ExtractionRepository (to
read/write extracted items), both abstractions -- no direct dependency on
rapidfuzz's caller-facing API beyond this one module, so swapping the
scoring algorithm later stays a one-file change.
"""

from __future__ import annotations

import uuid

from rapidfuzz import fuzz

from app.models.extraction import ExtractedItem
from app.models.stock import StockItem
from app.repositories.extraction import ExtractionRepository
from app.services.stock_service import StockService

def _score_candidate(raw_text: str, candidate: str) -> float:
    raw = raw_text.strip().lower()
    cand = candidate.strip().lower()

    # Exact match
    if raw == cand:
        return 100.0

    # Handles typos such as:
    # suagr -> sugar
    # attaaa -> atta
    # tamatarrr -> tamatar
    ratio_score = fuzz.ratio(raw, cand)

    # Useful for word-order differences
    token_score = fuzz.token_sort_ratio(raw, cand)

    # Keep WRatio for more general fuzzy matching
    weighted_score = fuzz.WRatio(raw, cand)

    return max(ratio_score, token_score, weighted_score)


def _best_match(raw_text: str, catalog: list[StockItem]) -> tuple[StockItem | None, float]:
    best_item: StockItem | None = None
    best_score = 0.0
    for stock_item in catalog:
        candidates = [stock_item.name, *stock_item.aliases]
        score = max(
            _score_candidate(raw_text, candidate)
            for candidate in candidates
        )
        if score > best_score:
            best_score = score
            best_item = stock_item
    return best_item, best_score


class MatchingService:

    def __init__(
        self,
        extraction_repository: ExtractionRepository,
        stock_service: StockService,
        threshold: float,
    ) -> None:
        self._extraction_repository = extraction_repository
        self._stock_service = stock_service
        self._threshold = threshold

    def match_job(self, job_id: uuid.UUID) -> list[ExtractedItem]:
        items = self._extraction_repository.list_items(job_id)
        catalog = self._stock_service.list_stock()

        matched_items = [self._match_item(item, catalog) for item in items]
        return self._extraction_repository.replace_items(job_id, matched_items)

    def _match_item(self, item: ExtractedItem, catalog: list[StockItem]) -> ExtractedItem:
        best_item, best_score = _best_match(item.raw_text, catalog)

        if best_item is None:
            # No candidates at all (empty catalog) -- no reasonable match possible.
            return item.model_copy(
                update={"matched_stock_id": None, "confidence_score": None, "needs_review": True}
            )

        # Auto-match at/above threshold; below threshold, still record the
        # best guess but flag it for human review (docs/phase3-matching.md).
        return item.model_copy(
            update={
                "matched_stock_id": best_item.id,
                "confidence_score": round(best_score, 2),
                "needs_review": best_score < self._threshold,
            }
        )
