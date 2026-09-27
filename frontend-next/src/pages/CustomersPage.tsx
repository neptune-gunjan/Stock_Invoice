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


function CustomersPage() {
  const customers = useCustomers();

  const [query, setQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState<
    'all' | 'due' | 'paid' | 'limit'
  >('all');

  const [customerSort, setCustomerSort] = useState<
    'name' | 'highest_due' | 'lowest_due' | 'newest'
  >('name');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    business_name: '',
    address: '',
    gst_number: '',
    credit_limit: '0',
    payment_terms_days: '0',
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [customerFinancials, setCustomerFinancials] = useState<
    Record<
      string,
      {
        totalPurchase: number;
        paidAmount: number;
        outstanding: number;
      }
    >
  >({});

  const customerList = customers.data ?? [];

  /*
   * Load financial information for every retailer.
   *
   * We use the existing customer transactions endpoint,
   * so no backend change is required.
   */
  useEffect(() => {
    let cancelled = false;

    const loadFinancials = async () => {
      if (customerList.length === 0) {
        setCustomerFinancials({});
        return;
      }

      const results = await Promise.all(
        customerList.map(async (customer) => {
          try {
            const transactions =
              await endpoints.customerTransactions(
                customer.id,
              );

            const totalPurchase = transactions.reduce(
              (sum: number, invoice) =>
                sum + Number(invoice.total_amount || 0),
              0,
            );

            const paidAmount = transactions.reduce(
              (sum: number, invoice) =>
                sum + Number(invoice.paid_amount || 0),
              0,
            );

            const outstanding = transactions.reduce(
              (sum: number, invoice) =>
                sum + Number(invoice.remaining_amount || 0),
              0,
            );
            return [
              customer.id,
              {
                totalPurchase,
                paidAmount,
                outstanding,
              },
            ] as const;
          } catch {
            return [
              customer.id,
              {
                totalPurchase: 0,
                paidAmount: 0,
                outstanding: 0,
              },
            ] as const;
          }
        }),
      );

      if (!cancelled) {
        setCustomerFinancials(
          Object.fromEntries(results),
        );
      }
    };

    loadFinancials();

    return () => {
      cancelled = true;
    };
  }, [customerList]);

  /*
   * Search retailers.
   */
  const shown = useMemo(() => {
  const search = query.toLowerCase().trim();

  const filtered = customerList.filter((customer) => {
    const matchesSearch =
      !search ||
      [
        customer.name,
        customer.phone ?? '',
        customer.business_name ?? '',
        customer.gst_number ?? '',
        customer.address ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);

    if (!matchesSearch) {
      return false;
    }

    const financial =
      customerFinancials[customer.id] ?? {
        totalPurchase: 0,
        paidAmount: 0,
        outstanding: 0,
      };

    const outstanding = Number(
      financial.outstanding || 0,
    );

    const creditLimit = Number(
      customer.credit_limit ?? 0,
    );

    if (
      customerFilter === 'due' &&
      outstanding <= 0
    ) {
      return false;
    }

    if (
      customerFilter === 'paid' &&
      outstanding > 0
    ) {
      return false;
    }

    if (
      customerFilter === 'limit' &&
      (
        creditLimit <= 0 ||
        outstanding < creditLimit
      )
    ) {
      return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    const financialA =
      customerFinancials[a.id] ?? {
        totalPurchase: 0,
        paidAmount: 0,
        outstanding: 0,
      };

    const financialB =
      customerFinancials[b.id] ?? {
        totalPurchase: 0,
        paidAmount: 0,
        outstanding: 0,
      };

    if (customerSort === 'highest_due') {
      return (
        Number(financialB.outstanding || 0) -
        Number(financialA.outstanding || 0)
      );
    }

    if (customerSort === 'lowest_due') {
      return (
        Number(financialA.outstanding || 0) -
        Number(financialB.outstanding || 0)
      );
    }

    if (customerSort === 'newest') {
      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    }

    return a.name.localeCompare(
      b.name,
      undefined,
      { sensitivity: 'base' },
    );
  });
}, [
  customerList,
  query,
  customerFinancials,
  customerFilter,
  customerSort,
]);

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      business_name: '',
      address: '',
      gst_number: '',
      credit_limit: '0',
      payment_terms_days: '0',
    });
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setError('');
    setShowForm(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingId(customer.id);

    setForm({
      name: customer.name ?? '',
      phone: customer.phone ?? '',
      business_name:
        customer.business_name ?? '',
      address: customer.address ?? '',
      gst_number: customer.gst_number ?? '',
      credit_limit: String(
        customer.credit_limit ?? 0,
      ),
      payment_terms_days: String(
        customer.payment_terms_days ?? 0,
      ),
    });

    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    resetForm();
    setError('');
  };

  const saveCustomer = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError(
        'Retailer name is required.',
      );
      return;
    }

    const creditLimit = Number(
      form.credit_limit,
    );

    const paymentTerms = Number(
      form.payment_terms_days,
    );

    if (
      !Number.isFinite(creditLimit) ||
      creditLimit < 0
    ) {
      setError(
        'Credit limit must be a valid non-negative amount.',
      );
      return;
    }

    if (
      !Number.isInteger(paymentTerms) ||
      paymentTerms < 0
    ) {
      setError(
        'Payment terms must be a valid number of days.',
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        business_name:
          form.business_name.trim() || null,
        address:
          form.address.trim() || null,
        gst_number:
          form.gst_number.trim() || null,
        credit_limit: creditLimit,
        payment_terms_days: paymentTerms,
      };

      if (!editingId) {
        await endpoints.createCustomer(
          payload.name,
          payload.phone || undefined,
          {
            business_name:
              payload.business_name ??
              undefined,
            address:
              payload.address ?? undefined,
            gst_number:
              payload.gst_number ??
              undefined,
            credit_limit:
              payload.credit_limit,
            payment_terms_days:
              payload.payment_terms_days,
          },
        );
      } else {
        await endpoints.updateCustomer(
          editingId,
          payload,
        );
      }

      await customers.refetch();
      closeForm();
    } catch (e) {
      setError(
        errorMessage(
          e,
          'Could not save retailer.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async (
    customer: Customer,
  ) => {
    if (
      !window.confirm(
        `Delete retailer "${customer.name}"?`,
      )
    ) {
      return;
    }

    try {
      if (
        (endpoints as any).deleteCustomer
      ) {
        await (
          endpoints as any
        ).deleteCustomer(customer.id);

        await customers.refetch();
      } else {
        setError(
          'Retailer delete API is not available yet.',
        );
      }
    } catch (e) {
      setError(
        errorMessage(
          e,
          'Could not delete retailer.',
        ),
      );
    }
  };

  return (
    <AppShell>
      <PageHeading
        eyebrow="Retailer Management"
        title="Manage your retailers."
        description="Keep retailer profiles, GST details, credit limits and payment terms organized in one place."
        action={
          <button
            onClick={openCreate}
            className={buttonPrimary}
            data-testid="button-add-customer"
          >
            <Plus size={17} />
            Add retailer
          </button>
        }
      />

      {/* Search */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-3.5 text-muted-foreground"
            size={17}
          />

          <input
            className={`${inputClass} pl-10`}
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
            placeholder="Search retailer, business, phone or GST"
            data-testid="input-search-customers"
          />
        </div>

        <div className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs text-muted-foreground">
          <Filter size={15} />
          {shown.length} of {customerList.length}{' '}
          retailers
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        {/* Status filter */}
        <select
          value={customerFilter}
          onChange={(e) =>
            setCustomerFilter(
              e.target.value as
                | 'all'
                | 'due'
                | 'paid'
                | 'limit',
            )
          }
          className={`${inputClass} sm:w-56`}
          aria-label="Filter retailers"
        >
          <option value="all">
            All retailers
          </option>
          <option value="due">
            Due
          </option>
          <option value="paid">
            Paid
          </option>
          <option value="limit">
            Credit limit reached
          </option>
        </select>

        {/* Sort */}
        <select
          value={customerSort}
          onChange={(e) =>
            setCustomerSort(
              e.target.value as
                | 'name'
                | 'highest_due'
                | 'lowest_due'
                | 'newest',
            )
          }
          className={`${inputClass} sm:w-56`}
          aria-label="Sort retailers"
        >
          <option value="name">
            Name A–Z
          </option>
          <option value="highest_due">
            Highest outstanding
          </option>
          <option value="lowest_due">
            Lowest outstanding
          </option>
          <option value="newest">
            Newest retailer
          </option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5">
          <ErrorNotice message={error} />
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <SectionCard className="mb-6 border-secondary-foreground/30 bg-secondary/10 p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                Retailer profile
              </p>

              <h2 className="mt-1 text-lg font-extrabold">
                {editingId
                  ? 'Edit retailer'
                  : 'Add new retailer'}
              </h2>
            </div>

            <button
              onClick={closeForm}
              className="rounded-lg p-2 hover:bg-secondary/40"
              data-testid="button-close-customer-form"
            >
              <X size={17} />
            </button>
          </div>

          <form
            onSubmit={saveCustomer}
            className="grid gap-4 sm:grid-cols-2"
          >
            {/* Name */}
            <label className="text-sm font-bold">
              Retailer name

              <input
                className={`${inputClass} mt-2`}
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                placeholder="e.g. Rahul Sharma"
                autoFocus
                data-testid="input-customer-name"
              />
            </label>

            {/* Phone */}
            <label className="text-sm font-bold">
              Phone number

              <input
                className={`${inputClass} mt-2`}
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value,
                  })
                }
                placeholder="e.g. 9876543210"
                data-testid="input-customer-phone"
              />
            </label>

            {/* Business */}
            <label className="text-sm font-bold">
              Business name

              <input
                className={`${inputClass} mt-2`}
                value={form.business_name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    business_name:
                      e.target.value,
                  })
                }
                placeholder="e.g. Rahul General Store"
              />
            </label>

            {/* GST */}
            <label className="text-sm font-bold">
              GST number

              <input
                className={`${inputClass} mt-2 uppercase`}
                value={form.gst_number}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gst_number:
                      e.target.value.toUpperCase(),
                  })
                }
                placeholder="e.g. 08ABCDE1234F1Z5"
              />
            </label>

            {/* Address */}
            <label className="text-sm font-bold sm:col-span-2">
              Address

              <textarea
                className={`${inputClass} mt-2 min-h-24 py-3`}
                value={form.address}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: e.target.value,
                  })
                }
                placeholder="Retailer shop / billing address"
              />
            </label>

            {/* Credit Limit */}
            <label className="text-sm font-bold">
              Credit limit (₹)

              <input
                type="number"
                min="0"
                step="0.01"
                className={`${inputClass} mt-2`}
                value={form.credit_limit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    credit_limit:
                      e.target.value,
                  })
                }
                placeholder="50000"
              />

              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Maximum outstanding amount allowed
                for this retailer.
              </span>
            </label>

            {/* Payment Terms */}
            <label className="text-sm font-bold">
              Payment terms (days)

              <input
                type="number"
                min="0"
                step="1"
                className={`${inputClass} mt-2`}
                value={
                  form.payment_terms_days
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    payment_terms_days:
                      e.target.value,
                  })
                }
                placeholder="30"
              />

              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Example: 30 means payment is
                expected within 30 days.
              </span>
            </label>

            {/* Actions */}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className={buttonPrimary}
                data-testid="button-save-customer"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {editingId
                      ? 'Update retailer'
                      : 'Save retailer'}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={closeForm}
                className={buttonQuiet}
              >
                Cancel
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Retailer List */}
      {customers.isError && (
        <div className="mb-5">
          <ErrorNotice
            message={errorMessage(
              customers.error,
              'Could not load retailers.',
            )}
            onRetry={() =>
              customers.refetch()
            }
          />
        </div>
      )}

      {customers.isLoading ? (
        <SectionCard>
          <Loading label="Loading retailers…" />
        </SectionCard>
      ) : shown.length > 0 ? (
        <SectionCard className="overflow-hidden">
          {/* Desktop header */}
          <div className="hidden grid-cols-[1.5fr_1.1fr_1fr_1fr_1fr_100px] gap-4 border-b border-border bg-muted/45 px-5 py-3 mono text-[10px] uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Retailer</span>
            <span>Business</span>
            <span>Credit limit</span>
            <span>Outstanding</span>
            <span>Payment terms</span>
            <span />
          </div>

          <div className="divide-y divide-border">
            {shown.map((customer) => {
              const financial =
                customerFinancials[
                  customer.id
                ] ?? {
                  totalPurchase: 0,
                  paidAmount: 0,
                  outstanding: 0,
                };

              const creditLimit = Number(
                customer.credit_limit ?? 0,
              );

              const outstanding = Number(
                financial.outstanding || 0,
              );

              const creditUtilization =
                creditLimit > 0
                  ? Math.min(
                      (outstanding /
                        creditLimit) *
                        100,
                      100,
                    )
                  : 0;

              const paymentStatus =
                outstanding <= 0
                  ? {
                      label: 'Paid',
                      className:
                        'text-muted-foreground',
                    }
                  : creditLimit > 0 &&
                      outstanding >=
                        creditLimit
                    ? {
                        label:
                          'Credit limit reached',
                        className:
                          'font-bold text-destructive',
                      }
                    : {
                        label: 'Due',
                        className:
                          'font-bold text-foreground',
                      };

              return (
                <div
                  key={customer.id}
                  className="grid gap-4 px-5 py-5 transition hover:bg-muted/30 sm:grid-cols-[1.5fr_1.1fr_1fr_1fr_1fr_100px] sm:items-center"
                  data-testid={`row-customer-${customer.id}`}
                >
                  {/* Retailer */}
                  <Link
                    href={`/customers/${customer.id}`}
                    className="flex min-w-0 items-center gap-3"
                    data-testid={`link-customer-${customer.id}`}
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground">
                      {customer.name
                        ?.trim()
                        ?.charAt(0)
                        ?.toUpperCase() ||
                        '?'}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold hover:underline">
                        {customer.name}
                      </p>

                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {customer.phone ||
                          'No phone number'}
                      </p>
                    </div>
                  </Link>

                  {/* Business */}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {customer.business_name ||
                        '—'}
                    </p>

                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {customer.gst_number ||
                        'No GST'}
                    </p>
                  </div>

                  {/* Credit */}
                  <div>
                    <p className="text-sm font-bold">
                      {money(creditLimit)}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Credit limit
                    </p>
                  </div>

                  {/* Outstanding */}
                  <div>
                    <p className="text-sm font-extrabold">
                      {money(outstanding)}
                    </p>

                    <p
                      className={`mt-1 text-xs ${paymentStatus.className}`}
                    >
                      {paymentStatus.label}
                    </p>

                    {creditLimit > 0 && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {creditUtilization.toFixed(
                          0,
                        )}
                        % credit used
                      </p>
                    )}
                  </div>

                  {/* Terms */}
                  <div>
                    <p className="text-sm font-bold">
                      {customer.payment_terms_days ??
                        0}{' '}
                      days
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Payment terms
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 sm:justify-end">
                    <button
                      onClick={() =>
                        openEdit(customer)
                      }
                      className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label={`Edit ${customer.name}`}
                      data-testid={`button-edit-customer-${customer.id}`}
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() =>
                        deleteCustomer(
                          customer,
                        )
                      }
                      className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${customer.name}`}
                      data-testid={`button-delete-customer-${customer.id}`}
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
            title={
              query
                ? 'No retailers found'
                : 'No retailers yet'
            }
            body={
              query
                ? 'Try searching with a different name, business, phone or GST number.'
                : 'Add your first retailer to start managing profiles, credit and payment terms.'
            }
            action={
              !query ? (
                <button
                  onClick={openCreate}
                  className={buttonPrimary}
                >
                  <Plus size={16} />
                  Add retailer
                </button>
              ) : undefined
            }
          />
        </SectionCard>
      )}
    </AppShell>
  );
}



export default CustomersPage;
