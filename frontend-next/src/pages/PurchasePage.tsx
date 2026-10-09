import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Search, PackagePlus, Info, Check, Trash2 } from 'lucide-react';
import { PageHeading, SectionCard, ErrorNotice } from '../App';
import { AppShell } from '../components/AppShell';
import { useStock, endpoints, money } from '../lib/data';
import { useToast } from '@/hooks/use-toast';

const inputClass =
  'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary';
const buttonPrimary =
  'flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50';
const buttonQuiet =
  'flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition hover:bg-muted disabled:opacity-50';

export default function PurchasePage() {
  const stock = useStock();
  const [, setLocation] = useLocation();

  const [query, setQuery] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [cart, setCart] = useState<
    Array<{ stock_id: string; stock_name: string; unit: string; qty: number; unit_price: number }>
  >([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const items = stock.data ?? [];
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter((item) => {
        return (
          item.name.toLowerCase().includes(q) ||
          (item.sku ?? '').toLowerCase().includes(q) ||
          (item.aliases ?? []).some((a) => a.toLowerCase().includes(q))
        );
      })
      .slice(0, 5); // limit 5
  }, [items, query]);

  const addToCart = (item: typeof items[0]) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.stock_id === item.id);
      if (existing) {
        return prev.map((p) => (p.stock_id === item.id ? { ...p, qty: p.qty + 1 } : p));
      }
      return [
        ...prev,
        {
          stock_id: item.id,
          stock_name: item.name,
          unit: item.unit,
          qty: 1,
          unit_price: item.unit_price,
        },
      ];
    });
    setQuery('');
  };

  const updateCartQty = (id: string, qty: string) => {
    setCart((prev) =>
      prev.map((p) => (p.stock_id === id ? { ...p, qty: Number(qty) || 0 } : p)),
    );
  };

  const removeCartItem = (id: string) => {
    setCart((prev) => prev.filter((p) => p.stock_id !== id));
  };

  const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);

  const { toast } = useToast();

  const confirmPurchase = async () => {
    if (cart.length === 0) {
      setError('Add some items to stock in.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      await endpoints.bulkPurchase({
        supplier_name: supplierName.trim() || undefined,
        items: cart.map((i) => ({
          stock_id: i.stock_id,
          qty: i.qty,
        })),
      });

      toast({
        title: 'Stock Updated',
        description: `Successfully added ${totalQty} items to inventory.`,
      });
      setLocation('/catalog');
    } catch (err: any) {
      setError(err.message || 'Failed to process purchase.');
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <PageHeading
        eyebrow="Purchases"
        title="Stock In / Purchase"
        description="Add inventory from a distributor or supplier bill."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <SectionCard className="mb-6 overflow-visible p-5 relative">
            <h2 className="mb-4 text-sm font-bold">Search items to add</h2>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
              <input
                className={`${inputClass} pl-10`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search catalog by name, sku, alias..."
              />

              {query.length > 0 && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      onClick={() => addToCart(res)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted"
                    >
                      <div>
                        <p className="text-sm font-bold">{res.name}</p>
                        <p className="text-[10px] text-muted-foreground">Available: {res.quantity_available} {res.unit}</p>
                      </div>
                      <PackagePlus size={16} className="text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard className="overflow-hidden">
            <div className="border-b border-border bg-muted/40 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Items to Stock In
            </div>

            {cart.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                No items added yet. Search above to start adding stock.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {cart.map((item) => (
                  <div
                    key={item.stock_id}
                    className="grid grid-cols-[1fr_80px_40px] items-center gap-4 px-5 py-3 sm:grid-cols-[1fr_100px_40px]"
                  >
                    <div>
                      <p className="text-sm font-bold">{item.stock_name}</p>
                      <p className="text-[10px] text-muted-foreground">Unit: {item.unit}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground">Qty</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`${inputClass} px-2 py-1 text-center`}
                        value={item.qty}
                        onChange={(e) => updateCartQty(item.stock_id, e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => removeCartItem(item.stock_id)}
                      className="mt-4 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard className="p-5">
            <h2 className="mb-4 text-sm font-bold">Purchase Details</h2>
            <label className="mb-4 block">
              <span className="text-xs font-bold text-muted-foreground">Supplier Name (Optional)</span>
              <input
                className={`${inputClass} mt-1`}
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Acme Distributors"
              />
            </label>

            <div className="mb-6 flex justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm">
              <span className="font-medium text-muted-foreground">Total items Qty</span>
              <span className="font-bold">{totalQty}</span>
            </div>

            {error && (
              <div className="mb-4">
                <ErrorNotice message={error} />
              </div>
            )}

            <button
              onClick={confirmPurchase}
              disabled={saving || cart.length === 0}
              className={`${buttonPrimary} w-full`}
            >
              {saving ? 'Processing...' : (
                <>
                  <Check size={16} /> Update Stock
                </>
              )}
            </button>
          </SectionCard>

          <SectionCard className="p-5 bg-primary/5 border-primary/20">
            <div className="flex gap-3 text-primary">
              <Info size={20} className="shrink-0" />
              <p className="text-xs leading-relaxed">
                Items added here will immediately increase their available quantity in your catalog. They will be logged as "purchase" movements in the item's history.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
