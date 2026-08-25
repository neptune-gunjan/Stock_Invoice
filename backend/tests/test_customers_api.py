from __future__ import annotations

from fastapi.testclient import TestClient


def test_create_and_list_customers(client: TestClient) -> None:
    response = client.post("/customers", json={"name": "Ramesh", "phone": "9999999999"})
    assert response.status_code == 201, response.text
    customer = response.json()

    listed = client.get("/customers").json()
    assert len(listed) == 1
    assert listed[0]["id"] == customer["id"]


def test_confirm_links_transaction_to_customer_and_history_shows_it(client: TestClient) -> None:
    stock = client.post(
        "/stock",
        json={"name": "Atta", "unit": "kg", "unit_price": 45, "quantity_available": 10, "aliases": []},
    ).json()
    customer = client.post("/customers", json={"name": "Ramesh"}).json()

    confirm_response = client.post(
        "/confirm",
        json={"customer_id": customer["id"], "items": [{"stock_id": stock["id"], "qty": 2}]},
    )
    assert confirm_response.status_code == 201
    transaction = confirm_response.json()
    assert transaction["customer_id"] == customer["id"]

    history = client.get(f"/customers/{customer['id']}/transactions")
    assert history.status_code == 200
    history_data = history.json()
    assert len(history_data) == 1
    assert history_data[0]["id"] == transaction["id"]


def test_confirm_without_customer_is_still_allowed(client: TestClient) -> None:
    stock = client.post(
        "/stock",
        json={"name": "Sugar", "unit": "kg", "unit_price": 42, "quantity_available": 10, "aliases": []},
    ).json()
    response = client.post("/confirm", json={"items": [{"stock_id": stock["id"], "qty": 1}]})
    assert response.status_code == 201
    assert response.json()["customer_id"] is None


def test_confirm_unknown_customer_returns_404(client: TestClient) -> None:
    stock = client.post(
        "/stock",
        json={"name": "Rice", "unit": "kg", "unit_price": 60, "quantity_available": 10, "aliases": []},
    ).json()
    response = client.post(
        "/confirm",
        json={
            "customer_id": "00000000-0000-0000-0000-000000000000",
            "items": [{"stock_id": stock["id"], "qty": 1}],
        },
    )
    assert response.status_code == 404


def test_transactions_for_unknown_customer_returns_404(client: TestClient) -> None:
    response = client.get("/customers/00000000-0000-0000-0000-000000000000/transactions")
    assert response.status_code == 404
