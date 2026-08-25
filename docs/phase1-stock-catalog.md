# Phase 1 — Stock Catalog

## Goal
Establish the ground-truth list of items the shop actually sells. Everything
extracted from handwritten notes in later phases gets matched against this
table — nothing else. No handwriting or LLM involved in this phase.

## Why this phase comes first
You can't match "atta" to anything if you don't already have a canonical
"Atta" record to match it against. This is boring, manual, and essential —
skipping it means Phase 3 has nothing to match against.

## Data model

`stock` table:
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | text | canonical display name, e.g. "Atta" |
| aliases | text[] | common misspellings/variants, e.g. ["aata","flour","atta"] |
| unit | text | "kg", "litre", "piece", etc. |
| unit_price | numeric | current selling price |
| quantity_available | numeric | current stock level |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz nullable | soft delete, never hard-delete |

## Functionality to build

1. `POST /stock` — create a stock item (name, unit, unit_price, quantity, aliases)
2. `GET /stock` — list all active (non-deleted) stock items
3. `PATCH /stock/{id}` — update quantity/price/aliases
4. `DELETE /stock/{id}` — soft delete (set `deleted_at`)
5. Minimal seed script to bulk-load an initial catalog from a CSV, since a
   shopkeeper likely has 50-200 items and won't want to type them one by one

## Acceptance criteria

- Can create, list, update, and soft-delete stock items via API
- `aliases` field supports multiple spellings per item (used by Phase 3)
- Seed script successfully loads a sample CSV of ~20 test items

## Out of scope for this phase
- No image upload yet
- No matching logic yet
- No invoice generation yet
