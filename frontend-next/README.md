# frontend-next

The new UI (adapted from the Replit prototype in `../new-frontend/`) wired to the
existing FastAPI backend. Built alongside the current `../frontend/` — nothing in
`frontend/` or `backend/` was changed.

## Stack

- Vite 8 + React 19 + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`) + shadcn/ui (Radix) components
- wouter (routing), @tanstack/react-query (server state)

## Run

```bash
cd frontend-next
npm install
npm run dev          # http://localhost:5174 (or next free port)
```

Start the backend too:

```bash
cd ../backend
uv run uvicorn app.main:app --reload
```

In dev, `vite.config.ts` proxies `/auth`, `/stock`, `/extract`, `/match`,
`/confirm`, `/invoices`, `/customers`, `/business`, `/dashboard` to
`VITE_API_BASE_URL` (default `http://127.0.0.1:8000`), so the browser sees a
single origin. For a production build where the API lives elsewhere, set
`VITE_API_BASE_URL` in `.env.local` and rebuild.

```bash
npm run build        # tsc --noEmit + vite build -> dist/
npm run typecheck
```

## What's wired (scope: core flow)

| Screen | Route | Backend |
|---|---|---|
| Sign in / Sign up | `/` | `POST /auth/login`, `POST /auth/register` (then auto-login) |
| Dashboard | `/dashboard` | `GET /dashboard`, `/dashboard/recent-invoices`, `/dashboard/low-stock` |
| Upload note | `/upload` | `POST /extract` (field `file`) then `POST /match/{jobId}` |
| Review & confirm | `/review` | `GET /stock`, `POST /customers` (if named), `POST /confirm` |
| Invoice | `/invoice/:invoiceId` | `GET /invoices/{id}`, `GET /invoices/{id}/pdf` |
| Stock catalog | `/catalog` | `GET/POST/PATCH/DELETE /stock` |
| Transactions | `/transactions` | `GET /invoices` |

`RequireAuth` redirects to `/` when there is no `access_token` in `localStorage`
(same key the old `frontend/` uses).

## Adapted from the prototype

- Auth swapped from Supabase to the backend's JWT bearer flow.
- All `localStorage` demo data (`src/lib/data.ts` `store`) replaced with real
  endpoints + React Query hooks.
- Field names follow the backend (snake_case). Currency is ₹.
- Line prices come from the matched catalog item's `unit_price` — the backend's
  extraction returns only `raw_text` / `qty` / `unit`, no price.
- Password minimum is 8 (backend rule).
- Removed the prototype's "export transaction history PDF" button — no such
  backend route. Per-invoice PDF works.

## Not yet ported (deferred)

Customers, Payments, Business settings, Invoices-list pagination/filters. The old
`frontend/` still has these against the same backend.
