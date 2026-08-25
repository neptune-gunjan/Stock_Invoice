# Phase 6 — Customers & Transaction History

## Goal
Link transactions to specific customers so the shopkeeper can look up past
orders, running balances, and generate invoices that reference customer
history — the original end goal from the project brief.

## Why this phase comes last
Everything before this (catalog, extraction, matching, review, invoicing)
needs to work reliably on its own first. Customer linking is additive on
top of a working core loop — building it earlier risks debugging two
unstable systems at once.

## Functionality to build

1. `customers` table: id, name, phone, created_at, deleted_at
2. `POST /customers` — create a customer
3. `GET /customers/{id}/transactions` — list all past transactions for a
   customer, with totals and dates
4. Update `transactions` to include an optional `customer_id` FK
5. Update the review screen (Phase 4) to let the shopkeeper select or
   create a customer before confirming
6. Update the invoice template (Phase 5) to include customer name/phone
   and, optionally, a running balance if credit is tracked
7. Optional (later, not MVP): simple search — "what did Ramesh buy last
   month" — a straightforward filtered query, no AI needed

## Data model addition

`customers`:
| Column | Type |
|---|---|
| id | UUID |
| name | text |
| phone | text nullable |
| created_at | timestamptz |
| deleted_at | timestamptz nullable |

`transactions.customer_id` — UUID nullable FK → customers.id

## Acceptance criteria

- Can create a customer and link a transaction to them
- Can retrieve a customer's full transaction history
- Invoice PDF correctly shows customer name when linked
- Existing anonymous transactions (from earlier phases) still work without
  a customer_id — this field must stay nullable

## Out of scope for this phase
- No predictive/AI-based suggestions based on history — that's a future
  enhancement, not part of this build plan
