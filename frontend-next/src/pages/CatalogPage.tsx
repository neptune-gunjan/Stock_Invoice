import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FileImage,
  FilePlus2,
  Filter,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
  Save,
  Store,
  UserPlus,
  History,
  PackagePlus,
  Eye,
  EyeOff
} from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/error-boundary';
import { AppShell, Mark } from '@/components/AppShell';
import { ApiError, apiJson } from '@/lib/api';
import { clearSession, hasSession, sendPasswordReset, signIn, signUp } from '@/lib/auth';
import {
  endpoints,
  money,
  useCustomers,
  useDashboard,
  useDashboardSales,
  useExtractionJob,
  useInvoice,
  useInvoices,
  useLowStock,
  useProfile,
  useRecentInvoices,
  useStock,
  useStockMutations,
  useStockMovements,
  useInvoicePayments,
  useInvoiceMutations,
  useCustomerTransactions,
  useCustomerLedger,
  Customer,
  useBusiness,
  useBusinessMutations,
  useImportStock,
  type ExtractedItem,
  type StockInput,
  type StockItem,
  type StockMovement,
  type WhatsAppSendResult,
} from '@/lib/data';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 },
  },
});

const dateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError || error instanceof Error ? error.message : fallback;

const inputClass =
  'min-h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10';
const buttonPrimary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50';
const buttonQuiet =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground transition hover:bg-muted active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50';

/* ---------------------------------------------------------------------------
 * Shared presentational pieces
 * ------------------------------------------------------------------------ */


function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="rise-in">
        <p className="mono mb-2 text-[10px] font-medium uppercase tracking-[.2em] text-muted-foreground">{eyebrow}</p>
        <h1 className="text-3xl font-extrabold tracking-[-.04em] text-foreground md:text-[38px]">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="rise-in">{action}</div>}
    </div>
  );
}


function SectionCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card shadow-[0_10px_30px_hsl(164_22%_18%_/.04)] ${className}`}
    >
      {children}
    </section>
  );
}


function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-muted text-primary">
        <ReceiptText size={22} />
      </div>
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}


function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
      <AlertCircle className="mt-0.5 shrink-0" size={18} />
      <div>
        <p className="font-bold">Something went wrong</p>
        <p className="mt-1 text-destructive/80">{message}</p>
        {onRetry && (
          <button className="mt-3 font-bold underline" onClick={onRetry} data-testid="button-retry">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}


function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-muted-foreground">
      <Loader2 className="animate-spin" size={18} /> {label}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Auth
 * ------------------------------------------------------------------------ */


function RequireAuth({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const authed = hasSession();
  useEffect(() => {
    if (!authed) setLocation('/', { replace: true });
  }, [authed, setLocation]);
  return authed ? <>{children}</> : null;
}


function SalesChart({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data: { date: string; sales: string | number }[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const chartData = useMemo(
    () =>
      data.slice(-7).map((item) => ({
        date: item.date,
        value: Number(item.sales || 0),
      })),
    [data],
  );

  const maxValue = Math.max(
    ...chartData.map((item) => item.value),
    1,
  );

  const totalSales = chartData.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  const points = chartData.map((item, index) => {
    const x =
      chartData.length === 1
        ? 50
        : (index / (chartData.length - 1)) * 100;

    const y = 90 - (item.value / maxValue) * 70;

    return {
      ...item,
      x,
      y,
    };
  });

  const linePoints = points
    .map((point) => `${point.x},${point.y}`)
    .join(' ');

  return (
    <SectionCard className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
            Sales overview
          </p>

          <h2 className="mt-2 text-xl font-extrabold">
            Recent sales
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Last 7 available days
          </p>
        </div>

        <div className="sm:text-right">
          <p className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Total sales
          </p>

          <p className="mt-1 mono text-2xl font-bold">
            {money(totalSales)}
          </p>
        </div>
      </div>

      {isLoading && <Loading label="Loading sales…" />}

      {!isLoading && isError && (
        <div className="p-5">
          <ErrorNotice
            message="Could not load sales data."
            onRetry={onRetry}
          />
        </div>
      )}

      {!isLoading && !isError && chartData.length === 0 && (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-bold">
            No sales data yet
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Your sales trend will appear here after invoices are created.
          </p>
        </div>
      )}

      {!isLoading && !isError && chartData.length > 0 && (
        <div className="p-5">
          <div className="relative h-64 w-full">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="h-full w-full"
              role="img"
              aria-label="Sales chart"
            >
              {/* Grid */}
              <line
                x1="0"
                y1="20"
                x2="100"
                y2="20"
                className="stroke-border"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />

              <line
                x1="0"
                y1="55"
                x2="100"
                y2="55"
                className="stroke-border"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />

              <line
                x1="0"
                y1="90"
                x2="100"
                y2="90"
                className="stroke-border"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />

              {/* Area */}
              {points.length > 1 && (
                <polygon
                  points={`0,90 ${linePoints} 100,90`}
                  className="fill-primary/10"
                />
              )}

              {/* Line */}
              {points.length > 1 && (
                <polyline
                  points={linePoints}
                  fill="none"
                  className="stroke-primary"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* Points */}
              {points.map((point) => (
                <circle
                  key={point.date}
                  cx={point.x}
                  cy={point.y}
                  r="2"
                  className="fill-primary"
                >
                  <title>
                    {dateLabel(point.date)} · {money(point.value)}
                  </title>
                </circle>
              ))}
            </svg>
          </div>

          {/* Dates */}
          <div
            className="mt-3 grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${chartData.length}, minmax(0, 1fr))`,
            }}
          >
            {chartData.map((item) => (
              <div
                key={item.date}
                className="text-center"
              >
                <p className="mono text-[9px] uppercase tracking-wide text-muted-foreground">
                  {new Intl.DateTimeFormat('en', {
                    month: 'short',
                    day: 'numeric',
                  }).format(new Date(item.date))}
                </p>

                <p className="mt-1 mono text-[10px] font-bold">
                  {money(item.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ---------------------------------------------------------------------------
 * Dashboard
 * ------------------------------------------------------------------------ */


function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Catalog (stock CRUD)
 * ------------------------------------------------------------------------ */

const blankForm = { name: '', sku: '', unit: '', unit_price: '', quantity_available: '', low_stock_threshold: '', aliases: '' };


function PaymentPanel({
  invoiceId,
  paidAmount,
  remainingAmount,
  paymentStatus,
}: {
  invoiceId: string;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: string;
}) {
  const payments = useInvoicePayments(invoiceId);
  const { addPayment } = useInvoiceMutations();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [error, setError] = useState('');

  const submit = async () => {
    const value = Number(amount);

    if (!value || value <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }

    if (value > remainingAmount) {
      setError('Payment cannot be greater than the remaining amount.');
      return;
    }

    setError('');

    try {
      await addPayment.mutateAsync({
        invoiceId,
        input: {
          amount: value,
          payment_method: method,
        },
      });

      setAmount('');
    } catch (e) {
      setError(errorMessage(e, 'Could not add payment.'));
    }
  };

  return (
    <SectionCard className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="mono text-[10px] uppercase tracking-[.17em] text-muted-foreground">
            Payment
          </p>

          <p className="mt-3 font-bold capitalize">
            {paymentStatus.toLowerCase() === 'paid'
              ? 'paid'
              : 'pending'}
          </p>
        </div>

        <span className="mono text-lg">
          {money(
            paymentStatus.toLowerCase() === 'paid'
              ? paidAmount
              : remainingAmount
          )}
        </span>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {money(paidAmount)} paid · {money(remainingAmount)} due
      </p>

      {remainingAmount > 0 && (
        <div className="mt-5 space-y-3">
          <input
            type="number"
            min="0"
            step="0.01"
            max={remainingAmount}
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Payment amount"
          />

          <select
            className={inputClass}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>

          {error && (
            <p className="text-sm font-semibold text-destructive">
              {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={addPayment.isPending}
            className={`${buttonPrimary} w-full`}
          >
            {addPayment.isPending ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Saving…
              </>
            ) : (
              <>
                <Check size={16} />
                Add payment
              </>
            )}
          </button>
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <p className="mono text-[10px] uppercase tracking-[.17em] text-muted-foreground">
          Payment history
        </p>

        {payments.isLoading ? (
          <Loading label="Loading payments…" />
        ) : payments.data?.length ? (
          <div className="mt-3 space-y-3">
            {payments.data.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-bold capitalize">
                    {payment.payment_method}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {dateLabel(payment.created_at)}
                  </p>
                </div>

                <span className="mono text-sm">
                  {money(payment.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            No payments recorded yet.
          </p>
        )}
      </div>
    </SectionCard>
  );
}


function CatalogPage() {
  const stock = useStock();
  const { create, update, remove, movement } = useStockMutations();

  const [historyItem, setHistoryItem] = useState<StockItem | null>(null);

  const movements = useStockMovements(historyItem?.id ?? null);
  const [movementItem, setMovementItem] = useState<StockItem | null>(null);
  const [movementType, setMovementType] = useState<
    'purchase' | 'return' | 'damage'
  >('purchase');
  const [movementQty, setMovementQty] = useState('');
  const [movementError, setMovementError] = useState('');

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState('');

  const items = stock.data ?? [];
  const shown = useMemo(
    () =>
      items.filter((item) =>
        `${item.name} ${(item.aliases ?? []).join(' ')} ${item.sku ?? ''}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, query],
  );

  const begin = (item?: StockItem) => {
    setError('');
    if (item) {
      setEditing(item.id);
      setForm({
        name: item.name,
        sku: item.sku ?? '',
        unit: item.unit,
        unit_price: String(item.unit_price),
        quantity_available: String(item.quantity_available),
        low_stock_threshold: String(item.low_stock_threshold ?? 0),
        aliases: (item.aliases ?? []).join(', '),
      });
    } else {
      setEditing('new');
      setForm(blankForm);
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.unit.trim()) return setError('Name and unit are required.');
    if (form.unit_price === '' || Number.isNaN(Number(form.unit_price))) return setError('Unit price must be a number.');
    if (form.quantity_available === '' || Number.isNaN(Number(form.quantity_available)))
      return setError('Quantity must be a number.');

    const payload: StockInput = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      unit: form.unit.trim(),
      unit_price: Number(form.unit_price),
      quantity_available: Number(form.quantity_available),
      low_stock_threshold: Number(form.low_stock_threshold || 0),
      aliases: form.aliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    };

    try {
      if (editing === 'new') await create.mutateAsync(payload);
      else if (editing) await update.mutateAsync({ id: editing, input: payload });
      setEditing(null);
      setForm(blankForm);
    } catch (e) {
      setError(errorMessage(e, 'Could not save the product.'));
    }
  };

  const del = async (item: StockItem) => {
    if (!window.confirm(`Remove "${item.name}" from the catalog?`)) return;
    try {
      await remove.mutateAsync(item.id);
    } catch (e) {
      setError(errorMessage(e, 'Could not remove the product.'));
    }
  };

  const submitMovement = async (event: FormEvent) => {
    event.preventDefault();

    setMovementError('');

    const quantity = Number(movementQty);

    if (!movementItem) {
      return setMovementError('Please select a product.');
    }

    if (
      movementQty.trim() === '' ||
      Number.isNaN(quantity) ||
      quantity <= 0
    ) {
      return setMovementError(
        'Quantity must be greater than 0.',
      );
    }

    if (
      movementType === 'damage' &&
      quantity > movementItem.quantity_available
    ) {
      return setMovementError(
        `${movementItem.name} has only ${movementItem.quantity_available} ${movementItem.unit} available.`,
      );
    }

    try {
      await movement.mutateAsync({
        id: movementItem.id,
        input: {
          movement_type: movementType,
          quantity,
        },
      });

      setMovementItem(null);
      setMovementQty('');
      setMovementType('purchase');
      setMovementError('');
    } catch (e) {
      setMovementError(
        errorMessage(
          e,
          'Could not apply stock movement.',
        ),
      );
    }
  };

  return (
    <AppShell>
      <PageHeading
        eyebrow="Stock catalog"
        title="Know what’s on the shelf."
        description="Your catalog keeps suggestions grounded in the way you actually sell things."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const firstItem = items[0];

                setMovementItem(firstItem ?? null);
                setMovementType('purchase');
                setMovementQty('');
                setMovementError('');
              }}
              className={buttonQuiet}
              type="button"
            >
              <PackagePlus size={17} /> Stock movement
            </button>
          <button onClick={() => begin()} className={buttonPrimary} data-testid="button-add-catalog-item">
            <Plus size={17} /> Add item
          </button>
        </div>
        }
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 text-muted-foreground" size={17} />
          <input
            className={`${inputClass} pl-10`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items, SKU or aliases"
            data-testid="input-search-catalog"
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs text-muted-foreground">
          <Filter size={15} /> {shown.length} of {items.length} items
        </div>
      </div>

      {error && (
        <div className="mb-5">
          <ErrorNotice message={error} />
        </div>
      )}
      {stock.isError && (
        <div className="mb-5">
          <ErrorNotice message={errorMessage(stock.error, 'Could not load your catalog.')} onRetry={() => stock.refetch()} />
        </div>
      )}

      {editing && (
        <SectionCard className="mb-6 border-secondary-foreground/30 bg-secondary/10 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-extrabold">{editing === 'new' ? 'Add catalog item' : 'Edit catalog item'}</h2>
            <button onClick={() => setEditing(null)} className="rounded-lg p-2 hover:bg-secondary/40" data-testid="button-close-catalog-form">
              <X size={17} />
            </button>
          </div>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <label className="text-xs font-bold lg:col-span-2">
              Item name
              <input
                className={`${inputClass} mt-2`}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Basmati rice"
                data-testid="input-catalog-name"
              />
            </label>
            <label className="text-xs font-bold">
              SKU
              <input
                className={`${inputClass} mt-2`}
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="RICE-001"
                data-testid="input-catalog-sku"
              />
            </label>
            <label className="text-xs font-bold">
              Unit
              <input
                className={`${inputClass} mt-2`}
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="kg"
                data-testid="input-catalog-unit"
              />
            </label>
            <label className="text-xs font-bold">
              Unit price
              <input
                type="number"
                step="0.01"
                min="0"
                className={`${inputClass} mt-2`}
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                data-testid="input-catalog-price"
              />
            </label>
            <label className="text-xs font-bold">
              Available
              <input
                type="number"
                step="0.01"
                min="0"
                className={`${inputClass} mt-2`}
                value={form.quantity_available}
                onChange={(e) => setForm({ ...form, quantity_available: e.target.value })}
                data-testid="input-catalog-quantity"
              />
            </label>
            <label className="text-xs font-bold">
              Low-stock threshold
              <input
                type="number"
                step="0.01"
                min="0"
                className={`${inputClass} mt-2`}
                value={form.low_stock_threshold}
                onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                data-testid="input-catalog-threshold"
              />
            </label>
            <label className="text-xs font-bold sm:col-span-2 lg:col-span-4">
              Aliases <span className="font-normal text-muted-foreground">(comma separated — help the matcher)</span>
              <input
                className={`${inputClass} mt-2`}
                value={form.aliases}
                onChange={(e) => setForm({ ...form, aliases: e.target.value })}
                placeholder="rice, basmati, chawal"
                data-testid="input-catalog-aliases"
              />
            </label>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
              <button className={buttonPrimary} disabled={create.isPending || update.isPending} data-testid="button-save-catalog-item">
                <Check size={16} /> Save item
              </button>
              <button type="button" onClick={() => setEditing(null)} className={buttonQuiet}>
                Cancel
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {stock.isLoading ? (
        <SectionCard>
          <Loading />
        </SectionCard>
      ) : shown.length ? (
        <SectionCard className="overflow-hidden">
          <div className="hidden grid-cols-[1.5fr_.6fr_.6fr_.7fr_.8fr_90px] gap-4 border-b border-border bg-muted/45 px-5 py-3 mono text-[10px] uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Item</span>
            <span>SKU</span>
            <span>Unit</span>
            <span>Price</span>
            <span>On hand</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {shown.map((item) => {
              const low = Number(item.quantity_available) <= Number(item.low_stock_threshold);
              return (
                <div
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[1.5fr_.6fr_.6fr_.7fr_.8fr_90px] sm:items-center sm:gap-4"
                  key={item.id}
                  data-testid={`row-catalog-${item.id}`}
                >
                  <div>
                    <p className="text-sm font-bold">{item.name}</p>
                    {(item.aliases ?? []).length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">Also: {item.aliases.join(', ')}</p>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{item.sku || '—'}</span>
                  <span className="text-sm text-muted-foreground">{item.unit}</span>
                  <span className="mono text-sm">{money(item.unit_price)}</span>
                  <span className={`mono text-sm ${low ? 'font-bold text-accent' : ''}`}>
                    {item.quantity_available} <span className="font-sans text-xs text-muted-foreground">{low ? 'low' : ''}</span>
                  </span>
                  <div className="flex gap-1 sm:justify-end">
                    <button
                      onClick={() => setHistoryItem(item)}
                      className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`View history for ${item.name}`}
                      data-testid={`button-history-catalog-${item.id}`}
                      title="Movement history"
                    >
                      <History size={16} />
                    </button>
                    <button
                      onClick={() => begin(item)}
                      className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Edit ${item.name}`}
                      data-testid={`button-edit-catalog-${item.id}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => del(item)}
                      className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${item.name}`}
                      data-testid={`button-delete-catalog-${item.id}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : (
        <SectionCard>
          <EmptyState
            title={query ? 'No matching stock' : 'Your catalog is empty'}
            body={query ? 'Try a different search.' : 'Add your products so extraction has something to match against.'}
            action={
              <button onClick={() => begin()} className={buttonPrimary}>
                <Plus size={16} /> Add item
              </button>
            }
          />
        </SectionCard>
      )}
      {historyItem && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) {
        setHistoryItem(null);
      }
    }}
  >
    <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Stock movement history
          </p>
          <h2 className="mt-1 text-lg font-extrabold">
            {historyItem.name}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Current stock: {historyItem.quantity_available} {historyItem.unit}
          </p>
        </div>

        <button
          onClick={() => setHistoryItem(null)}
          className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted"
          aria-label="Close movement history"
        >
          <X size={18} />
        </button>
      </div>

      <div className="max-h-[65vh] overflow-y-auto p-5">
        {movements.isLoading ? (
          <Loading />
        ) : movements.isError ? (
          <ErrorNotice
            message={errorMessage(
              movements.error,
              'Could not load movement history.',
            )}
            onRetry={() => movements.refetch()}
          />
        ) : (movements.data ?? []).length === 0 ? (
          <EmptyState
            title="No movement history"
            body="Stock movements for this product will appear here."
          />
        ) : (
          <div className="space-y-3">
            {[...(movements.data ?? [])]
              .reverse()
              .map((movement) => {
                const incoming =
                  movement.movement_type === 'purchase' ||
                  movement.movement_type === 'return' ||
                  movement.movement_type === 'sale_reversal';

                const labels: Record<string, string> = {
                  purchase: 'Purchase',
                  sale: 'Sale',
                  return: 'Return',
                  damage: 'Damage',
                  adjustment: 'Adjustment',
                  sale_reversal: 'Sale Reversal',
                };

                const label =
                  labels[movement.movement_type] ??
                  movement.movement_type;

                const date = new Date(movement.created_at);

                return (
                  <div
                    key={movement.id}
                    className="rounded-xl border border-border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                              incoming
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}
                          >
                            {label}
                          </span>

                          <span className="text-xs text-muted-foreground">
                            {date.toLocaleDateString()} ·{' '}
                            {date.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <span className="mono text-sm text-muted-foreground">
                            {movement.quantity_before} {historyItem.unit}
                          </span>

                          <span className="text-muted-foreground">
                            →
                          </span>

                          <span className="mono text-sm font-bold">
                            {movement.quantity_after} {historyItem.unit}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`mono text-sm font-extrabold ${
                          incoming
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {incoming ? '+' : '-'}
                        {movement.quantity} {historyItem.unit}
                      </div>
                    </div>

                    {movement.reference_id && (
                      <div className="mt-3 border-t border-border pt-3">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Reference
                        </span>
                        <p className="mono mt-1 break-all text-[11px] text-muted-foreground">
                          {movement.reference_id}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-border px-5 py-4">
        <button
          onClick={() => setHistoryItem(null)}
          className={buttonQuiet}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

{movementItem !== null && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget && !movement.isPending) {
        setMovementItem(null);
      }
    }}
  >
    <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Stock movement
          </p>
          <h2 className="mt-1 text-lg font-extrabold">
            Update stock
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!movement.isPending) {
              setMovementItem(null);
            }
          }}
          className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted"
          aria-label="Close stock movement"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={submitMovement} className="space-y-5 p-5">
        <label className="block text-xs font-bold">
          Product
          <select
            className={`${inputClass} mt-2`}
            value={movementItem.id}
            onChange={(e) => {
              const selected = items.find(
                (item) => item.id === e.target.value,
              );

              if (selected) {
                setMovementItem(selected);
              }

              setMovementError('');
            }}
            disabled={movement.isPending}
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — {item.quantity_available} {item.unit}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-bold">
            Movement type
            <select
              className={`${inputClass} mt-2`}
              value={movementType}
              onChange={(e) => {
                setMovementType(
                  e.target.value as
                    | 'purchase'
                    | 'return'
                    | 'damage',
                );
                setMovementError('');
              }}
              disabled={movement.isPending}
            >
              <option value="purchase">
                Purchase
              </option>
              <option value="return">
                Return
              </option>
              <option value="damage">
                Damage
              </option>
            </select>
          </label>

          <label className="block text-xs font-bold">
            Quantity
            <input
              type="number"
              min="0.01"
              step="0.01"
              className={`${inputClass} mt-2`}
              value={movementQty}
              onChange={(e) => {
                setMovementQty(e.target.value);
                setMovementError('');
              }}
              placeholder="e.g. 10"
              disabled={movement.isPending}
              autoFocus
            />
          </label>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Current stock
            </span>

            <span className="mono font-bold">
              {movementItem.quantity_available}{' '}
              {movementItem.unit}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              After movement
            </span>

            <span className="mono font-bold">
              {(() => {
                const quantity = Number(movementQty) || 0;

                const result =
                  movementType === 'purchase' ||
                  movementType === 'return'
                    ? movementItem.quantity_available +
                      quantity
                    : movementItem.quantity_available -
                      quantity;

                return `${result} ${movementItem.unit}`;
              })()}
            </span>
          </div>
        </div>

        {movementType === 'damage' && (
          <p className="text-xs text-muted-foreground">
            Damaged quantity will be removed from available stock.
          </p>
        )}

        {(movementType === 'purchase' ||
          movementType === 'return') && (
          <p className="text-xs text-muted-foreground">
            This quantity will be added to available stock.
          </p>
        )}

        {movementError && (
          <ErrorNotice message={movementError} />
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setMovementItem(null)}
            className={buttonQuiet}
            disabled={movement.isPending}
          >
            Cancel
          </button>

          <button
            type="submit"
            className={buttonPrimary}
            disabled={movement.isPending}
          >
            <Check size={16} />

            {movement.isPending
              ? 'Applying...'
              : 'Apply movement'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    </AppShell>
  );
}


/* ---------------------------------------------------------------------------
 * Retailer Management
 * ------------------------------------------------------------------------ */


export default CatalogPage;
