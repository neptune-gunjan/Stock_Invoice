"""Persistence contract for customers. Same OCP/DIP seam as
app/repositories/stock.py."""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional

from app.models.customer import Customer


class CustomerRepository(ABC):
    @abstractmethod
    def list_active(self) -> list[Customer]:
        ...

    @abstractmethod
    def get(self, customer_id: uuid.UUID) -> Optional[Customer]:
        ...

    @abstractmethod
    def add(self, customer: Customer) -> Customer:
        ...
