# Architecture Overview

## Guiding principle
Only ONE component in this system calls an external LLM: the extraction step
in Phase 2. Every other component — matching, review, invoicing, storage —
is deterministic Python/SQL with no API dependency. This keeps invoicing
free, offline-capable, and reproducible.

## System diagram

```
                     ┌─────────────────────┐
                     │   Frontend (HTML/JS) │
                     │  - upload image      │
                     │  - review screen     │
                     │  - download PDF      │
                     └──────────┬───────────┘
                                │ REST (JSON)
                     ┌──────────▼───────────┐
                     │     FastAPI backend   │
                     ├───────────────────────┤
                     │ /stock       (CRUD)   │
                     │ /extract     (Phase2) │──► Claude Vision API
                     │ /match       (Phase3) │──► rapidfuzz (local)
                     │ /confirm     (Phase4) │
                     │ /invoice/{id}(Phase5) │──► WeasyPrint (local)
                     │ /customers   (Phase6) │
                     │ /transactions(Phase6) │
                     └──────────┬───────────┘
                                │ SQLAlchemy
                     ┌──────────▼───────────┐
                     │     PostgreSQL         │
                     │  stock, extraction_jobs│
                     │  extracted_items,      │
                     │  customers,            │
                     │  transactions          │
                     └───────────────────────┘
```

## Folder structure (backend)

```
backend/
  app/
    main.py                # FastAPI app, route registration
    config.py               # env vars, settings
    db.py                   # SQLAlchemy engine/session
    models/
      stock.py
      extraction.py
      customer.py
      transaction.py
    schemas/                # Pydantic request/response models
      stock.py
      extraction.py
      invoice.py
    services/
      extraction_service.py # calls Claude vision API (Phase 2 only)
      matching_service.py   # rapidfuzz logic (Phase 3)
      invoice_service.py    # WeasyPrint rendering (Phase 5)
    routers/
      stock.py
      extract.py
      match.py
      confirm.py
      invoice.py
      customers.py
    templates/
      invoice.html           # Jinja2 template for the PDF
  requirements.txt
  alembic/                   # migrations, added from Phase 1 onward
```

## Folder structure (frontend, MVP)

```
frontend/
  index.html      # single-page test UI: upload, review, confirm, download
```

This gets replaced by a proper React/Vite app only after the backend flow
(Phases 1-5) is proven stable — don't build the fancy frontend first.

## Package management

The backend uses `uv`, not pip/venv directly. Always add new dependencies
with `uv add <package>` (or `uv add --optional <group> <package>` for a
phase-specific extra) so `pyproject.toml` and `uv.lock` stay in sync. Run
the app with `uv run uvicorn app.main:app --reload`, and run any one-off
scripts with `uv run python <script>.py` rather than activating a venv
manually.

## Environment variables

```
DATABASE_URL=postgresql://user:pass@localhost:5432/stockapp
ANTHROPIC_API_KEY=...        # used only inside extraction_service.py
UPLOAD_DIR=./uploads
```

## Error-handling stance

- Extraction failures (bad image, API error) → return a clear error to the
  UI, do NOT silently fall back to guessing.
- Low-confidence matches (below a configurable threshold, e.g. 80%) are
  always flagged `needs_review: true` and must be confirmed by a human
  before they can be written to `transactions`.
- No transaction is ever written directly from raw LLM output. It must pass
  through the review/confirm step every time, even in testing.
