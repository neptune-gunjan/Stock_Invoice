# Stock & Invoice Assistant

`PLAN.md` is the master plan. Phase-by-phase functional specs live in `/docs`.

## Status

Phases 1-6 are implemented (backend + a minimal test frontend). Storage is
JSON files on local disk rather than Postgres, and handwriting extraction
calls Groq's vision API rather than Claude's -- both were deliberate
substitutions for this build, made behind repository/provider interfaces
(see "Architecture notes" below) so either can be swapped in later without
touching business logic.

- `backend/app/` -- FastAPI app, one router/service/repository set per
  phase. See `docs/architecture.md` for the intended folder layout.
- `frontend/index.html` -- single-file vanilla JS UI: upload an image,
  review/correct extracted + matched items, optionally attach a customer,
  confirm, download the PDF invoice.

## Run it locally

**Backend:**
```bash
cd backend
uv sync
cp .env.example .env   # then fill in GROQ_API_KEY
uv run uvicorn app.main:app --reload --port 8000
```

Seed a starter catalog (optional):
```bash
uv run python -m app.scripts.seed_stock data/seed_stock.csv
```

Run tests:
```bash
uv run pytest
```

**Frontend:**
Open `frontend/index.html` directly in a browser. It calls the backend at
`http://localhost:8000`.

## Architecture notes (deviations from PLAN.md, and why)

- **Storage**: JSON files under `backend/data/`, not Postgres. Every
  entity (stock, extraction jobs, customers, transactions, ...) sits
  behind a `*Repository` abstract interface (`app/repositories/*.py`);
  concrete JSON-file implementations are the only thing that would need
  replacing to move to Postgres -- `app/repositories/factory.py` is the
  single composition root that would need a new branch per entity.
- **Extraction provider**: Groq vision (`meta-llama/llama-4-scout-*` by
  default), not Claude, behind an `ExtractionProvider` interface
  (`app/services/extraction_providers/`). PLAN.md's "exactly one LLM call
  in the whole system" rule still holds -- only
  `groq_vision.py` imports the `groq` client.
- **Invoice rendering**: `xhtml2pdf`, not WeasyPrint -- WeasyPrint needs
  native Pango/GObject libraries not present on stock Windows, and
  installing a system GTK runtime wasn't something to do unattended. Same
  seam either way: `InvoiceRenderer` interface in
  `app/services/invoice_renderers/`.

## What to hand to Claude Code for further work

Give it `PLAN.md` plus the relevant phase doc from `/docs` if you want to
revisit a specific phase's behavior.
