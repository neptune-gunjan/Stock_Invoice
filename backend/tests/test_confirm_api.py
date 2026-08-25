from __future__ import annotations

from fastapi.testclient import TestClient


def _create_stock(client: TestClient) -> dict:
    response = client.post(
        "/stock",
        json={"name": "Atta", "unit": "kg", "unit_price": 45, "quantity_available": 10, "aliases": []},
    )
    assert response.status_code == 201
    return response.json()


def test_confirm_flow_decrements_stock_and_returns_transaction(client: TestClient) -> None:
    stock = _create_stock(client)

    response = client.post("/confirm", json={"items": [{"stock_id": stock["id"], "qty": 3}]})
    assert response.status_code == 201, response.text
    transaction = response.json()
    assert transaction["total_amount"] == 135
    assert transaction["items"][0]["stock_name"] == "Atta"

    updated_stock = client.get("/stock").json()[0]
    assert updated_stock["quantity_available"] == 7

    fetched = client.get(f"/transactions/{transaction['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == transaction["id"]


def test_confirm_insufficient_stock_returns_409(client: TestClient) -> None:
    stock = _create_stock(client)
    response = client.post("/confirm", json={"items": [{"stock_id": stock["id"], "qty": 999}]})
    assert response.status_code == 409


def test_confirm_requires_at_least_one_item(client: TestClient) -> None:
    response = client.post("/confirm", json={"items": []})
    assert response.status_code == 422


def test_confirm_unknown_stock_returns_404(client: TestClient) -> None:
    response = client.post(
        "/confirm",
        json={"items": [{"stock_id": "00000000-0000-0000-0000-000000000000", "qty": 1}]},
    )
    assert response.status_code == 404
