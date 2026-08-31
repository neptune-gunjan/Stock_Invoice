"""Business rules for customers."""

from __future__ import annotations

import uuid
from typing import Optional

from app.models.customer import Customer
from app.repositories.customer import CustomerRepository
from app.schemas.customer import CustomerCreate


class CustomerNotFoundError(Exception):

    def __init__(
        self,
        customer_id: uuid.UUID,
    ) -> None:
        self.customer_id = customer_id
        super().__init__(
            f"customer {customer_id} not found"
        )


class CustomerService:

    def __init__(
        self,
        repository: CustomerRepository,
    ) -> None:
        self._repository = repository

    def list_customers(
        self,
        business_id: uuid.UUID,
    ) -> list[Customer]:

        return self._repository.list_active(
            business_id=business_id
        )

    def create_customer(
        self,
        data: CustomerCreate,
        business_id: uuid.UUID,
    ) -> Customer:

        customer = Customer(
            id=uuid.uuid4(),
            business_id=business_id,
            name=data.name,
            phone=data.phone,
        )

        return self._repository.add(customer)

    def get_active(
        self,
        customer_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> Optional[Customer]:

        customer = self._repository.get(customer_id)

        if (
            customer is None
            or not customer.is_active
            or customer.business_id != business_id
        ):
            return None

        return customer

    def require_active(
        self,
        customer_id: uuid.UUID,
        business_id: uuid.UUID,
    ) -> Customer:

        customer = self.get_active(
            customer_id,
            business_id,
        )

        if customer is None:
            raise CustomerNotFoundError(customer_id)

        return customer