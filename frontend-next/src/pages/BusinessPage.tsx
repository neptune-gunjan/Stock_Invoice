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


function BusinessPage() {
  const business = useBusiness();
  const { create, update } = useBusinessMutations();
  const importStock = useImportStock();

  const [form, setForm] = useState({
    business_name: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    upi_vpa: '',
      logo_path: '',
  });

  // const [initialized, setInitialized] = useState(false);
  const [success, setSuccess] = useState('');
  const [stockFile, setStockFile] = useState<File | null>(null);
  const [stockImportSuccess, setStockImportSuccess] = useState('');
  const [stockImportError, setStockImportError] = useState('');

  useEffect(() => {
    if (!business.data) return;

    setForm({
      business_name: business.data.business_name ?? '',
      phone: business.data.phone ?? '',
      email: business.data.email ?? '',
      address: business.data.address ?? '',
      gst_number: business.data.gst_number ?? '',
      upi_vpa: business.data.upi_vpa ?? '',
        logo_path: business.data.logo_path ?? '',
    });
  }, [business.data]);

  const isSaving = create.isPending || update.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSuccess('');

    if (!form.business_name.trim()) {
      return;
    }

    try {
      if (business.data?.id) {
        await update.mutateAsync({
          businessId: business.data.id,
          input: {
            business_name: form.business_name.trim(),
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            address: form.address.trim() || null,
            gst_number: form.gst_number.trim() || null,
            upi_vpa: form.upi_vpa.trim() || null,
              logo_path: form.logo_path || null,
          },
        });

        setSuccess('Business details updated successfully.');
      } else {
        await create.mutateAsync({
          business_name: form.business_name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          gst_number: form.gst_number.trim() || null,
          upi_vpa: form.upi_vpa.trim() || null,
              logo_path: form.logo_path || null,
        });

        setSuccess('Business created successfully.');
      }
    } catch (error) {
      console.error('Business save failed:', error);
    }
  };

  const handleStockImport = async () => {
    if (!stockFile) {
      setStockImportError('Please select a CSV or XLSX file.');
      return;
    }

    setStockImportError('');
    setStockImportSuccess('');

    try {
      await importStock.mutateAsync(stockFile);

      setStockImportSuccess(
        'Stock imported successfully for this business.',
      );
      setStockFile(null);
    } catch (error) {
      setStockImportError(
        errorMessage(
          error,
          'Could not import stock.',
        ),
      );
    }
  };

  if (business.isLoading) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="Business"
          title="Business settings"
          description="Manage the business information used across your invoice desk."
        />

        <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          Loading business details...
        </div>
      </AppShell>
    );
  }

  if (business.isError) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="Business"
          title="Business settings"
          description="Manage the business information used across your invoice desk."
        />

        <ErrorNotice
          message={errorMessage(
            business.error,
            'Could not load business details.',
          )}
          onRetry={() => business.refetch()}
        />
      </AppShell>
    );
  }

  const saveError = create.error || update.error;

  return (
    <AppShell>
      <PageHeading
        eyebrow="Business"
        title="Business settings"
        description="Keep your business details ready for invoices and customer records."
      />

      <div className="max-w-3xl">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"
        >
          <div className="mb-7 flex items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Store size={21} />
            </div>

            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Business information
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These details identify your business on the invoice desk.
              </p>
            </div>
          </div>

          {saveError && (
            <div className="mb-5">
              <ErrorNotice
                message={errorMessage(
                  saveError,
                  'Could not save business details.',
                )}
              />
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {success}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                
            <div className="mb-6 border-b border-border pb-6">
              <label className="mb-2 block text-sm font-semibold">Business Logo</label>
              <div className="flex items-center gap-5">
                {form.logo_path ? (
                  <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-border bg-card">
                    <img src={form.logo_path} alt="Logo" className="h-full w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setForm((c) => ({ ...c, logo_path: '' }))}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:brightness-110"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
                    <FileImage size={24} className="text-muted-foreground/50" />
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    id="logo-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setForm((c) => ({ ...c, logo_path: event.target?.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:bg-muted"
                  >
                    <UploadCloud size={16} /> Upload image
                  </label>
                  <p className="mt-2 text-xs text-muted-foreground">Used on PDF invoices. PNG/JPG up to 1MB.</p>
                </div>
              </div>
            </div>

                  Business name <span className="text-destructive">*</span>
              </label>

              <input
                type="text"
                value={form.business_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    business_name: event.target.value,
                  }))
                }
                placeholder="Enter your business name"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                required
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Phone
                </label>

                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="Business phone number"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Email
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="Business email"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Address
              </label>

              <textarea
                value={form.address}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                placeholder="Business address"
                rows={4}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                GSTIN
              </label>

              <input
                type="text"
                value={form.gst_number}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    gst_number: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="Enter GSTIN"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm uppercase outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                UPI ID
              </label>

              <input
                type="text"
                value={form.upi_vpa}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    upi_vpa: event.target.value,
                  }))
                }
                placeholder="yourshop@upi"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Used to generate the payment link sent alongside invoices over WhatsApp.
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-end border-t border-border pt-6">
            <button
              type="submit"
              disabled={isSaving || !form.business_name.trim()}
              className={`${buttonPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Save size={17} />
              {isSaving
                ? 'Saving...'
                : business.data?.id
                  ? 'Save changes'
                  : 'Create business'}
            </button>
          </div>
          {business.data?.id && (
              <div className="mt-8 border-t border-border pt-8">
                <div className="mb-5">
                  <p className="text-sm font-bold">
                    Import initial stock
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Upload a CSV or XLSX file to add your opening stock
                    for this business.
                  </p>
                </div>

                {stockImportSuccess && (
                  <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {stockImportSuccess}
                  </div>
                )}

                {stockImportError && (
                  <div className="mb-4">
                    <ErrorNotice message={stockImportError} />
                  </div>
                )}

                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        Stock file
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Supported formats: CSV, XLSX
                      </p>
                    </div>

                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={(event) => {
                        setStockFile(
                          event.target.files?.[0] ?? null,
                        );
                        setStockImportError('');
                        setStockImportSuccess('');
                      }}
                      className="block w-full text-sm md:max-w-sm"
                    />
                  </div>

                  {stockFile && (
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        Selected: <span className="font-semibold text-foreground">
                          {stockFile.name}
                        </span>
                      </p>

                      <button
                        type="button"
                        onClick={handleStockImport}
                        disabled={importStock.isPending}
                        className={buttonPrimary}
                      >
                        <PackagePlus size={17} />

                        {importStock.isPending
                          ? 'Importing...'
                          : 'Import stock'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
        </form>
      </div>
    </AppShell>
  );
}

/* ---------------------------------------------------------------------------
 * Shell / routing
 * ------------------------------------------------------------------------ */


export default BusinessPage;
