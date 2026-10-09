with open('frontend-next/src/lib/data.ts', 'r', encoding='utf-8') as f:
    data = f.read()

# Add the endpoint safely
import re
data = re.sub(
    r'(invoicePdf:\s*\(id:\s*string\)\s*=>\s*apiBlob\(/invoices/\$\{id\}/pdf\),)',
    r'\1\n\n  exportCsv: () => apiBlob(/invoices/export/csv),',
    data
)

with open('frontend-next/src/lib/data.ts', 'w', encoding='utf-8') as f:
    f.write(data)
