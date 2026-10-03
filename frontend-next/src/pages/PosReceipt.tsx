import { useEffect } from 'react';
import { useParams } from 'wouter';
import { useBusiness, useInvoice, useTransaction, money } from '@/lib/data';

export function PosReceipt() {
  const params = useParams();
  const invoiceId = params.id;
  const invoice = useInvoice(invoiceId || '');
  const transaction = useTransaction(invoice.data?.transaction_id || '');
  const business = useBusiness();

  useEffect(() => {
    if (invoice.data && transaction.data && business.data) {
      // Auto-print when loaded
      setTimeout(() => window.print(), 500);
    }
  }, [invoice.data, transaction.data, business.data]);

  if (invoice.isLoading || transaction.isLoading || business.isLoading) {
    return <div className="p-4 font-mono text-sm">Loading receipt...</div>;
  }

  if (!invoice.data || !transaction.data || !business.data) {
    return <div className="p-4 font-mono text-sm text-red-600">Error loading receipt</div>;
  }

  const { items } = transaction.data;
  const b = business.data;

  return (
    <div className="bg-white text-black p-4" style={{ width: '80mm', margin: '0 auto', fontFamily: 'monospace', fontSize: '12px' }}>
      <style>{`
        @media print {
          @page { margin: 0; }
          body { margin: 0; background: white; }
          /* Hide everything else if rendered inside the app shell (though this route should be standalone) */
          .app-shell { display: none !important; }
        }
      `}</style>
      
      <div className="text-center mb-4">
        <h1 className="font-bold text-xl uppercase">{b.name}</h1>
        {b.address && <p>{b.address}</p>}
        {b.phone && <p>Ph: {b.phone}</p>}
        <p className="mt-2 border-b border-black border-dashed pb-2 font-bold">
          TAX INVOICE
        </p>
      </div>

      <div className="mb-4 text-xs">
        <p><strong>Inv No:</strong> {invoice.data.invoice_number}</p>
        <p><strong>Date:</strong> {new Date(invoice.data.created_at).toLocaleDateString()}</p>
        <p><strong>Customer:</strong> {invoice.data.customer_name || 'Cash Sale'}</p>
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
        <div className="flex justify-between text-xs mb-1">
          <span>GST (Tax):</span>
          <span>{money(transaction.data.tax)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-sm mb-1">
        <span>TOTAL:</span>
        <span>{money(invoice.data.total_amount)}</span>
      </div>
      <div className="flex justify-between text-xs mb-1">
        <span>Paid:</span>
        <span>{money(invoice.data.amount_paid)}</span>
      </div>
      <div className="flex justify-between font-bold text-sm border-t border-black border-dashed pt-2 mt-2 mb-4">
        <span>BALANCE:</span>
        <span>{money(invoice.data.total_amount - invoice.data.amount_paid)}</span>
      </div>

      {(invoice.data.total_amount - invoice.data.amount_paid) > 0 && b.upi_vpa && (
        <div className="text-center mt-6 flex flex-col items-center">
          <p className="font-bold text-xs mb-2 border border-black border-dashed px-2 py-1 inline-block">SCAN TO PAY</p>
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=upi://pay?pa=${b.upi_vpa}&pn=${encodeURIComponent(b.business_name || 'Shop')}&am=${(invoice.data.total_amount - invoice.data.amount_paid)}&cu=INR`} 
            alt="UPI QR Code" 
            width={120} 
            height={120}
            className="mb-1"
          />
          <p className="text-[10px] text-gray-500 font-mono">{b.upi_vpa}</p>
        </div>
      )}

      <div className="text-center mt-6 text-xs">
        <p>Thank you for your business!</p>
        <p className="mt-4 text-[10px] text-gray-500">stock.invoice desk</p>
      </div>
    </div>
  );
}
