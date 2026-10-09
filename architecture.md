# Architecture Overview

## The Challenge
Wholesale billing software is notoriously bloated, slow, and overly complex for small business owners. The goal of this project is to build an extremely fast, offline-capable (via Vite dev server) POS system that strips away the bloat while retaining enterprise features like Multi-Tenancy, P&L reporting, and Customer Khata (Credit).

## Design Philosophy
1. **Speed First**: The `ReviewPage` (Quick Bill) is designed to be fully navigable via keyboard. Typeahead search for products resolves in <50ms.
2. **Domain-Driven Design (DDD)**: The Python backend separates concerns into `Routers` (HTTP), `Services` (Business Logic), and `Repositories` (Data layer).
3. **Flexible Storage**: We implemented a `JsonStore` for zero-config deployments, but all data access goes through abstract base classes (`StockRepository`, `InvoiceRepository`). Swapping to PostgreSQL requires writing exactly 1 new class per entity, with zero changes to the service logic.

## Key Workflows

### 1. Invoice Generation (`/api/transactions/confirm`)
When an invoice is confirmed:
1. Calculates global discount pro-rated across items.
2. Calculates precise item-level GST.
3. Debits stock quantities via `StockMovementRepository`.
4. Saves the `Transaction`, `Invoice`, and `TransactionItem`s.
5. Optionally applies the initial `Payment` (if the customer paid immediately).

### 2. WhatsApp Integration (`/api/whatsapp`)
Connects to the Meta Graph API to send PDF receipts and dynamic UPI payment links directly to the customer's phone number.

### 3. AI Extraction (`/api/extract`)
Uses the `gemini-2.5-flash` model to read supplier invoices (PDF/Image) and extract line items into structured JSON, which are then fuzzy-matched against the local catalog.
