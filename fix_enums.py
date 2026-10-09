import re

with open('backend/app/routers/invoice.py', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("inv.status,", "inv.status.value if hasattr(inv.status, 'value') else inv.status,")
code = code.replace("inv.payment_status,", "inv.payment_status.value if hasattr(inv.payment_status, 'value') else inv.payment_status,")

with open('backend/app/routers/invoice.py', 'w', encoding='utf-8') as f:
    f.write(code)

