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
- `frontend-next/` -- React + Vite UI: upload an image,
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
```bash
cd frontend-next
npm install
npm run dev
```
The frontend will start a local dev server (usually at `http://localhost:5173`) and connect to the backend at `http://localhost:8000`.


## Architecture notes

- **Storage**: The app uses PostgreSQL via SQLAlchemy, with all models sitting behind a `*Repository` abstract interface (`app/repositories/*.py`). The application supports switching between a local JSON-file backend and PostgreSQL by changing the `*_storage_backend` environment variables in `.env` (`app/repositories/factory.py` manages the active instances).
- **Extraction provider**: Handwriting extraction can use either Anthropic's Claude or Groq Vision, managed by the `ExtractionProvider` interface (`app/services/extraction_providers/`). You can configure the active provider using `EXTRACTION_PROVIDER=claude` in `.env`.
- **Invoice rendering**: The app uses `WeasyPrint` for high-quality PDF rendering, with a fallback to `xhtml2pdf` if needed. The `InvoiceRenderer` interface in `app/services/invoice_renderers/` handles this switch.

## What to hand to Claude Code for further work

Give it `PLAN.md` plus the relevant phase doc from `/docs` if you want to
revisit a specific phase's behavior.
