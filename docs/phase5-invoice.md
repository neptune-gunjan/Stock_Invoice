# Phase 5 — Deterministic Invoice Generation

## Goal
Turn a confirmed transaction into a clean, formatted PDF invoice — using
plain template rendering, with zero LLM/API calls, so this step is free,
offline-capable, and always produces identical output for identical input.

## Functionality to build

1. `GET /invoice/{transaction_id}` — returns a rendered PDF
   - fetches `transactions` + `transaction_items` (+ `stock` names/units)
     for the given id
   - renders an HTML template (Jinja2) with shop name, date, item table
     (name, qty, unit, rate, line total), grand total
   - converts HTML → PDF using WeasyPrint
   - returns the PDF as a downloadable file
2. Invoice template should include:
   - shop name/logo placeholder, address, date, invoice number
   - itemized table: item, qty, unit, rate, amount
   - grand total, clearly formatted
   - optional customer name (blank if not linked yet — see Phase 6)

## Why WeasyPrint over an LLM-generated PDF
Template rendering guarantees the same transaction always produces
byte-identical formatting. There's no reason to involve an LLM in laying
out a table of numbers — it adds cost, latency, and non-determinism for
zero benefit here.

## Acceptance criteria

- Given a confirmed transaction id, produces a correctly formatted PDF
- Same transaction id always produces the same PDF (deterministic)
- Works with zero network access (verify by disabling network — should
  still generate correctly, since WeasyPrint runs entirely locally)
- Handles the "no customer linked yet" case gracefully (blank customer field)

## Out of scope for this phase
- No customer history lookups yet (Phase 6)
- No emailing/sending the invoice — just generate and return the file for now
