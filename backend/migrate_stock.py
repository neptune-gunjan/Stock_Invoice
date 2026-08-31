import json
from pathlib import Path

STOCK_FILE = Path("data/stock.json")

BUSINESS_ID = "47e94aac-839d-4d4e-81ca-c079f15e419f"

with STOCK_FILE.open("r", encoding="utf-8") as f:
    stock = json.load(f)

updated = 0

for item in stock:
    if "business_id" not in item:
        item["business_id"] = BUSINESS_ID
        updated += 1

with STOCK_FILE.open("w", encoding="utf-8") as f:
    json.dump(stock, f, indent=2, ensure_ascii=False)

print(f"Migration completed.")
print(f"Total stock items: {len(stock)}")
print(f"Updated items: {updated}")
