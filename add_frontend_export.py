import re

# Update data.ts
with open('frontend-next/src/lib/data.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("invoicePdf: (id: string) =>\n    apiBlob(/invoices//pdf),", "invoicePdf: (id: string) =>\n    apiBlob(/invoices//pdf),\n\n  exportCsv: () => apiBlob(/invoices/export/csv),")

with open('frontend-next/src/lib/data.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# Update TransactionsPage.tsx
with open('frontend-next/src/pages/TransactionsPage.tsx', 'r', encoding='utf-8') as f:
    page = f.read()

# Add download state to TransactionsPage component
page = page.replace("export default function TransactionsPage() {", "export default function TransactionsPage() {\n  const [exporting, setExporting] = useState(false);\n  const handleExport = async () => {\n    setExporting(true);\n    try {\n      const blob = await endpoints.exportCsv();\n      const url = URL.createObjectURL(blob);\n      const a = document.createElement('a');\n      a.href = url;\n      a.download = 'sales_export.csv';\n      a.click();\n      URL.revokeObjectURL(url);\n    } catch (e) {\n      console.error(e);\n    } finally {\n      setExporting(false);\n    }\n  };\n")

# Make sure useState is imported correctly, usually it's in the App.tsx if all pages are in one file, 
# wait, TransactionsPage imports useState? Let's check if useState is imported.
# Assuming it is, or we can use React.useState
page = page.replace("useState(false);", "React.useState(false);") # lazy way

# Replace the action in PageHeading
new_action = '''<div className="flex gap-2">
              <button
                onClick={handleExport}
                disabled={exporting}
                className={buttonQuiet}
              >
                <Download size={17} />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
              <Link
                href="/upload"
                className={buttonPrimary}
                data-testid="link-new-transaction"
              >
                <FilePlus2 size={17} />
                Create invoice
              </Link>
            </div>'''

# regex to replace the action prop block safely
page = re.sub(
    r'action=\{\s*<Link\s*href="/upload"\s*className=\{buttonPrimary\}\s*data-testid="link-new-transaction"\s*>\s*<FilePlus2 size=\{17\} />\s*Create invoice\s*</Link>\s*\}',
    'action={' + new_action + '}',
    page
)

with open('frontend-next/src/pages/TransactionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(page)

