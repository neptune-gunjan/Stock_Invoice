# Phase 3 — Deterministic Matching

## Goal
Take the raw item guesses from Phase 2 and match each one against the known
`stock` catalog from Phase 1 — entirely locally, with zero API calls.

## Why this must be deterministic
Given the same raw text and the same stock catalog, this step must always
produce the same match. That's what makes it debuggable and auditable —
unlike an LLM call, you can reason about exactly why "aata" matched "Atta."

## Functionality to build

1. `POST /match` — takes an `extraction_job_id`, for each `extracted_item`:
   - runs `rapidfuzz.fuzz.WRatio` (or similar) comparing `raw_text` against
     each stock item's `name` AND its `aliases`
   - takes the best score; if score >= threshold (e.g. 85) → auto-match,
     set `matched_stock_id`, `confidence_score`, `needs_review = false`
   - if score is below threshold → still store the best guess, but set
     `needs_review = true` so the human review step (Phase 4) surfaces it
   - if no reasonable match at all → `matched_stock_id = null`,
     `needs_review = true`
2. Make the threshold configurable (env var or config), not hardcoded, so
   it can be tuned after seeing real shop data.

## Data model addition

`extracted_items` gets these new columns:
| Column | Type |
|---|---|
| matched_stock_id | UUID nullable FK → stock.id |
| confidence_score | numeric (0-100) |
| needs_review | boolean |

## Acceptance criteria

- Given a raw text list with some clean matches and some misspellings,
  correct items are auto-matched and misspelled/ambiguous ones are flagged
- Threshold is configurable without a code change
- Matching runs with zero network calls (verify by running with network
  disabled — it should still work)

## Out of scope for this phase
- No UI for reviewing flagged items yet (Phase 4)
- No writing to `transactions` yet (Phase 4/6)
