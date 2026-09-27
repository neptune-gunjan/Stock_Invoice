export interface ReviewRow {
  id: string;
  stock_id: string | null;
  qty: number;
  extracted_item_id: string | null;
  raw_text?: string;
}

export interface ReviewPayload {
  job_id: string | null;
  items: Array<any>;
}

export const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);


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


function ReviewPage() {
  const [, setLocation] = useLocation();
  const stock = useStock();
  const [jobId, setJobId] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const customers = useCustomers();

  const [customer, setCustomer] = useState({
    id: null as string | null,
    name: '',
    phone: '',
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem('sia-review') || 'null',
      ) as ReviewPayload | null;

      if (saved?.items?.length) {
        setJobId(saved.job_id);

        setRows(
          saved.items.map((item) => ({
            id: item.id,
            raw_text: item.raw_text,
            stock_id: item.matched_stock_id,
            qty: item.qty && item.qty > 0 ? item.qty : 1,
            extracted_item_id: isUuid(item.id) ? item.id : null,
          })),
        );
      } else {
        setRows([
          {
            id: 'manual-1',
            raw_text: '',
            stock_id: null,
            qty: 1,
            extracted_item_id: null,
          },
        ]);
      }
    } catch {
      setRows([]);
    }
  }, []);

  const stockById = useMemo(() => {
    const map = new Map<string, StockItem>();

    (stock.data ?? []).forEach((item) => {
      map.set(item.id, item);
    });

    return map;
  }, [stock.data]);

  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();

    if (!search) {
      return customers.data ?? [];
    }

    return (customers.data ?? []).filter((item) =>
      `${item.name} ${item.phone ?? ''}`
        .toLowerCase()
        .includes(search),
    );
  }, [customers.data, customerSearch]);

  const priceFor = (row: ReviewRow) =>
    row.stock_id
      ? stockById.get(row.stock_id)?.unit_price ?? 0
      : 0;

  const total = rows.reduce(
    (sum, row) => sum + row.qty * priceFor(row),
    0,
  );

  const update = (id: string, patch: Partial<ReviewRow>) =>
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    );

  const addRow = () =>
    setRows((current) => [
      ...current,
      {
        id: `manual-${Date.now()}`,
        raw_text: '',
        stock_id: null,
        qty: 1,
        extracted_item_id: null,
      },
    ]);

  const selectCustomer = (item: Customer) => {
    setCustomer({
      id: item.id,
      name: item.name,
      phone: item.phone ?? '',
    });

    setCustomerSearch('');
    setShowCustomerResults(false);
  };

  const clearCustomer = () => {
    setCustomer({
      id: null,
      name: '',
      phone: '',
    });

    setCustomerSearch('');
  };

  const confirm = async () => {
    if (rows.length === 0) {
      setError('Add at least one item.');
      return;
    }

    if (rows.some((row) => !row.stock_id)) {
      setError(
        'Choose a catalog item for every row before confirming.',
      );
      return;
    }

    if (rows.some((row) => !row.qty || row.qty <= 0)) {
      setError(
        'Quantity must be greater than 0 on every row.',
      );
      return;
    }

    /*
     * Check stock availability before sending the request.
     * This gives the user a friendly message instead of
     * waiting for the backend 409 response.
     */
    const shortageRow = rows.find((row) => {
      const item = row.stock_id
        ? stockById.get(row.stock_id)
        : undefined;

      return !!item && row.qty > item.quantity_available;
    });

    if (shortageRow) {
      const item = stockById.get(shortageRow.stock_id!);

      setError(
        `${item?.name ?? 'Product'}: ${shortageRow.qty} requested, but only ${item?.quantity_available ?? 0} available. Reduce the quantity or use the available amount.`,
      );

      return;
    }

    setSaving(true);
    setError('');

    try {
      let customerId: string | null = customer.id;

      /*
       * Existing customer:
       * Use the existing customer ID.
       *
       * New customer:
       * Create it once and use the returned ID.
       */
      if (!customerId && customer.name.trim()) {
        const created = await endpoints.createCustomer(
          customer.name.trim(),
          customer.phone.trim() || undefined,
        );

        customerId = created.id;
      }

      const transaction = await endpoints.confirm({
        extraction_job_id:
          jobId && isUuid(jobId) ? jobId : null,

        customer_id: customerId,

        items: rows.map((row) => ({
          stock_id: row.stock_id as string,
          qty: row.qty,
          extracted_item_id:
            row.extracted_item_id ?? undefined,
        })),
      });

      sessionStorage.removeItem('sia-review');

      setLocation(`/invoice/${transaction.invoice_id}`);
    } catch (e) {
      setError(
        errorMessage(e, 'Could not confirm the invoice.'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">

        {/* -----------------------------------------------------------
         * Header
         * --------------------------------------------------------- */}

        <div className="mb-7 flex items-center gap-3">
          <Link
            href="/upload"
            className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card hover:bg-muted"
            data-testid="link-back-upload"
          >
            <ArrowLeft size={17} />
          </Link>

          <div>
            <p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
              Step 2 of 3
            </p>

            <p className="text-sm font-bold">
              Check the details
            </p>
          </div>
        </div>

        <PageHeading
          eyebrow="Human review"
          title="Does this look right?"
          description="Prices come from your catalog. Check the highlighted rows and pick a match before confirming."
          action={
            <button
              onClick={addRow}
              className={buttonQuiet}
              data-testid="button-add-review-item"
            >
              <Plus size={17} />
              Add item
            </button>
          }
        />

        {/* -----------------------------------------------------------
         * Errors
         * --------------------------------------------------------- */}

        {stock.isError && (
          <div className="mb-5">
            <ErrorNotice
              message={errorMessage(
                stock.error,
                'Could not load your catalog.',
              )}
              onRetry={() => stock.refetch()}
            />
          </div>
        )}

        {error && (
          <div className="mb-5">
            <ErrorNotice message={error} />
          </div>
        )}

        {/* -----------------------------------------------------------
         * Review Items
         * --------------------------------------------------------- */}

        <SectionCard className="overflow-hidden">

          <div className="hidden grid-cols-[1.1fr_1.4fr_.55fr_.7fr_.8fr_40px] gap-3 border-b border-border bg-muted/45 px-5 py-3 mono text-[10px] uppercase tracking-wider text-muted-foreground md:grid">
            <span>Written as</span>
            <span>Catalog match</span>
            <span>Qty</span>
            <span>Rate</span>
            <span className="text-right">Line total</span>
            <span />
          </div>

          <div className="divide-y divide-border">

            {rows.map((row, index) => {
              const stockItem = row.stock_id
                ? stockById.get(row.stock_id)
                : undefined;

              const needsReview = !row.stock_id;

              const available =
                stockItem?.quantity_available ?? 0;

              const shortage = Math.max(
                row.qty - available,
                0,
              );

              const hasShortage =
                !!stockItem && shortage > 0;

              return (
                <div
                  key={row.id}
                  className={`grid gap-4 px-4 py-5 md:grid-cols-[1.1fr_1.4fr_.55fr_.7fr_.8fr_40px] md:items-center md:gap-3 md:px-5 ${
                    needsReview
                      ? 'bg-secondary/10'
                      : ''
                  }`}
                  data-testid={`row-review-${row.id}`}
                >

                  {/* Written item */}

                  <div>
                    <div className="flex items-center gap-2">

                      <span className="mono text-[10px] text-muted-foreground">
                        0{index + 1}
                      </span>

                      <input
                        className={`${inputClass} !min-h-9`}
                        value={row.raw_text}
                        onChange={(e) =>
                          update(row.id, {
                            raw_text: e.target.value,
                          })
                        }
                        placeholder="item"
                        data-testid={`input-review-rawtext-${row.id}`}
                      />

                      {needsReview && (
                        <span className="rounded-full bg-secondary px-2 py-1 text-[9px] font-extrabold uppercase text-primary">
                          Check
                        </span>
                      )}

                    </div>
                  </div>

                  {/* Catalog match */}

                  <select
                    className={`${inputClass} ${
                      needsReview
                        ? 'border-secondary-foreground/50'
                        : ''
                    }`}
                    value={row.stock_id || ''}
                    onChange={(e) =>
                      update(row.id, {
                        stock_id:
                          e.target.value || null,
                      })
                    }
                    data-testid={`select-review-item-${row.id}`}
                  >
                    <option value="">
                      Select catalog item
                    </option>

                    {(stock.data ?? []).map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name} · {money(item.unit_price)}
                      </option>
                    ))}
                  </select>

                  {/* Quantity */}

                  <input
                    type="number"
                    min="1"
                    step="1"
                    className={`${inputClass} ${
                      hasShortage
                        ? 'border-amber-400 focus:border-amber-500'
                        : ''
                    }`}
                    value={row.qty}
                    onChange={(e) =>
                      update(row.id, {
                        qty: Number(e.target.value),
                      })
                    }
                    data-testid={`input-review-quantity-${row.id}`}
                  />

                  {/* Rate */}

                  <span className="hidden text-sm text-muted-foreground md:block">
                    {stockItem
                      ? `${money(stockItem.unit_price)}/${stockItem.unit}`
                      : '—'}
                  </span>

                  {/* Partial availability warning */}

                  {hasShortage && (
                    <div className="md:col-span-5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 dark:border-amber-700 dark:bg-amber-950/30">

                      <div className="flex flex-wrap items-center justify-between gap-3">

                        <div className="flex items-start gap-2">

                          <span className="mt-0.5 text-amber-600">
                            ⚠
                          </span>

                          <div className="text-xs">

                            <p className="font-bold text-amber-800 dark:text-amber-300">
                              Partial availability
                            </p>

                            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                              Requested{' '}
                              <strong>{row.qty}</strong>{' '}
                              {stockItem?.unit}
                              {' · '}
                              Available{' '}
                              <strong>{available}</strong>{' '}
                              {stockItem?.unit}
                              {' · '}
                              Short{' '}
                              <strong>{shortage}</strong>
                            </p>

                          </div>

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            update(row.id, {
                              qty: available,
                            })
                          }
                          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50"
                        >
                          Use {available}
                        </button>

                      </div>
                    </div>
                  )}

                  {/* Line total */}

                  <span className="mono text-sm font-medium md:text-right">
                    {money(
                      row.qty * priceFor(row),
                    )}
                  </span>

                  {/* Delete */}

                  <button
                    type="button"
                    onClick={() =>
                      setRows((current) =>
                        current.filter(
                          (r) => r.id !== row.id,
                        ),
                      )
                    }
                    className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${
                      row.raw_text || 'row'
                    }`}
                    data-testid={`button-delete-review-${row.id}`}
                  >
                    <Trash2 size={16} />
                  </button>

                </div>
              );
            })}

          </div>

          {/* Total */}

          <div className="flex flex-col gap-4 border-t border-border bg-muted/30 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">
                {rows.length} lines
              </strong>{' '}
              · Tax and discounts are not applied
            </p>

            <div className="flex items-center justify-between gap-8 sm:justify-end">
              <span className="text-sm font-bold">
                Total
              </span>

              <span className="mono text-2xl font-medium">
                {money(total)}
              </span>
            </div>

          </div>

        </SectionCard>

        {/* -----------------------------------------------------------
         * Customer
         * --------------------------------------------------------- */}

        <SectionCard className="mt-6 p-5">

          <div className="mb-4">

            <div className="flex items-center justify-between gap-3">

              <div>
                <p className="text-sm font-bold">
                  Customer{' '}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Select an existing customer or enter a new one.
                </p>
              </div>

              {customer.id && (
                <button
                  type="button"
                  onClick={clearCustomer}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}

            </div>

          </div>

          <div className="grid gap-4 sm:grid-cols-2">

            {/* Customer search */}

            <div className="relative">

              <label className="text-sm font-bold">
                Search customer
              </label>

              <div className="relative mt-2">

                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  className={`${inputClass} pl-9`}
                  value={customerSearch}
                  onFocus={() =>
                    setShowCustomerResults(true)
                  }
                  onChange={(e) => {
                    setCustomerSearch(
                      e.target.value,
                    );

                    setShowCustomerResults(true);

                    if (customer.id) {
                      setCustomer({
                        id: null,
                        name: '',
                        phone: '',
                      });
                    }
                  }}
                  placeholder="Search name or phone"
                  data-testid="input-customer-search"
                />

              </div>

              {showCustomerResults &&
                customerSearch.trim() && (
                  <div className="absolute left-0 right-0 z-20 mt-2 max-h-56 overflow-auto rounded-xl border border-border bg-card p-1 shadow-lg">

                    {customers.isLoading ? (
                      <div className="px-3 py-4 text-xs text-muted-foreground">
                        Loading customers…
                      </div>
                    ) : filteredCustomers.length > 0 ? (
                      filteredCustomers.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            selectCustomer(item)
                          }
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-muted"
                        >
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                            {item.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {item.name}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {item.phone ||
                                'No phone number'}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-xs text-muted-foreground">
                        No matching customer found.
                      </div>
                    )}

                  </div>
                )}

            </div>

            {/* Customer name */}

            <div>

              <label className="text-sm font-bold">
                Customer name
              </label>

              <input
                className={`${inputClass} mt-2`}
                value={customer.name}
                onChange={(e) =>
                  setCustomer({
                    ...customer,
                    id: null,
                    name: e.target.value,
                  })
                }
                placeholder="Walk-in customer"
                data-testid="input-customer-name"
              />

            </div>

            {/* Phone */}

            <div>

              <label className="text-sm font-bold">
                Phone{' '}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>

              <input
                className={`${inputClass} mt-2`}
                value={customer.phone}
                onChange={(e) =>
                  setCustomer({
                    ...customer,
                    phone: e.target.value,
                  })
                }
                placeholder="For their receipt"
                data-testid="input-customer-phone"
              />

            </div>

            {/* Customer status */}

            <div className="flex items-end">

              {!customer.id &&
                customer.name.trim() && (
                  <div className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 text-xs text-muted-foreground">
                    <UserPlus size={15} />
                    New customer details will be used
                    for this invoice.
                  </div>
                )}

              {customer.id && (
                <div className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 text-xs text-emerald-700 dark:text-emerald-400">
                  <Check size={15} />
                  Existing customer selected
                </div>
              )}

            </div>

          </div>

          {/* Confirm */}

          <div className="mt-5 flex justify-end">

            <button
              type="button"
              onClick={confirm}
              disabled={saving || !rows.length}
              className={`${buttonPrimary} sm:min-w-[190px]`}
              data-testid="button-confirm-invoice"
            >
              {saving ? (
                <>
                  <Loader2
                    className="animate-spin"
                    size={16}
                  />
                  Saving…
                </>
              ) : (
                <>
                  Confirm invoice
                  <Check size={17} />
                </>
              )}
            </button>

          </div>

        </SectionCard>

      </div>
    </AppShell>
  );
}

/* ---------------------------------------------------------------------------
 * Invoice
 * ------------------------------------------------------------------------ */


export default ReviewPage;
