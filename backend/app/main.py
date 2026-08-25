"""FastAPI app entrypoint. Registers one router per phase; see
docs/architecture.md for the full route map and PLAN.md for phase order."""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.confirm import router as confirm_router
from app.routers.customers import router as customers_router
from app.routers.extract import router as extract_router
from app.routers.invoice import router as invoice_router
from app.routers.match import router as match_router
from app.routers.stock import router as stock_router

app = FastAPI(title="Stock & Invoice Assistant")

# Allow the minimal frontend (served from file:// or localhost) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stock_router)
app.include_router(extract_router)
app.include_router(match_router)
app.include_router(confirm_router)
app.include_router(invoice_router)
app.include_router(customers_router)

os.makedirs("uploads", exist_ok=True)


@app.get("/health")
def health():
    return {"status": "ok"}
