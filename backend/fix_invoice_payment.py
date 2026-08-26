import uuid

from app.repositories.factory import (
    get_invoice_repository,
    get_payment_repository,
)

INVOICE_ID = uuid.UUID(
    "c794594b-f8fd-4ed5-8c8d-cefb4b11a468"
)

invoice_repository = get_invoice_repository()
payment_repository = get_payment_repository()

invoice = invoice_repository.get(INVOICE_ID)

if invoice is None:
    raise SystemExit("Invoice not found")

payments = payment_repository.list_by_invoice(INVOICE_ID)

paid_amount = sum(
    payment.amount
    for payment in payments
)

payment_methods = {
    payment.payment_method
    for payment in payments
}

if len(payment_methods) == 0:
    invoice.payment_method = None
elif len(payment_methods) == 1:
    invoice.payment_method = next(iter(payment_methods))
else:
    invoice.payment_method = "multiple"

if paid_amount >= invoice.total_amount:
    invoice.payment_status = "paid"
elif paid_amount > 0:
    invoice.payment_status = "partial"
else:
    invoice.payment_status = "pending"

invoice_repository.update(invoice)

print("Invoice updated successfully")
print("Invoice:", invoice.invoice_number)
print("Total:", invoice.total_amount)
print("Paid:", paid_amount)
print("Payment methods:", payment_methods)
print("Payment status:", invoice.payment_status)
print("Payment method:", invoice.payment_method)
