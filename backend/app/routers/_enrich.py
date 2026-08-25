"""Small shared helper for building API responses that need extracted
items annotated with their matched stock item's display name. Not a
router itself -- imported by extract.py and match.py."""

from __future__ import annotations

from app.models.extraction import ExtractedItem
from app.models.stock import StockItem
from app.schemas.extraction import ExtractedItemRead


def enrich_items(items: list[ExtractedItem], catalog: list[StockItem]) -> list[ExtractedItemRead]:
    names_by_id = {stock_item.id: stock_item.name for stock_item in catalog}
    return [
        ExtractedItemRead(
            **item.model_dump(),
            matched_stock_name=names_by_id.get(item.matched_stock_id) if item.matched_stock_id else None,
        )
        for item in items
    ]
