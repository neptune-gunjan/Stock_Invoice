import re

with open('frontend-next/src/pages/TransactionsPage.tsx', 'r', encoding='utf-8') as f:
    page = f.read()

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
                New invoice
              </Link>
            </div>'''

page = re.sub(
    r'action=\{\s*<Link\s*href="/upload"\s*className=\{buttonPrimary\}\s*data-testid="link-new-transaction"\s*>\s*<FilePlus2 size=\{17\} />\s*New invoice\s*</Link>\s*\}',
    'action={' + new_action + '}',
    page
)

with open('frontend-next/src/pages/TransactionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(page)

