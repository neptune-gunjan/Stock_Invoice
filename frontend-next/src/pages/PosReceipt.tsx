import { useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { Printer, ArrowLeft } from 'lucide-react';
import { useBusiness, useInvoice, useTransaction, money, useCustomers } from '@/lib/data';
import { QRCodeSVG } from 'qrcode.react';

export function PosReceipt() {
  const params = useParams();
  const invoiceId = params.id;
  const invoice = useInvoice(invoiceId || '');
  const transaction = useTransaction(invoice.data?.transaction_id || '');
  const business = useBusiness();
  const customers = useCustomers();

  // removed auto-print


  if (invoice.isLoading || transaction.isLoading || business.isLoading || customers.isLoading) {
    return <div className="p-4 font-mono text-sm">Loading receipt...</div>;
  }

  if (!invoice.data || !transaction.data || !business.data) {
    return <div className="p-4 font-mono text-sm text-red-600">Error loading receipt</div>;
  }

  const { items } = transaction.data;
  const b = business.data;
  const customer = customers.data?.find(c => c.id === invoice.data.customer_id);

  return (
    <>
      <div className="bg-white text-black p-4 pb-24" style={{ width: '80mm', margin: '0 auto', fontFamily: 'monospace', fontSize: '12px' }}>
        <style>{`
          @media print {
            @page { margin: 0; }
            body { margin: 0; background: white; }
            /* Hide everything else if rendered inside the app shell (though this route should be standalone) */
            .app-shell { display: none !important; }
            .no-print { display: none !important; }
          }
        `}</style>
        
        <div className="text-center mb-4">
          <h1 className="font-bold text-xl uppercase">{b.business_name}</h1>
          {b.address && <p>{b.address}</p>}
          {b.phone && <p>Ph: {b.phone}</p>}
          {b.gst_number && <p>GSTIN: {b.gst_number}</p>}
          <p className="mt-2 border-b border-black border-dashed pb-2 font-bold">
            TAX INVOICE
          </p>
        </div>

        <div className="mb-4 text-xs">
          <p><strong>Inv No:</strong> {invoice.data.invoice_number}</p>
          <p><strong>Date:</strong> {new Date(invoice.data.created_at).toLocaleDateString()}</p>
          {invoice.data.due_date && <p><strong>Due:</strong> {new Date(invoice.data.due_date).toLocaleDateString()}</p>}
          <p><strong>Customer:</strong> {customer?.name || (invoice.data as any).customer_name || 'Cash Sale'}</p>
          {customer?.gst_number && <p><strong>GSTIN:</strong> {customer.gst_number}</p>}
        </div>

        <table className="w-full text-xs text-left mb-4 border-b border-black border-dashed pb-2">
          <thead>
            <tr className="border-b border-black border-dashed">
              <th className="py-1">Item</th>
              <th className="py-1 text-right">Qty</th>
              <th className="py-1 text-right">Rate</th>
              <th className="py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-1 pr-1">{item.stock_name}</td>
                <td className="py-1 text-right">{item.qty}</td>
                <td className="py-1 text-right">{item.unit_price}</td>
                <td className="py-1 text-right">{money(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between font-bold text-sm mb-1">
          <span>SUBTOTAL:</span>
          <span>{money(transaction.data.subtotal)}</span>
        </div>
        {transaction.data.discount > 0 && (
          <div className="flex justify-between text-xs mb-1">
            <span>Discount:</span>
            <span>- {money(transaction.data.discount)}</span>
          </div>
        )}
        {transaction.data.tax > 0 && (
          <>
            {(b.gst_number && customer?.gst_number && b.gst_number.substring(0, 2) !== customer.gst_number.substring(0, 2)) ? (
              <div className="flex justify-between text-xs mb-1">
                <span>IGST:</span>
                <span>{money(transaction.data.tax)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-xs mb-1">
                  <span>CGST:</span>
                  <span>{money(transaction.data.tax / 2)}</span>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span>SGST:</span>
                  <span>{money(transaction.data.tax / 2)}</span>
                </div>
              </>
            )}
          </>
        )}
        <div className="flex justify-between font-bold text-sm mb-1">
          <span>TOTAL:</span>
          <span>{money(invoice.data.total_amount)}</span>
        </div>
        <div className="flex justify-between text-xs mb-1">
          <span>Paid:</span>
          <span>{money(invoice.data.paid_amount || 0)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm border-t border-black border-dashed pt-2 mt-2 mb-4">
          <span>BALANCE:</span>
          <span>{money(invoice.data.total_amount - (invoice.data.paid_amount || 0))}</span>
        </div>

        {(invoice.data.total_amount - (invoice.data.paid_amount || 0)) > 0 && b.upi_vpa && (
          <div className="text-center mt-6 flex flex-col items-center">
            <p className="font-bold text-xs mb-2 border border-black border-dashed px-2 py-1 inline-block">SCAN TO PAY</p>
            <QRCodeSVG 
              value={`upi://pay?pa=${b.upi_vpa}&pn=${encodeURIComponent(b.business_name || 'Shop')}&am=${(invoice.data.total_amount - (invoice.data.paid_amount || 0))}&cu=INR`}
              size={120}
              className="mb-1"
            />
            <p className="text-[10px] text-gray-500 font-mono">{b.upi_vpa}</p>
          </div>
        )}

        {b.bank_name && b.bank_account_number && b.bank_ifsc && (
          <div className="mt-4 border-t border-black border-dashed pt-2 text-[10px]">
            <p className="font-bold">BANK DETAILS</p>
            <p>Bank: {b.bank_name}</p>
            <p>A/C: {b.bank_account_number}</p>
            <p>IFSC: {b.bank_ifsc}</p>
          </div>
        )}

        <div className="text-center mt-6 text-xs">
          <p>Thank you for your business!</p>
          <p className="mt-4 text-[10px] text-gray-500">stock.invoice desk</p>
        </div>
      </div>
      
      {/* Floating Action Bar */}
      <div className="no-print fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 p-4 flex justify-center gap-4 z-50 shadow-2xl">
        <Link href={`/invoice/${invoiceId}`} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl font-bold transition">
          <ArrowLeft size={18} />
          Back to Invoice
        </Link>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-primary hover:brightness-110 text-primary-foreground px-5 py-2.5 rounded-xl font-bold transition"
        >
          <Printer size={18} />
          Print Receipt
        </button>
      </div>
    </>
  );
}
