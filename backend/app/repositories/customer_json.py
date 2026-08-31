"""JSON-file-backed CustomerRepository."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.models.customer import Customer
from app.repositories.customer import CustomerRepository
from app.repositories.json_store import JsonCollection


class JsonFileCustomerRepository(CustomerRepository):

    def __init__(self, file_path: Path) -> None:
        self._store: JsonCollection[Customer] = JsonCollection(
            file_path,
            Customer,
        )

    def list_active(
        self,
        business_id: uuid.UUID,
    ) -> list[Customer]:

        return [
            customer
            for customer in self._store.read_all()
            if (customer.business_id == business_id
            and customer.is_active)
        ]

    def get(
        self,
        customer_id: uuid.UUID,
    ) -> Optional[Customer]:

        for customer in self._store.read_all():
            if customer.id == customer_id:
                return customer

        return None

    def add(
        self,
        customer: Customer,
    ) -> Customer:

        with self._store.lock:
            customers = self._store.read_all()

            customers.append(customer)

            self._store.write_all(customers)

        return customer

    def update(
        self,
        customer: Customer,
    ) -> Customer:

        with self._store.lock:
            customers = self._store.read_all()

            for index, existing in enumerate(customers):

                if existing.id == customer.id:
                    customers[index] = customer

                    self._store.write_all(customers)

                    return customer

        raise ValueError(
            f"Customer not found: {customer.id}"
        )

    def delete(
        self,
        customer_id: uuid.UUID,
    ) -> bool:

        with self._store.lock:
            customers = self._store.read_all()

            for index, customer in enumerate(customers):

                if (
                    customer.id == customer_id
                    and customer.is_active
                ):
                    now = datetime.now(timezone.utc)

                    customer.deleted_at = now
                    customer.updated_at = now

                    customers[index] = customer

                    self._store.write_all(customers)

                    return True

        return False