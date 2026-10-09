import { useEffect } from 'react';
import { useParams } from 'wouter';
import { useBusiness, useCustomers, useCustomerLedger, money } from '@/lib/data';

export function CustomerStatement() {
  const params = useParams();
  const customerId = params.id;
  const customers = useCustomers();
  const ledger = useCustomerLedger(customerId || '');
  const business = useBusiness();

  const customer = customers.data?.find((c) => c.id === customerId);

  useEffect(() => {
    if (customer && ledger.data && business.data) {
      setTimeout(() => window.print(), 500);
    }
  }, [customer, ledger.data, business.data]);

  if (customers.isLoading || ledger.isLoading || business.isLoading) {
    return <div className="p-4 font-mono text-sm">Loading statement...</div>;
  }

  if (!customer || !ledger.data || !business.data) {
    return <div className="p-4 font-mono text-sm text-red-600">Error loading statement</div>;
  }

  const b = business.data;

  return (
    <div className="bg-white text-black p-8 max-w-4xl mx-auto" style={{ fontFamily: 'sans-serif' }}>
      <style>{`
        @media print {
          @page { margin: 1cm; size: A4 portrait; }
          body { margin: 0; background: white; -webkit-print-color-adjust: exact; }
          .app-shell { display: none !important; }
        }
      `}</style>
      
      <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
        <div>
          <h1 className="font-extrabold text-3xl uppercase tracking-tight">{b.business_name}</h1>
          {b.address && <p className="text-gray-600 mt-1">{b.address}</p>}
          {b.phone && <p className="text-gray-600">Ph: {b.phone}</p>}
        </div>
        <div className="text-right">
          <h2 className="font-bold text-2xl text-gray-800">STATEMENT OF ACCOUNT</h2>
          <p className="text-gray-600 mt-1">Generated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Bill To</p>
        <h3 className="text-xl font-bold">{customer.name}</h3>
        {customer.business_name && <p>{customer.business_name}</p>}
        {customer.phone && <p>{customer.phone}</p>}
        {customer.address && <p className="whitespace-pre-wrap">{customer.address}</p>}
      </div>

      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="py-3 pr-4 font-bold">Date</th>
            <th className="py-3 pr-4 font-bold">Ref</th>
            <th className="py-3 pr-4 font-bold">Description</th>
            <th className="py-3 pr-4 font-bold text-right">Debit (₹)</th>
            <th className="py-3 pr-4 font-bold text-right">Credit (₹)</th>
            <th className="py-3 font-bold text-right">Balance (₹)</th>
          </tr>
        </thead>
        <tbody>
          {ledger.data.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-500">No transactions recorded yet.</td>
            </tr>
          ) : (
            ledger.data.map((entry, idx) => (
              <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 pr-4">{new Date(entry.date).toLocaleDateString()}</td>
                <td className="py-3 pr-4 text-xs font-mono">{entry.reference || '—'}</td>
                <td className="py-3 pr-4">{entry.description}</td>
                <td className="py-3 pr-4 text-right text-red-600">{entry.debit > 0 ? entry.debit.toLocaleString('en-IN') : ''}</td>
                <td className="py-3 pr-4 text-right text-green-600">{entry.credit > 0 ? entry.credit.toLocaleString('en-IN') : ''}</td>
                <td className="py-3 text-right font-bold">{entry.balance.toLocaleString('en-IN')}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {ledger.data.length > 0 && (
        <div className="mt-8 flex justify-end">
          <div className="w-64 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Closing Balance</p>
            <p className="text-2xl font-extrabold">{money(ledger.data[ledger.data.length - 1].balance)}</p>
            <p className="text-xs text-gray-500 mt-1">Amount due</p>
          </div>
        </div>
      )}

      <div className="mt-16 text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
        <p>This is a computer generated statement.</p>
      </div>
    </div>
  );
}
