const fs = require('fs');
const path = 'frontend-next/src/pages/CustomerDetailPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const stateInject = `const [paymentInvoice, setPaymentInvoice] =
    useState<string | null>(null);
  const [showBulkPayment, setShowBulkPayment] = useState(false);`;
content = content.replace(/const\s+\[paymentInvoice,\s*setPaymentInvoice\]\s*=\s*useState<string\s*\|\s*null>\(null\);/, stateInject);

const bulkPaymentCode = `
  const submitBulkPayment = async () => {
    const totalToPay = Number(paymentAmount);
    if (!Number.isFinite(totalToPay) || totalToPay <= 0) {
      setPaymentError('Enter a valid amount.');
      return;
    }
    if (totalToPay > remainingAmount) {
      setPaymentError('Payment cannot exceed total outstanding.');
      return;
    }

    setPaymentSaving(true);
    setPaymentError('');

    try {
      let amountLeft = totalToPay;
      const sortedInvoices = [...dueInvoices].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      for (const invoice of sortedInvoices) {
        if (amountLeft <= 0) break;
        const rem = Number(invoice.remaining_amount || 0);
        if (rem <= 0) continue;
        
        const payForThis = Math.min(amountLeft, rem);
        await endpoints.addPayment(invoice.id, {
          amount: payForThis,
          payment_method: paymentMethod,
        });
        amountLeft -= payForThis;
      }

      setPaymentAmount('');
      setShowBulkPayment(false);

      await Promise.all([
        transactions.refetch(),
        ledger.refetch(),
      ]);
    } catch (e) {
      setPaymentError(errorMessage(e, 'Could not record bulk payment.'));
    } finally {
      setPaymentSaving(false);
    }
  };

  const submitRetailerPayment = async (`
content = content.replace('  const submitRetailerPayment = async (', bulkPaymentCode);

const newHeader = `{/* Header */}
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-primary to-blue-600 text-3xl font-extrabold text-white shadow-xl shadow-primary/20">
              {customer.name?.trim()?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="mono text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Retailer Ledger</p>
              <h1 className="mt-1 truncate text-3xl font-extrabold tracking-[-.04em] sm:text-4xl text-foreground">{customer.name}</h1>
            </div>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-4 rounded-3xl bg-card border border-border p-5 shadow-sm min-w-[300px]">
            <div className="flex items-end gap-3 w-full justify-between lg:justify-end">
              <div>
                <p className="mono text-[10px] uppercase tracking-wider text-muted-foreground">Total Amount Due</p>
                <p className={\`mt-1 font-mono text-3xl font-extrabold \${remainingAmount > 0 ? 'text-destructive' : 'text-emerald-600'}\`}>{money(remainingAmount)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full lg:justify-end mt-1">
              {remainingAmount > 0 && (
                <button
                  onClick={() => {
                    setPaymentAmount(String(remainingAmount));
                    setPaymentMethod('cash');
                    setPaymentError('');
                    setShowBulkPayment(true);
                  }}
                  className={\`\${buttonPrimary} bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto shadow-lg shadow-emerald-600/20\`}
                >
                  <Check size={16} /> Receive Payment
                </button>
              )}
              {remainingAmount > 0 && customer.phone && (
                <button
                  onClick={() => {
                    const businessName = business.data?.business_name || 'our shop';
                    const text = \`Hi \${customer.name},\\n\\nThis is a gentle reminder from \${businessName} regarding your outstanding Khata balance of ₹\${remainingAmount}.\\n\\nPlease clear it at your earliest convenience.\\n\\nThank you!\`;
                    window.open(\`https://wa.me/\${(customer.phone || '').replace(/\\D/g, '')}?text=\${encodeURIComponent(text)}\`, '_blank');
                  }}
                  className={buttonQuiet}
                  title="Send WhatsApp Reminder"
                >
                  <MessageCircle size={16} className="text-green-600" />
                </button>
              )}
              <button onClick={() => window.open(\`/statement/\${customerId}\`, '_blank')} className={buttonQuiet} title="Print Statement">
                <Printer size={16} />
              </button>
              <Link href="/upload" className={buttonQuiet} title="New Invoice">
                <FilePlus2 size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* Retailer profile */}`;

content = content.replace(/\{\/\* Header \*\/\}[\s\S]*?\{\/\* Retailer profile \*\/\}/, newHeader);

const modalCode = `      </div>

      {showBulkPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl rise-in">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-extrabold">Receive Payment</h3>
                <p className="text-xs text-muted-foreground mt-1">Auto-allocates to oldest unpaid invoices.</p>
              </div>
              <button onClick={() => setShowBulkPayment(false)} className="text-muted-foreground hover:text-foreground bg-muted p-2 rounded-full">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Amount Received</label>
                <input
                  type="number"
                  min="0.01"
                  max={remainingAmount}
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-lg font-mono outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Payment Mode</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              {paymentError && <p className="text-sm font-semibold text-destructive">{paymentError}</p>}
              
              <button 
                onClick={submitBulkPayment}
                disabled={paymentSaving}
                className="w-full mt-4 bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20"
              >
                {paymentSaving ? 'Recording...' : \`Record Payment of \${money(Number(paymentAmount) || 0)}\`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>`;

content = content.replace('      </div>\n    </AppShell>', modalCode);

fs.writeFileSync(path, content, 'utf8');
console.log('done');
