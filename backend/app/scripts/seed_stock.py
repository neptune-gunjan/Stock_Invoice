"""
Bulk-load an initial stock catalog from a CSV file.

Usage:
    uv run python -m app.scripts.seed_stock data/seed_stock.csv

CSV columns: name,unit,unit_price,quantity_available,aliases
`aliases` is a "|"-separated list, e.g. "aata|flour". Leave blank for none.
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

from app.config import get_settings
from app.repositories.factory import build_stock_repository
from app.schemas.stock import StockCreate
from app.services.stock_service import StockService


def seed_from_csv(csv_path: Path, service: StockService) -> int:
    count = 0
    with csv_path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            aliases_raw = row.get("aliases") or ""
            data = StockCreate(
                name=row["name"],
                unit=row["unit"],
                unit_price=float(row["unit_price"]),
                quantity_available=float(row["quantity_available"]),
                aliases=[alias.strip() for alias in aliases_raw.split("|") if alias.strip()],
            )
            service.create_stock(data)
            count += 1
    return count


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: uv run python -m app.scripts.seed_stock <path-to-csv>")
        raise SystemExit(1)

    csv_path = Path(sys.argv[1])
    if not csv_path.exists():
        print(f"CSV file not found: {csv_path}")
        raise SystemExit(1)

    repository = build_stock_repository(get_settings())
    service = StockService(repository)
    count = seed_from_csv(csv_path, service)
    print(f"Seeded {count} stock item(s) from {csv_path}")


if __name__ == "__main__":
    main()
