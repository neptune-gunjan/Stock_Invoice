import re

with open('frontend-next/src/pages/TransactionsPage.tsx', 'r', encoding='utf-8') as f:
    page = f.read()

handle_export_code = '''
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await endpoints.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sales_export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };
'''

# Check if we already injected it but maybe in the wrong place
if 'const handleExport = async () => {' not in page:
    page = page.replace("function TransactionsPage() {\n  const invoices = useInvoices();", "function TransactionsPage() {\n  const invoices = useInvoices();" + handle_export_code)
    
    with open('frontend-next/src/pages/TransactionsPage.tsx', 'w', encoding='utf-8') as f:
        f.write(page)

