from __future__ import annotations

from fastapi.testclient import TestClient


def test_download_invoice_pdf_for_confirmed_transaction(client: TestClient) -> None:
    stock = client.post(
        "/stock",
        json={"name": "Atta", "unit": "kg", "unit_price": 45, "quantity_available": 10, "aliases": []},
    ).json()
    transaction = client.post(
        "/confirm", json={"items": [{"stock_id": stock["id"], "qty": 2}]}
    ).json()

    response = client.get(f"/invoice/{transaction['id']}")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


def test_invoice_for_unknown_transaction_returns_404(client: TestClient) -> None:
    response = client.get("/invoice/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
