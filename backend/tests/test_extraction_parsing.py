from __future__ import annotations

import pytest

from app.services.extraction_parsing import ExtractionParseError, parse_extraction_output


def test_parses_clean_json_array() -> None:
    raw = '[{"raw_text": "atta", "qty": 2, "unit": "kg"}, {"raw_text": "oil", "qty": null, "unit": null}]'
    items = parse_extraction_output(raw)
    assert len(items) == 2
    assert items[0].raw_text == "atta"
    assert items[0].qty == 2
    assert items[1].qty is None


def test_strips_markdown_fences() -> None:
    raw = '```json\n[{"raw_text": "sugar", "qty": 1, "unit": "kg"}]\n```'
    items = parse_extraction_output(raw)
    assert items[0].raw_text == "sugar"


def test_rejects_non_json() -> None:
    with pytest.raises(ExtractionParseError):
        parse_extraction_output("Sure, here's the list: atta, sugar, oil")


def test_rejects_json_object_instead_of_array() -> None:
    with pytest.raises(ExtractionParseError):
        parse_extraction_output('{"raw_text": "atta"}')


def test_rejects_wrong_item_shape() -> None:
    with pytest.raises(ExtractionParseError):
        parse_extraction_output('[{"name": "atta"}]')


def test_empty_array_is_valid() -> None:
    assert parse_extraction_output("[]") == []
