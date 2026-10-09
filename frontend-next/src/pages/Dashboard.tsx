import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
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
      data.slice(-14).map((item) => ({
        date: dateLabel(item.date),
        sales: Number(item.sales || 0),
      })),
    [data],
  );

  const totalSales = chartData.reduce((sum, item) => sum + item.sales, 0);

  return (
    <SectionCard className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
            Sales overview
          </p>
          <h2 className="mt-2 text-xl font-extrabold">Recent sales</h2>
          <p className="mt-1 text-xs text-muted-foreground">Last 14 available days</p>
        </div>
        <div className="sm:text-right">
          <p className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Total sales
          </p>
          <p className="mt-1 mono text-2xl font-bold">{money(totalSales)}</p>
        </div>
      </div>

      {isLoading && <Loading label="Loading sales..." />}

      {!isLoading && isError && (
        <div className="p-5">
          <ErrorNotice message="Could not load sales data." onRetry={onRetry} />
        </div>
      )}

      {!isLoading && !isError && chartData.length === 0 && (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-bold">No sales data yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your sales trend will appear here after invoices are created.
          </p>
        </div>
      )}

      {!isLoading && !isError && chartData.length > 0 && (
        <div className="p-5 h-72 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `${val}`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                formatter={(value: number) => [money(value), 'Sales']}
              />
              <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}

function Dashboard() {
  const profile = useProfile();
  const summary = useDashboard();
  const recent = useRecentInvoices();
  const low = useLowStock();
  const sales = useDashboardSales();


  const stats = [
    {
      label: 'Total sales',
      value:
        summary.data?.total_sales !== undefined
          ? money(summary.data.total_sales)
          : '—',
      note: `${summary.data?.total_invoices ?? '—'} invoices confirmed`,
      icon: '01',
    },
    {
      label: 'Total paid',
      value:
        summary.data?.total_paid !== undefined
          ? money(summary.data.total_paid)
          : '—',
      note: 'payments received',
      icon: '02',
    },
    {
      label: 'Outstanding / Due',
      value:
        summary.data?.outstanding_amount !== undefined
          ? money(summary.data.outstanding_amount)
          : '—',
      note:
        summary.data?.outstanding_amount &&
        summary.data.outstanding_amount > 0
          ? 'payment still due'
          : 'all payments settled',
      icon: '03',
    },
    {
      label: 'Customers',
      value: summary.data?.total_customers ?? '—',
      note: 'customers in your records',
      icon: '04',
    },
    {
      label: 'Products',
      value: summary.data?.total_products ?? '—',
      note: 'items in your catalog',
      icon: '05',
    },
    {
      label: 'Low stock alerts',
      value: summary.data?.low_stock_products ?? '—',
      note:
        summary.data?.low_stock_products
          ? 'worth checking today'
          : 'all shelves look good',
      icon: '06',
    },
  ];

  return (
    <AppShell>
      <PageHeading
        eyebrow={dateLabel(new Date().toISOString())}
        title={`Welcome back, ${profile.ownerName.split(' ')[0]}.`}
        description="A clear desk makes a calmer counter. Here’s what needs your attention today."
        action={
          <Link
            href="/upload"
            className={buttonPrimary}
            data-testid="link-start-invoice"
          >
            <FilePlus2 size={17} />
            New invoice
          </Link>
        }
      />

      {summary.isError && (
        <div className="mb-6">
          <ErrorNotice
            message={errorMessage(
              summary.error,
              'Could not load the dashboard.',
            )}
            onRetry={() => summary.refetch()}
          />
        </div>
      )}

      {/* Dashboard summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat, i) => {
          const isLowStock =
            stat.label === 'Low stock alerts' &&
            Boolean(summary.data?.low_stock_products);

          const isOutstanding =
            stat.label === 'Outstanding / Due' &&
            Boolean(summary.data?.outstanding_amount);

          return (
            <SectionCard
              key={stat.label}
              className={`rise-in p-5 ${
                isLowStock
                  ? 'border-secondary/70 bg-secondary/10'
                  : isOutstanding
                    ? 'border-accent/50 bg-accent/5'
                    : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="mono text-[10px] text-muted-foreground">
                  {stat.icon}
                </span>

                {isLowStock && (
                  <span className="rounded-full bg-secondary/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground">
                    Attention
                  </span>
                )}

                {isOutstanding && (
                  <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
                    Due
                  </span>
                )}
              </div>

              <p className="mt-7 text-3xl font-extrabold tracking-[-.06em] sm:text-4xl">
                {stat.value}
              </p>

              <p className="mt-1 text-sm font-bold">
                {stat.label}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {stat.note}
              </p>
            </SectionCard>
          );
        })}
      </div>

      {/* Sales chart */}
      <div className="mt-7">
        <SalesChart
          data={sales.data ?? []}
          isLoading={sales.isLoading}
          isError={sales.isError}
          onRetry={() => sales.refetch()}
        />
      </div>

      {/* Recent invoices + Shelf check */}
      <div className="mt-7 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <SectionCard>
          <div className="flex items-center justify-between border-b border-border px-5 py-5">
            <div>
              <h2 className="font-extrabold">Recent invoices</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                The latest from your counter.
              </p>
            </div>

            <Link
              href="/transactions"
              className="text-xs font-bold text-primary hover:underline"
              data-testid="link-see-all-transactions"
            >
              See all
            </Link>
          </div>

          {recent.isLoading ? (
            <Loading />
          ) : recent.data && recent.data.length > 0 ? (
            <div className="divide-y divide-border">
              {recent.data.slice(0, 5).map((invoice) => (
                <Link
                  href={`/invoice/${invoice.id}`}
                  key={invoice.id}
                  className="flex min-h-[76px] items-center gap-4 px-5 transition hover:bg-muted/50"
                  data-testid={`link-recent-${invoice.id}`}
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted mono text-xs">
                    {invoice.invoice_number.slice(-2)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {invoice.customer_name || 'Walk-in customer'}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {invoice.invoice_number} ·{' '}
                      {dateLabel(invoice.created_at)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="mono text-sm font-medium">
                      {money(invoice.total_amount)}
                    </p>

                    <p className="mt-1 text-[10px] uppercase text-muted-foreground">
                      {invoice.payment_status}
                    </p>
                  </div>

                  <ArrowRight
                    size={15}
                    className="text-muted-foreground"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No invoices yet"
              body="Create your first invoice from a handwritten note."
              action={
                <Link href="/upload" className={buttonPrimary}>
                  <FilePlus2 size={16} />
                  New invoice
                </Link>
              }
            />
          )}
        </SectionCard>

        <SectionCard className="overflow-hidden">
          <div className="border-b border-border bg-primary p-5 text-primary-foreground">
            <p className="mono text-[10px] uppercase tracking-[.18em] text-primary-foreground/60">
              Shelf check
            </p>

            <h2 className="mt-8 text-2xl font-extrabold tracking-[-.04em]">
              {low.data && low.data.length > 0
                ? `${low.data.length} items need a top-up.`
                : 'Shelves look steady.'}
            </h2>
          </div>

          <div className="space-y-4 p-5">
            {low.isLoading ? (
              <Loading />
            ) : low.data && low.data.length > 0 ? (
              low.data.slice(0, 5).map((item) => (
                <div
                  className="flex items-center justify-between"
                  key={item.id}
                >
                  <div>
                    <p className="text-sm font-bold">{item.name}</p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.quantity_available} {item.unit} left
                    </p>
                  </div>

                  <span className="mono text-xs text-accent">
                    low
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing is below your threshold.
              </p>
            )}

            <Link
              href="/catalog"
              className={`${buttonQuiet} mt-2 w-full text-xs`}
              data-testid="link-open-catalog"
            >
              Open catalog
              <ArrowRight size={15} />
            </Link>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}

/* ---------------------------------------------------------------------------
 * Upload → Extract
 * ------------------------------------------------------------------------ */

interface ReviewPayload {
  job_id: string;
  items: ExtractedItem[];
}


export default Dashboard;
