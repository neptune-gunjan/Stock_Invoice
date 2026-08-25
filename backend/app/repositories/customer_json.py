"""JSON-file-backed CustomerRepository."""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

from app.models.customer import Customer
from app.repositories.customer import CustomerRepository
from app.repositories.json_store import JsonCollection


class JsonFileCustomerRepository(CustomerRepository):
    def __init__(self, file_path: Path) -> None:
        self._store: JsonCollection[Customer] = JsonCollection(file_path, Customer)

    def list_active(self) -> list[Customer]:
        return [c for c in self._store.read_all() if c.is_active]

    def get(self, customer_id: uuid.UUID) -> Optional[Customer]:
        for customer in self._store.read_all():
            if customer.id == customer_id:
                return customer
        return None

    def add(self, customer: Customer) -> Customer:
        with self._store.lock:
            customers = self._store.read_all()
            customers.append(customer)
            self._store.write_all(customers)
        return customer
