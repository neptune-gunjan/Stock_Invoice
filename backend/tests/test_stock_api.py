from __future__ import annotations

from fastapi.testclient import TestClient


def _create(client: TestClient, **overrides) -> dict:
    payload = {
        "name": "Atta",
        "unit": "kg",
        "unit_price": 45,
        "quantity_available": 120,
        "aliases": ["aata", "flour"],
        **overrides,
    }
    response = client.post("/stock", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_and_list_stock(client: TestClient) -> None:
    created = _create(client)
    assert created["name"] == "Atta"
    assert created["aliases"] == ["aata", "flour"]

    listed = client.get("/stock").json()
    assert len(listed) == 1
    assert listed[0]["id"] == created["id"]


def test_update_stock_patches_only_provided_fields(client: TestClient) -> None:
    created = _create(client)

    response = client.patch(f"/stock/{created['id']}", json={"quantity_available": 90})
    assert response.status_code == 200, response.text
    updated = response.json()

    assert updated["quantity_available"] == 90
    assert updated["unit_price"] == created["unit_price"]
    assert updated["name"] == created["name"]


def test_soft_delete_removes_item_from_listing(client: TestClient) -> None:
    created = _create(client)

    response = client.delete(f"/stock/{created['id']}")
    assert response.status_code == 204

    assert client.get("/stock").json() == []


def test_update_unknown_item_returns_404(client: TestClient) -> None:
    response = client.patch(
        "/stock/00000000-0000-0000-0000-000000000000",
        json={"quantity_available": 1},
    )
    assert response.status_code == 404


def test_delete_unknown_item_returns_404(client: TestClient) -> None:
    response = client.delete("/stock/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


def test_create_rejects_negative_price(client: TestClient) -> None:
    response = client.post(
        "/stock",
        json={"name": "Atta", "unit": "kg", "unit_price": -5, "quantity_available": 10},
    )
    assert response.status_code == 422


def test_aliases_are_deduplicated_and_trimmed(client: TestClient) -> None:
    created = _create(client, aliases=[" aata ", "aata", "flour", ""])
    assert created["aliases"] == ["aata", "flour"]
