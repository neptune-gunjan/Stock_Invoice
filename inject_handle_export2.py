import re

with open('frontend-next/src/pages/TransactionsPage.tsx', 'r', encoding='utf-8') as f:
    page = f.read()

handle_export_code = '''
  const [exporting, setExporting] = React.useState(false);
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

# Remove any existing handleExport just in case it got injected at the bottom of the file somehow
page = re.sub(r'\n\s*const \[exporting, setExporting\] = useState\(false\);\s*const handleExport = async \(\) => \{.*?\}\s*;\s*', '', page, flags=re.DOTALL)
page = re.sub(r'\n\s*const \[exporting, setExporting\] = React\.useState\(false\);\s*const handleExport = async \(\) => \{.*?\}\s*;\s*', '', page, flags=re.DOTALL)

page = page.replace("function TransactionsPage() {", "function TransactionsPage() {" + handle_export_code)

with open('frontend-next/src/pages/TransactionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(page)
