# Stock & Invoice Assistant — Build Plan

## 1. What this project does

A local shopkeeper writes stock/order lists by hand. We photograph these notes,
extract the items using a vision LLM (one call per image, nothing else in the
system touches an LLM), match them against a known stock catalog, let the
shopkeeper confirm/correct the result, then generate a formal PDF invoice
using a deterministic template — no AI involved in that last step.

## 2. Non-negotiable design rule

**LLM usage is isolated to exactly one step: reading handwriting off an image.**
Everything downstream — matching, math, PDF generation, transaction history —
is plain, deterministic Python. This is intentional:

- Money math must be reproducible and auditable. LLMs are not deterministic.
- We don't want invoice generation to depend on API availability, rate limits,
  or token cost.
- A human always confirms extracted data before it becomes a real transaction
  (see Phase 4 — "human-in-the-loop").

Do not introduce LLM calls anywhere outside Phase 2 (extraction) without
explicit sign-off from the project owner.

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
|Package manager | uv | fast installs/locking, single pyproject.toml + uv.lock, no manual venv activation
| Backend | FastAPI (Python) | async, fast, matches existing team stack |
| DB | PostgreSQL | relational integrity for stock/customers/transactions |
| ORM | SQLAlchemy + Alembic | migrations, matches conventions used elsewhere |
| Extraction | Claude API (vision), one call per uploaded image | best accuracy on handwriting vs classical OCR |
| Fuzzy matching | `rapidfuzz` | local, free, deterministic |
| PDF generation | `WeasyPrint` (HTML/CSS → PDF) | easiest to style well, no LLM |
| Frontend (MVP) | Plain HTML + vanilla JS | zero build step, fastest to test with |
| Frontend (later) | React/Vite | once the flow is proven, swap in properly |
| File storage | Local disk for MVP → S3 later | keep MVP simple |

## 4. High-level architecture

```
[Browser: upload image]
        |
        v
FastAPI /extract  ---->  Claude Vision API (Phase 2 only)
        |                       |
        |<---- structured JSON--+   (items, qty, unit, confidence)
        v
FastAPI /match  ---->  rapidfuzz against `stock` table (Postgres)
        |
        v
[Browser: review/edit screen]  <-- human-in-the-loop checkpoint
        |
        v (on confirm)
FastAPI /confirm  ---->  writes to `transactions` + decrements `stock`
        |
        v
FastAPI /invoice/{transaction_id}  ---->  WeasyPrint renders PDF (no LLM)
        |
        v
[Browser: download PDF]
```

## 5. Data model (grows across phases, don't build it all at once)

- `stock` (id, name, canonical_unit, quantity_available, unit_price, aliases[], created_at, updated_at, deleted_at)
- `extraction_jobs` (id, image_path, raw_llm_output, status, created_at)
- `extracted_items` (id, extraction_job_id, raw_text, matched_stock_id, confidence_score, qty, unit, needs_review, created_at)
- `customers` (id, name, phone, created_at, deleted_at)
- `transactions` (id, customer_id, status, total_amount, created_at, deleted_at)
- `transaction_items` (id, transaction_id, stock_id, qty, unit_price, line_total)

Use UUIDs for all primary keys and soft-delete (`deleted_at`) everywhere —
never hard-delete financial records. This mirrors conventions already used
in other production systems on this team; keep it consistent.

## 6. Phase-by-phase build order

Build and test each phase fully before starting the next. Each phase has its
own doc in `/docs` with functional detail, acceptance criteria, and out-of-scope notes.

1. **Phase 1 — Stock Catalog** (`docs/phase1-stock-catalog.md`)
2. **Phase 2 — Handwriting Extraction** (`docs/phase2-extraction.md`)
3. **Phase 3 — Deterministic Matching** (`docs/phase3-matching.md`)
4. **Phase 4 — Human Review UI** (`docs/phase4-review.md`)
5. **Phase 5 — Deterministic Invoice PDF** (`docs/phase5-invoice.md`)
6. **Phase 6 — Customers & Transaction History** (`docs/phase6-history.md`)

## 7. MVP scope for the first working demo

Phases 1 → 5, no customer linking yet. Goal: upload one image of a
handwritten list → review/correct extracted items → get a PDF invoice.
Phase 6 comes after this loop is proven to work reliably.

## 8. What "done" looks like for the MVP

- Upload an image via the minimal UI
- See extracted items with confidence flags
- Edit/confirm quantities and matches
- Click confirm → stock table updates
- Download a correctly formatted PDF invoice
- No LLM call happens anywhere except the single extraction step
