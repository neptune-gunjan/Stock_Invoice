"""Business rules for customers (Phase 6). Depends only on
CustomerRepository (dependency inversion)."""

from __future__ import annotations

import uuid
from typing import Optional

from app.models.customer import Customer
from app.repositories.customer import CustomerRepository
from app.schemas.customer import CustomerCreate


class CustomerNotFoundError(Exception):
    def __init__(self, customer_id: uuid.UUID) -> None:
        self.customer_id = customer_id
        super().__init__(f"customer {customer_id} not found")


class CustomerService:
    def __init__(self, repository: CustomerRepository) -> None:
        self._repository = repository

    def list_customers(self) -> list[Customer]:
        return self._repository.list_active()

    def create_customer(self, data: CustomerCreate) -> Customer:
        return self._repository.add(Customer(name=data.name, phone=data.phone))

    def get_active(self, customer_id: uuid.UUID) -> Optional[Customer]:
        customer = self._repository.get(customer_id)
        if customer is None or not customer.is_active:
            return None
        return customer

    def require_active(self, customer_id: uuid.UUID) -> Customer:
        customer = self.get_active(customer_id)
        if customer is None:
            raise CustomerNotFoundError(customer_id)
        return customer
