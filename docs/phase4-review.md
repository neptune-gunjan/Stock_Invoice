# Phase 4 — Human Review UI (human-in-the-loop)

## Goal
Give the shopkeeper (or tester) a screen to see extracted + matched items,
fix anything wrong, and explicitly confirm before anything is written as a
real transaction or affects stock levels.

## Why this phase is non-negotiable
Extraction and matching are both probabilistic-ish (LLM extraction) or
approximate (fuzzy matching). Neither is allowed to touch real stock/money
without a human checking it first. This is the safety net that makes the
rest of the automation trustworthy. Skipping this step is the most common
mistake in projects like this — don't skip it, even in early testing.

## Functionality to build

1. Review screen (part of the minimal frontend) shows, per extracted item:
   - raw text as read from the image
   - matched stock item (editable dropdown, pre-filled with the best guess)
   - quantity (editable number field)
   - a visual flag (e.g. yellow highlight) on any `needs_review = true` row
2. Shopkeeper can:
   - accept a match as-is
   - change the matched stock item via dropdown
   - edit quantity
   - delete a line entirely (e.g. LLM hallucinated an item)
   - add a line manually if something was missed entirely
3. `POST /confirm` — takes the (possibly edited) final list, and:
   - creates a `transactions` row (status = confirmed)
   - creates `transaction_items` rows
   - decrements `stock.quantity_available` accordingly
   - this is the ONLY place in the whole system that mutates stock levels

## Acceptance criteria

- Every extracted item is visible and editable before confirmation
- Nothing is written to `transactions` or `stock` until explicit confirm
- Flagged (`needs_review`) items are visually distinct from auto-matched ones
- Confirming with a corrected match uses the corrected value, not the
  original LLM/fuzzy-match guess

## Out of scope for this phase
- No PDF generation yet (Phase 5)
- No customer linking yet (Phase 6) — transactions can be anonymous for now
