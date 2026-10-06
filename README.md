# Stock & Invoice POS System

A modern, fast, and fully-featured Point of Sale (POS) and Inventory Management system built for wholesale and retail businesses.

## 🚀 Features

This system covers the entire lifecycle of a wholesale billing operation:

1. **⭐ Billing Editor**: Advanced invoice creation with real-time stock updates.
2. **⭐ Extraction → Review**: AI-assisted invoice parsing (extract items from uploaded distributor bills using Groq LLM).
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
- **Database**: PostgreSQL (relational database engine)
- **ORM**: SQLAlchemy + psycopg2
- **Migrations**: Alembic
- **Security**: JWT-based Authentication (HTTPBearer)

---

## 🏠 Getting Started

### Prerequisites
- **PostgreSQL**: Must be installed and running on your system (port 5432).
- **Python 3.10+**
- **Node.js 18+**

### 1. Database Setup
Create a local PostgreSQL user and database:
```sql
-- In your PostgreSQL shell (psql):
CREATE USER postgres WITH PASSWORD 'first';
CREATE DATABASE stockapp;
```

### 2. Start the Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or `.venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Create your .env file
cat << 'EOF' > .env
DATABASE_URL=postgresql+psycopg2://postgres:first@localhost:5432/stockapp
# Add your Groq API key here if you want to use the AI extraction features:
# groq_api_key=gsk_...
EOF

# Run database migrations to create the tables
alembic upgrade head

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API will be available at `http://localhost:8000`. Swagger documentation is at `http://localhost:8000/docs`.

### 3. Start the Frontend (React + Vite)
```bash
cd frontend-next
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173` (or the port Vite specifies).

### 4. Default Login
Because the system is multi-tenant, it starts completely empty. Open the frontend in your browser, click **Register**, and create a new account to initialize your business workspace in the database!

---

## 📁 Project Structure

```text
Stock_Invoice/
├── backend/
│   ├── alembic/              # Database migration scripts
│   ├── app/
│   │   ├── main.py           # FastAPI application entrypoint
│   │   ├── dependencies.py   # Dependency Injection container
│   │   ├── config.py         # Pydantic Settings & Environment Variables
│   │   ├── routers/          # HTTP API Endpoints (Controllers)
│   │   ├── services/         # Business Logic & Tax Math
│   │   ├── repositories/     # Data Access Layer (SQLAlchemy)
│   │   ├── models/           # SQLAlchemy SQL Table Definitions
│   │   └── schemas/          # Pydantic Request/Response Models
├── frontend-next/
│   ├── src/
│   │   ├── App.tsx           # Main Router & Layouts
│   │   ├── pages/            # Page Components (QuickBill, Reports, etc.)
│   │   ├── components/       # Shared UI Components
│   │   ├── lib/              # API Client & React Query Hooks
│   │   └── index.css         # Tailwind Directives
```

## 🧠 Architecture Notes
- **Tax Calculation**: Taxes are calculated at the item-level based on the product's `gst_rate`. Global discounts are pro-rated across all line items before tax is applied to ensure accurate GST compliance.
- **Stock Movements**: Inventory is strictly tracked through an append-only `StockMovement` ledger (Purchases, Sales, Returns). 
- **Tenancy**: The backend supports multi-tenancy. Every entity is tied to a `business_id`, ensuring secure data isolation between different shops using the same instance.
