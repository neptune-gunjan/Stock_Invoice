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


function InvoicePage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const invoice = useInvoice(invoiceId);
  const customers = useCustomers();
  const [pdfError, setPdfError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const { cancel } = useInvoiceMutations();
  const [cancelError, setCancelError] = useState('');

  const handleCancel = async () => {
    if (!invoiceId || !invoice.data) return;

    const confirmed = window.confirm(
      `Cancel invoice ${invoice.data.invoice_number}?`
    );

    if (!confirmed) return;

    try {
      setCancelError('');
      await cancel.mutateAsync(invoiceId);
    } catch (e) {
      setCancelError(
        errorMessage(e, 'Could not cancel the invoice.')
      );
    }
  };
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [whatsappError, setWhatsappError] = useState('');
  const [whatsappResult, setWhatsappResult] = useState<WhatsAppSendResult | null>(null);

  const customerName = useMemo(() => {
    if (!invoice.data?.customer_id) return null;
    return customers.data?.find((c) => c.id === invoice.data?.customer_id)?.name ?? 'Customer on file';
  }, [invoice.data, customers.data]);

  const download = async () => {
    if (!invoiceId || !invoice.data) return;
    setDownloading(true);
    setPdfError('');
    try {
      const blob = await endpoints.invoicePdf(invoiceId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoice.data.invoice_number}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setPdfError(errorMessage(e, 'PDF download failed.'));
    } finally {
      setDownloading(false);
    }
  };

  const sendWhatsapp = async () => {
    if (!invoiceId) return;
    setSendingWhatsapp(true);
    setWhatsappError('');
    setWhatsappResult(null);
    try {
      const result = await endpoints.sendInvoiceWhatsapp(invoiceId);
      setWhatsappResult(result);
    } catch (e) {
      setWhatsappError(errorMessage(e, 'Could not send invoice over WhatsApp.'));
    } finally {
      setSendingWhatsapp(false);
    }
  };

  if (invoice.isLoading) {
    return (
      <AppShell>
        <Loading label="Loading invoice…" />
      </AppShell>
    );
  }

  if (invoice.isError || !invoice.data) {
    return (
      <AppShell>
        <EmptyState
          title="Invoice not found"
          body={errorMessage(invoice.error, 'This invoice could not be loaded.')}
          action={
            <Link href="/transactions" className={buttonPrimary} data-testid="link-back-transactions">
              View transactions
            </Link>
          }
        />
      </AppShell>
    );
  }

  const data = invoice.data;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/transactions"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
            data-testid="link-back-history"
          >
            <ArrowLeft size={16} /> Transaction history
          </Link>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={sendWhatsapp}
              disabled={sendingWhatsapp}
              className={buttonQuiet}
              data-testid="button-send-whatsapp"
            >
              <MessageCircle size={16} /> {sendingWhatsapp ? 'Sending…' : 'Send via WhatsApp'}
            </button>

            <button
              onClick={handleCancel}
              disabled={cancel.isPending || data.status === 'cancelled'}
              className={buttonQuiet}
            >
              {cancel.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <X size={16} />
              )}

              {data.status === 'cancelled'
                ? 'Cancelled'
                : 'Cancel invoice'}
            </button>

            <button
              onClick={download}
              disabled={downloading}
              className={buttonPrimary}
              data-testid="button-download-pdf"
            >
              <Download size={16} />
              {downloading ? 'Preparing…' : 'Download PDF'}
            </button>
          </div>
        </div>
        {pdfError && (
          <div className="mb-4">
            <ErrorNotice message={pdfError} />
          </div>
        )}
        {whatsappError && (
          <div className="mb-4">
            <ErrorNotice message={whatsappError} />
          </div>
        )}
        {whatsappResult && (
          <div className="mb-4 rounded-xl border border-border bg-muted/35 px-4 py-3 text-sm">
            {whatsappResult.document_sent ? 'Invoice PDF sent to the customer on WhatsApp.' : 'Could not deliver the PDF over WhatsApp.'}
            {whatsappResult.payment_link_sent && ' Payment link sent too.'}
            {!whatsappResult.whatsapp_configured && (
              <p className="mt-1 text-xs text-muted-foreground">
                WhatsApp isn't connected yet — this was only logged, not actually sent. Add WHATSAPP_ACCESS_TOKEN /
                WHATSAPP_PHONE_NUMBER_ID on the backend to send for real.
              </p>
            )}
          </div>
        )}
        <PageHeading
          eyebrow="Generated invoice"
          title="Ready to share."
          description={`Invoice ${data.invoice_number} · ${dateLabel(data.created_at)}`}
        />
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <SectionCard className="overflow-hidden">
            <div className="flex flex-col gap-5 border-b border-border bg-primary p-7 text-primary-foreground sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-6">
                  <Mark compact />
                </div>
                <p className="text-xl font-extrabold">Invoice</p>
                <p className="mt-1 mono text-xs text-primary-foreground/60">{data.invoice_number}</p>
              </div>
              <div className="sm:text-right">
                <p className="mono text-[10px] uppercase tracking-[.16em] text-primary-foreground/50">Issued</p>
                <p className="mt-2 text-sm font-bold">{dateLabel(data.created_at)}</p>
                <p className="mt-5 text-sm text-primary-foreground/70">{customerName || 'Walk-in customer'}</p>
              </div>
            </div>
            <div className="divide-y divide-border px-5 py-2">
              {data.items.map((line, index) => (
                <div
                  className="grid grid-cols-[1fr_auto] gap-4 py-4 sm:grid-cols-[1fr_70px_100px_100px] sm:items-center"
                  key={`${line.id}-${index}`}
                >
                  <div>
                    <p className="text-sm font-bold">{line.stock_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {line.qty} {line.unit} · {money(line.unit_price)} each
                    </p>
                  </div>
                  <span className="hidden text-right mono text-xs text-muted-foreground sm:block">{line.qty}</span>
                  <span className="hidden text-right mono text-xs text-muted-foreground sm:block">{money(line.unit_price)}</span>
                  <span className="mono text-sm font-medium">{money(line.line_total)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-border bg-muted/35 px-5 py-5 text-sm">
              <Row label="Subtotal" value={money(data.subtotal)} />
              {data.discount > 0 && <Row label="Discount" value={`- ${money(data.discount)}`} />}
              {data.tax_amount > 0 && <Row label={`Tax (${data.tax_rate}%)`} value={money(data.tax_amount)} />}
              <div className="flex items-center justify-between pt-2">
                <span className="font-bold">Grand total</span>
                <span className="mono text-2xl">{money(data.total_amount)}</span>
              </div>
            </div>
          </SectionCard>
          <div className="space-y-4">
            <SectionCard className="p-5">
              <div className="mb-4 flex items-center gap-2 text-[hsl(146_34%_35%)]">
                <ShieldCheck size={18} />
                <span className="text-sm font-extrabold">Reviewed and confirmed</span>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                This invoice was checked against your catalog before it was saved.
              </p>
            </SectionCard>
            <PaymentPanel
              invoiceId={invoiceId}
              paidAmount={data.paid_amount}
              remainingAmount={data.remaining_amount}
              paymentStatus={data.payment_status}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}


export default InvoicePage;
