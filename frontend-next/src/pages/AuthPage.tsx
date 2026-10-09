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


function AuthPage() {
  const [, setLocation] = useLocation();
  const [signup, setSignup] = useState(false);
  const [values, setValues] = useState({ name: '', shop: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (hasSession()) setLocation('/dashboard', { replace: true });
  }, [setLocation]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (signup && (!values.name.trim() || !values.shop.trim()))
      return setError('Add your name and shop name to continue.');
    if (!values.email.includes('@')) return setError('Enter a valid email address.');
    if (values.password.length < 8) return setError('Use at least 8 characters for your password.');
    if (signup && values.password !== values.confirmPassword) return setError('Passwords do not match.');

    setError('');
    setBusy(true);
    try {
      if (signup) {
        await signUp(values.name.trim(), values.shop.trim(), values.email.trim(), values.password);
      } else {
        await signIn(values.email.trim(), values.password);
      }
      setLocation('/dashboard');
    } catch (e) {
      setError(errorMessage(e, 'Authentication failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell grid lg:grid-cols-[1.05fr_.95fr]">
      <div className="paper-grid relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <Mark compact />
        <div className="relative max-w-lg pb-8">
          <div className="mb-7 flex items-center gap-2 mono text-[10px] uppercase tracking-[.2em] text-secondary">
            <span className="h-px w-8 bg-secondary" /> Counter-side tools
          </div>
          <h1 className="text-6xl font-extrabold leading-[.94] tracking-[-.06em]">
            Good notes.
            <br />
            <span className="text-secondary">Clear totals.</span>
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-primary-foreground/70">
            Turn the scribbles from your counter into invoices you can stand behind.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-3 border-t border-primary-foreground/15 pt-5 text-xs text-primary-foreground/60">
            <span>01 &nbsp; Capture</span>
            <span>02 &nbsp; Check</span>
            <span>03 &nbsp; Send</span>
          </div>
        </div>
        <p className="mono text-[10px] uppercase tracking-[.16em] text-primary-foreground/45">
          Stock &amp; invoice desk · made for the daily rush
        </p>
      </div>

      <div className="flex flex-col bg-background px-6 py-8 sm:px-12 lg:px-[clamp(3rem,9vw,9rem)]">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <Mark />
          </div>
          <span className="mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Secure workspace</span>
        </div>
        <div className="my-auto w-full max-w-[420px] py-12">
          <p className="mono mb-3 text-[10px] uppercase tracking-[.2em] text-muted-foreground">
            {signup ? 'Set up your desk' : 'Welcome back'}
          </p>
          <h2 className="text-3xl font-extrabold tracking-[-.04em]">
            {signup ? 'Start with the basics.' : 'Let’s get today in order.'}
          </h2>
          <form onSubmit={submit} className="mt-8 space-y-4">
            {signup && (
              <>
                <label className="block text-sm font-bold">
                  Your name
                  <input
                    autoComplete="name"
                    className={`${inputClass} mt-2`}
                    value={values.name}
                    onChange={(e) => setValues({ ...values, name: e.target.value })}
                    data-testid="input-owner-name"
                    placeholder="Mara Iqbal"
                  />
                </label>
                <label className="block text-sm font-bold">
                  Shop name
                  <input
                    className={`${inputClass} mt-2`}
                    value={values.shop}
                    onChange={(e) => setValues({ ...values, shop: e.target.value })}
                    data-testid="input-shop-name"
                    placeholder="Juniper &amp; Co. Grocers"
                  />
                </label>
              </>
            )}
            <label className="block text-sm font-bold">
              Email address
              <input
                autoComplete="email"
                type="email"
                className={`${inputClass} mt-2`}
                value={values.email}
                onChange={(e) => setValues({ ...values, email: e.target.value })}
                data-testid="input-email"
                placeholder="you@yourshop.com"
              />
            </label>
            <label className="block text-sm font-bold">
              Password

              <div className="relative mt-2">
                <input
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputClass} pr-12`}
                  value={values.password}
                  onChange={(e) => setValues({ ...values, password: e.target.value })}
                  data-testid="input-password"
                  placeholder="8+ characters"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {signup && (
              <label className="block text-sm font-bold">
                Confirm password

                <div className="relative mt-2">
                  <input
                    autoComplete="new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`${inputClass} pr-12`}
                    value={values.confirmPassword}
                    onChange={(e) =>
                      setValues({ ...values, confirmPassword: e.target.value })
                    }
                    data-testid="input-confirm-password"
                    placeholder="Repeat your password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showConfirmPassword
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            )}
            {error && (
              <p className="text-sm font-semibold text-destructive" data-testid="text-auth-error">
                {error}
              </p>
            )}
            <button className={`${buttonPrimary} w-full`} disabled={busy} data-testid="button-auth-submit">
              {busy ? <Loader2 className="animate-spin" size={17} /> : null}
              {signup ? 'Create workspace' : 'Sign in to workspace'}
              {!busy && <ArrowRight size={17} />}
            </button>
          </form>
          {!signup && (
            <Link
              href="/forgot-password"
              className="mt-5 block text-center text-sm font-bold text-primary underline-offset-4 hover:underline"
              data-testid="link-forgot-password"
            >
              Forgot password?
            </Link>
          )}
          <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
            {signup ? 'Already have a workspace?' : 'New to the desk?'}{' '}
            <button
              className="font-bold text-foreground underline underline-offset-4"
              onClick={() => {
                setSignup(!signup);
                setError('');
              }}
              data-testid="button-toggle-auth"
            >
              {signup ? 'Sign in' : 'Create one'}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 border-t border-border pt-5 text-[11px] text-muted-foreground">
          <ShieldCheck size={14} className="text-[hsl(146_34%_45%)]" /> Your session is kept on this device only
        </div>
      </div>
    </div>
  );
}



export default AuthPage;
