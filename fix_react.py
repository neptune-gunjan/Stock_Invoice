with open('frontend-next/src/pages/TransactionsPage.tsx', 'r', encoding='utf-8') as f:
    page = f.read()

page = page.replace("const [exporting, setExporting] = React.useState(false);", "const [exporting, setExporting] = useState(false);")

with open('frontend-next/src/pages/TransactionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(page)
