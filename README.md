# Stock & Invoice POS System

A modern, fast, and fully-featured Point of Sale (POS) and Inventory Management system built for wholesale and retail businesses.

## 🚀 Features

This system covers the entire lifecycle of a wholesale billing operation:

1. **⭐ Billing Editor**: Advanced invoice creation with real-time stock updates.
2. **⭐ Extraction → Review**: AI-assisted invoice parsing (extract items from uploaded distributor bills).
3. **⭐ Editable Rates**: Easily adjust selling prices dynamically on the fly during billing.
4. **⭐ Discounts**: Support for both item-level wholesale trade discounts and global bill discounts.
5. **⭐ Quick Bill ⚡**: A lightning-fast, keyboard-friendly interface for rapid checkout.
6. **⭐ Product Search**: Blazing fast typeahead search by Name, SKU, or Aliases.
7. **⭐ Customer Khata (Credit)**: Track outstanding balances, credit limits, and complete customer ledgers.
8. **⭐ Payments**: Record Cash, UPI, Card, or Bank Transfers against specific invoices.
9. **⭐ Purchase / Stock In**: Dedicated workflow to intake stock from suppliers and automatically update inventory.
10. **⭐ GST + HSN**: Full compliance with item-level GST % rates and HSN code tracking.
11. **⭐ Invoice Formats**: Professional PDF generation and thermal POS receipt printing support.
12. **⭐ WhatsApp Integration**: Send invoices and payment links directly to customers via WhatsApp.
13. **⭐ Reports & Analytics**: Deep insights into Gross Sales, Net Profit, GST Collected, and Top Selling Products.

---

## 🛠️ Tech Stack

### Frontend (Client)
- **Framework**: React 18 + Vite
- **Routing**: Wouter (lightweight & fast)
- **State Management**: TanStack React Query (data fetching & caching)
- **Styling**: Tailwind CSS + Lucide Icons
- **Components**: Custom, accessible UI components built for speed and density.

### Backend (Server)
- **Framework**: FastAPI (Python)
- **Architecture**: Domain-Driven Design (Routers -> Services -> Repositories)
- **Storage**: Local JSON-based Document Store (`app/repositories/data/`). *Note: Designed with the Repository pattern, making it trivial to swap to PostgreSQL or MongoDB in the future.*
- **Security**: JWT-based Authentication (HTTPBearer).
- **PDF Generation**: ReportLab for A4 invoices.

---

## 🏁 Getting Started

### 1. Start the Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or `.venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`. You can view the automatic Swagger documentation at `http://localhost:8000/docs`.

### 2. Start the Frontend (React + Vite)

```bash
cd frontend-next
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port Vite specifies).

### 3. Default Login

If you haven't registered a business yet, the system allows you to sign up directly from the login screen to create a new Tenant workspace.

---

## 📂 Project Structure

```text
Stock_Invoice/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI application entrypoint
│   │   ├── dependencies.py       # Dependency Injection container
│   │   ├── routers/              # HTTP API Endpoints (Controllers)
│   │   ├── services/             # Business Logic & Tax Math
│   │   ├── repositories/         # Data Access Layer (JSON Store)
│   │   ├── models/               # Internal Domain Models
│   │   └── schemas/              # Pydantic Request/Response Models
├── frontend-next/
│   ├── src/
│   │   ├── App.tsx               # Main Router & Layouts
│   │   ├── pages/                # Page Components (QuickBill, Reports, etc.)
│   │   ├── components/           # Shared UI Components
│   │   ├── lib/                  # API Client & React Query Hooks
│   │   └── index.css             # Tailwind Directives
```

## 🤝 Architecture Notes
- **Tax Calculation**: Taxes are calculated at the item-level based on the product's `gst_rate`. Global discounts are pro-rated across all line items before tax is applied to ensure accurate GST compliance.
- **Stock Movements**: Inventory is strictly tracked through an append-only `StockMovement` ledger (Purchases, Sales, Returns). 
- **Tenancy**: The backend supports multi-tenancy. Every entity is tied to a `business_id`, ensuring secure data isolation between different shops using the same instance.
