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

    def match_job(
        self,
        job_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> list[ExtractedItem]:

        items = self._extraction_repository.list_items(job_id)

        catalog = self._stock_service.list_stock(
            business_id=business_id
        )

        matched_items = [
            self._match_item(item, catalog)
            for item in items
        ]

        return self._extraction_repository.replace_items(
            job_id,
            matched_items,
        )

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

    def match_text(self, text: str, business_id: uuid.UUID) -> list[ExtractedItem]:
        """Parses lines of order text (e.g. from WhatsApp) and matches against stock catalog."""
        import re

        lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
        catalog = self._stock_service.list_stock(business_id=business_id)

        common_units = {
            "kg", "kgs", "kilo", "g", "gm", "gms", "gram", "grams",
            "l", "lt", "ltr", "litre", "litres", "liter", "liters",
            "box", "boxes", "carton", "cartons", "peti", "petis",
            "bag", "bags", "bori", "boris", "tin", "tins", "can", "cans",
            "pc", "pcs", "piece", "pieces", "pkt", "pkts", "packet", "packets",
            "bottle", "bottles", "dozen", "dz"
        }

        matched_items: list[ExtractedItem] = []
        for line in lines:
            # Strip list prefixes like "1.", "1)", "-", "•"
            cleaned = re.sub(r'^(?:[-*•\d]+[.)]?\s*)', '', line).strip()
            if not cleaned:
                continue

            qty = 1.0
            unit: str | None = None
            raw_product = cleaned

            # Match leading number: "10 box parle g", "5 kg rice", "2 oil"
            match_leading = re.match(r'^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$', cleaned)
            if match_leading:
                qty_val, possible_unit, rest = match_leading.groups()
                qty = float(qty_val)
                if possible_unit and possible_unit.lower() in common_units:
                    unit = possible_unit.lower()
                    raw_product = rest.strip()
                else:
                    raw_product = f"{possible_unit or ''} {rest}".strip()
            else:
                # Match trailing number: "parle g 10 box", "sugar 50 kg"
                match_trailing = re.search(r'(.+?)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$', cleaned)
                if match_trailing:
                    rest, qty_val, possible_unit = match_trailing.groups()
                    qty = float(qty_val)
                    if possible_unit and possible_unit.lower() in common_units:
                        unit = possible_unit.lower()
                    raw_product = rest.strip()

            extracted = ExtractedItem(
                id=uuid.uuid4(),
                extraction_job_id=uuid.uuid4(),
                raw_text=raw_product,
                qty=qty,
                unit=unit,
            )
            matched_items.append(self._match_item(extracted, catalog))

        return matched_items
