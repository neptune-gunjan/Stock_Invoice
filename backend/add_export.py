import re

with open('app/routers/invoice.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Response to imports if not there
if 'from fastapi import APIRouter, Depends' in content:
    content = content.replace(
        'from fastapi import APIRouter, Depends',
        'from fastapi import APIRouter, Depends, Response'
    )

import_csv = "import csv\nimport io\n"
if "import csv" not in content:
    content = import_csv + content

export_route = '''
@router.get(
    "/export/csv",
    summary="Export all invoices to CSV",
)
def export_invoices_csv(
    service: InvoiceService = Depends(get_invoice_service),
    current_user: User = Depends(get_current_user),
):
    invoices = service.list_all(current_user.business_id)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Invoice Number", "Date", "Customer ID", 
        "Subtotal", "Discount", "Tax Rate", "Tax Amount", 
        "Total Amount", "Status", "Payment Status", "Payment Method"
    ])
    
    for inv in invoices:
        writer.writerow([
            inv.invoice_number,
            inv.created_at.strftime("%Y-%m-%d %H:%M:%S") if inv.created_at else "",
            str(inv.customer_id) if inv.customer_id else "",
            inv.subtotal,
            inv.discount,
            inv.tax_rate,
            inv.tax_amount,
            inv.total_amount,
            inv.status,
            inv.payment_status,
            inv.payment_method or ""
        ])
    
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=invoices_export.csv"
    return response

'''

# Insert the export_route before list_invoices
content = content.replace(
    '@router.get(\n    "",\n    response_model=list[InvoiceRead],',
    export_route + '\n@router.get(\n    "",\n    response_model=list[InvoiceRead],'
)

with open('app/routers/invoice.py', 'w', encoding='utf-8') as f:
    f.write(content)
