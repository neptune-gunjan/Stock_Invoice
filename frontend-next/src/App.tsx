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
  Pencil,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/error-boundary';
import { AppShell, Mark } from '@/components/AppShell';
import { ApiError } from '@/lib/api';
import { clearSession, hasSession, sendPasswordReset, signIn, signUp } from '@/lib/auth';
import {
  endpoints,
  money,
  useCustomers,
  useDashboard,
  useInvoice,
  useInvoices,
  useLowStock,
  useProfile,
  useRecentInvoices,
  useStock,
  useStockMutations,
  type ExtractedItem,
  type StockInput,
  type StockItem,
} from '@/lib/data';
import './index.css';

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

function AuthPage() {
  const [, setLocation] = useLocation();
  const [signup, setSignup] = useState(false);
  const [values, setValues] = useState({ name: '', shop: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
              <input
                autoComplete={signup ? 'new-password' : 'current-password'}
                type="password"
                className={`${inputClass} mt-2`}
                value={values.password}
                onChange={(e) => setValues({ ...values, password: e.target.value })}
                data-testid="input-password"
                placeholder="8+ characters"
              />
            </label>
            {signup && (
              <label className="block text-sm font-bold">
                Confirm password
                <input
                  autoComplete="new-password"
                  type="password"
                  className={`${inputClass} mt-2`}
                  value={values.confirmPassword}
                  onChange={(e) => setValues({ ...values, confirmPassword: e.target.value })}
                  data-testid="input-confirm-password"
                  placeholder="Repeat your password"
                />
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

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await sendPasswordReset(email);
    } catch (e) {
      setError(errorMessage(e, 'Password reset is not available.'));
    }
  };
  return (
    <div className="app-shell grid place-items-center bg-background px-5">
      <div className="w-full max-w-[430px]">
        <Link href="/" data-testid="link-back-home">
          <Mark />
        </Link>
        <div className="mt-12">
          <Link
            href="/"
            className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
            data-testid="link-back-login"
          >
            <ArrowLeft size={16} /> Back to sign in
          </Link>
          <p className="mono mb-3 text-[10px] uppercase tracking-[.2em] text-muted-foreground">Account access</p>
          <h1 className="text-3xl font-extrabold tracking-[-.04em]">Reset your password.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Self-service reset isn’t available yet. Ask your administrator to set a new password for your account.
          </p>
          <form onSubmit={submit} className="mt-8">
            <label className="block text-sm font-bold">
              Email address
              <input
                autoComplete="email"
                className={`${inputClass} mt-2`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                placeholder="you@yourshop.com"
                data-testid="input-reset-email"
              />
            </label>
            {error && (
              <p className="mt-3 text-sm font-semibold text-destructive" data-testid="text-reset-error">
                {error}
              </p>
            )}
            <button className={`${buttonPrimary} mt-4 w-full`} data-testid="button-send-reset">
              Notify administrator <ArrowRight size={17} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Dashboard
 * ------------------------------------------------------------------------ */

function Dashboard() {
  const profile = useProfile();
  const summary = useDashboard();
  const recent = useRecentInvoices();
  const low = useLowStock();

  const stats = [
    { label: 'Stock items', value: summary.data?.total_products ?? '—', note: 'in your catalog', icon: '01' },
    { label: 'Invoices', value: summary.data?.total_invoices ?? '—', note: 'confirmed so far', icon: '02' },
    {
      label: 'Low stock alerts',
      value: summary.data?.low_stock_products ?? '—',
      note: summary.data?.low_stock_products ? 'worth checking today' : 'all shelves look good',
      icon: '03',
    },
  ];

  return (
    <AppShell>
      <PageHeading
        eyebrow={dateLabel(new Date().toISOString())}
        title={`Welcome back, ${profile.ownerName.split(' ')[0]}.`}
        description="A clear desk makes a calmer counter. Here’s what needs your attention today."
        action={
          <Link href="/upload" className={buttonPrimary} data-testid="link-start-invoice">
            <FilePlus2 size={17} /> New invoice
          </Link>
        }
      />

      {summary.isError && (
        <div className="mb-6">
          <ErrorNotice message={errorMessage(summary.error, 'Could not load the dashboard.')} onRetry={() => summary.refetch()} />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, i) => (
          <SectionCard
            key={stat.label}
            className={`rise-in p-5 ${i === 2 && summary.data?.low_stock_products ? 'border-secondary/70 bg-secondary/10' : ''}`}
          >
            <div className="flex items-start justify-between">
              <span className="mono text-[10px] text-muted-foreground">{stat.icon}</span>
            </div>
            <p className="mt-8 text-4xl font-extrabold tracking-[-.06em]">{stat.value}</p>
            <p className="mt-1 text-sm font-bold">{stat.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
          </SectionCard>
        ))}
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <SectionCard>
          <div className="flex items-center justify-between border-b border-border px-5 py-5">
            <div>
              <h2 className="font-extrabold">Recent invoices</h2>
              <p className="mt-1 text-xs text-muted-foreground">The latest from your counter.</p>
            </div>
            <Link href="/transactions" className="text-xs font-bold text-primary hover:underline" data-testid="link-see-all-transactions">
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
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted mono text-[10px] text-primary">
                    {invoice.invoice_number.slice(-2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{invoice.customer_name || 'Walk-in customer'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {invoice.invoice_number} · {dateLabel(invoice.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="mono text-sm font-medium">{money(invoice.total_amount)}</p>
                    <p className="mt-1 text-[10px] uppercase text-muted-foreground">{invoice.payment_status}</p>
                  </div>
                  <ArrowRight size={15} className="text-muted-foreground" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No invoices yet"
              body="Create your first invoice from a handwritten note."
              action={
                <Link href="/upload" className={buttonPrimary}>
                  <FilePlus2 size={16} /> New invoice
                </Link>
              }
            />
          )}
        </SectionCard>

        <SectionCard className="overflow-hidden">
          <div className="border-b border-border bg-primary p-5 text-primary-foreground">
            <p className="mono text-[10px] uppercase tracking-[.18em] text-primary-foreground/60">Shelf check</p>
            <h2 className="mt-8 text-2xl font-extrabold tracking-[-.04em]">
              {low.data && low.data.length > 0 ? `${low.data.length} items need a top-up.` : 'Shelves look steady.'}
            </h2>
          </div>
          <div className="space-y-4 p-5">
            {low.isLoading ? (
              <Loading />
            ) : low.data && low.data.length > 0 ? (
              low.data.slice(0, 5).map((item) => (
                <div className="flex items-center justify-between" key={item.id}>
                  <div>
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.quantity_available} {item.unit} left
                    </p>
                  </div>
                  <span className="mono text-xs text-accent">low</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nothing is below your threshold.</p>
            )}
            <Link href="/catalog" className={`${buttonQuiet} mt-2 w-full text-xs`} data-testid="link-open-catalog">
              Open catalog <ArrowRight size={15} />
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

function UploadPage() {
  const [, setLocation] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const selectFile = (next: File | undefined) => {
    if (!next) return;
    if (!next.type.startsWith('image/')) return setError('Please choose an image of the handwritten note.');
    setError('');
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files[0]);
  };

  const extract = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const job = await endpoints.extract(file);
      let items = job.items;
      try {
        items = await endpoints.matchJob(job.id);
      } catch {
        /* matching is best-effort; fall back to unmatched extracted items */
      }
      const payload: ReviewPayload = { job_id: job.id, items };
      sessionStorage.setItem('sia-review', JSON.stringify(payload));
      setLocation('/review');
    } catch (e) {
      setError(errorMessage(e, 'The extraction service was unavailable.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <PageHeading
        eyebrow="New invoice"
        title="Bring the note to the desk."
        description="Upload a clear photo of the handwritten order. We’ll suggest matches, then you check every line before anything is confirmed."
      />
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`relative flex min-h-[330px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition ${
                dragging ? 'border-primary bg-primary/5' : 'border-border bg-card'
              } ${preview ? 'p-3' : 'p-8'}`}
              data-testid="dropzone-upload"
            >
              {preview ? (
                <>
                  <img
                    src={preview}
                    alt="Preview of handwritten note"
                    className="max-h-[340px] w-full rounded-xl object-contain"
                    data-testid="img-note-preview"
                  />
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview('');
                    }}
                    className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-foreground/75 text-background"
                    data-testid="button-remove-file"
                  >
                    <X size={17} />
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-secondary/30 text-primary">
                    <UploadCloud size={28} />
                  </div>
                  <h2 className="text-lg font-extrabold">Drop the note here</h2>
                  <p className="mt-2 text-center text-sm text-muted-foreground">
                    A straight-on photo with good light works best.
                  </p>
                  <label className={`${buttonQuiet} mt-6 cursor-pointer`}>
                    <FileImage size={16} /> Browse image
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => selectFile(e.target.files?.[0])}
                      data-testid="input-note-file"
                    />
                  </label>
                </>
              )}
            </div>
            {error && (
              <div className="mt-4">
                <ErrorNotice message={error} onRetry={() => setError('')} />
              </div>
            )}
          </div>
          <SectionCard className="h-fit p-6">
            <p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Before you continue</p>
            <h2 className="mt-3 text-xl font-extrabold tracking-[-.03em]">A careful first pass.</h2>
            <div className="mt-6 space-y-5">
              {[
                ['01', 'One note at a time', 'Keep the whole page in frame, with no fingers over the writing.'],
                ['02', 'Suggestions, not guesses', 'Matches and prices are always shown for your review.'],
                ['03', 'You stay in control', 'Nothing changes in your stock or sales until you confirm.'],
              ].map(([number, title, body]) => (
                <div className="flex gap-3" key={number}>
                  <span className="mono mt-0.5 text-[10px] text-secondary-foreground">{number}</span>
                  <div>
                    <p className="text-sm font-bold">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={extract} disabled={!file || loading} className={`${buttonPrimary} mt-8 w-full`} data-testid="button-extract">
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Reading note…
                </>
              ) : (
                <>
                  Read this note <ArrowRight size={17} />
                </>
              )}
            </button>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}

/* ---------------------------------------------------------------------------
 * Review → Confirm
 * ------------------------------------------------------------------------ */

interface ReviewRow {
  id: string;
  raw_text: string;
  stock_id: string | null;
  qty: number;
  extracted_item_id: string | null;
}

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function ReviewPage() {
  const [, setLocation] = useLocation();
  const stock = useStock();
  const [jobId, setJobId] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('sia-review') || 'null') as ReviewPayload | null;
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
        setRows([{ id: 'manual-1', raw_text: '', stock_id: null, qty: 1, extracted_item_id: null }]);
      }
    } catch {
      setRows([]);
    }
  }, []);

  const stockById = useMemo(() => {
    const map = new Map<string, StockItem>();
    (stock.data ?? []).forEach((item) => map.set(item.id, item));
    return map;
  }, [stock.data]);

  const priceFor = (row: ReviewRow) => (row.stock_id ? stockById.get(row.stock_id)?.unit_price ?? 0 : 0);
  const total = rows.reduce((sum, row) => sum + row.qty * priceFor(row), 0);

  const update = (id: string, patch: Partial<ReviewRow>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const addRow = () =>
    setRows((current) => [
      ...current,
      { id: `manual-${Date.now()}`, raw_text: '', stock_id: null, qty: 1, extracted_item_id: null },
    ]);

  const confirm = async () => {
    if (rows.length === 0) return setError('Add at least one item.');
    if (rows.some((row) => !row.stock_id)) return setError('Choose a catalog item for every row before confirming.');
    if (rows.some((row) => !row.qty || row.qty <= 0)) return setError('Quantity must be greater than 0 on every row.');

    setSaving(true);
    setError('');
    try {
      let customerId: string | null = null;
      if (customer.name.trim()) {
        const created = await endpoints.createCustomer(customer.name.trim(), customer.phone.trim() || undefined);
        customerId = created.id;
      }
      const transaction = await endpoints.confirm({
        extraction_job_id: jobId && isUuid(jobId) ? jobId : null,
        customer_id: customerId,
        items: rows.map((row) => ({
          stock_id: row.stock_id as string,
          qty: row.qty,
          extracted_item_id: row.extracted_item_id ?? undefined,
        })),
      });
      sessionStorage.removeItem('sia-review');
      setLocation(`/invoice/${transaction.invoice_id}`);
    } catch (e) {
      setError(errorMessage(e, 'Could not confirm the invoice.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex items-center gap-3">
          <Link
            href="/upload"
            className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card hover:bg-muted"
            data-testid="link-back-upload"
          >
            <ArrowLeft size={17} />
          </Link>
          <div>
            <p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Step 2 of 3</p>
            <p className="text-sm font-bold">Check the details</p>
          </div>
        </div>
        <PageHeading
          eyebrow="Human review"
          title="Does this look right?"
          description="Prices come from your catalog. Check the highlighted rows and pick a match before confirming."
          action={
            <button onClick={addRow} className={buttonQuiet} data-testid="button-add-review-item">
              <Plus size={17} /> Add item
            </button>
          }
        />
        {stock.isError && (
          <div className="mb-5">
            <ErrorNotice message={errorMessage(stock.error, 'Could not load your catalog.')} onRetry={() => stock.refetch()} />
          </div>
        )}
        {error && (
          <div className="mb-5">
            <ErrorNotice message={error} />
          </div>
        )}
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
              const stockItem = row.stock_id ? stockById.get(row.stock_id) : undefined;
              const needsReview = !row.stock_id;
              return (
                <div
                  key={row.id}
                  className={`grid gap-4 px-4 py-5 md:grid-cols-[1.1fr_1.4fr_.55fr_.7fr_.8fr_40px] md:items-center md:gap-3 md:px-5 ${
                    needsReview ? 'bg-secondary/10' : ''
                  }`}
                  data-testid={`row-review-${row.id}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="mono text-[10px] text-muted-foreground">0{index + 1}</span>
                      <input
                        className={`${inputClass} !min-h-9`}
                        value={row.raw_text}
                        onChange={(e) => update(row.id, { raw_text: e.target.value })}
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
                  <select
                    className={`${inputClass} ${needsReview ? 'border-secondary-foreground/50' : ''}`}
                    value={row.stock_id || ''}
                    onChange={(e) => update(row.id, { stock_id: e.target.value || null })}
                    data-testid={`select-review-item-${row.id}`}
                  >
                    <option value="">Select catalog item</option>
                    {(stock.data ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {money(item.unit_price)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className={inputClass}
                    value={row.qty}
                    onChange={(e) => update(row.id, { qty: Number(e.target.value) })}
                    data-testid={`input-review-quantity-${row.id}`}
                  />
                  <span className="hidden text-sm text-muted-foreground md:block">
                    {stockItem ? `${money(stockItem.unit_price)}/${stockItem.unit}` : '—'}
                  </span>
                  <span className="mono text-sm font-medium md:text-right">{money(row.qty * priceFor(row))}</span>
                  <button
                    onClick={() => setRows((current) => current.filter((r) => r.id !== row.id))}
                    className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${row.raw_text || 'row'}`}
                    data-testid={`button-delete-review-${row.id}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-4 border-t border-border bg-muted/30 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">{rows.length} lines</strong> · Tax and discounts are not applied
            </p>
            <div className="flex items-center justify-between gap-8 sm:justify-end">
              <span className="text-sm font-bold">Total</span>
              <span className="mono text-2xl font-medium">{money(total)}</span>
            </div>
          </div>
        </SectionCard>
        <SectionCard className="mt-6 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-bold">
                Customer <span className="font-normal text-muted-foreground">(optional)</span>
                <input
                  className={`${inputClass} mt-2`}
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="Walk-in customer"
                  data-testid="input-customer-name"
                />
              </label>
            </div>
            <div className="flex-1">
              <label className="text-sm font-bold">
                Phone <span className="font-normal text-muted-foreground">(optional)</span>
                <input
                  className={`${inputClass} mt-2`}
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="For their receipt"
                  data-testid="input-customer-phone"
                />
              </label>
            </div>
            <button
              onClick={confirm}
              disabled={saving || !rows.length}
              className={`${buttonPrimary} sm:min-w-[190px]`}
              data-testid="button-confirm-invoice"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Saving…
                </>
              ) : (
                <>
                  Confirm invoice <Check size={17} />
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

function InvoicePage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const invoice = useInvoice(invoiceId);
  const customers = useCustomers();
  const [pdfError, setPdfError] = useState('');
  const [downloading, setDownloading] = useState(false);

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
        <div className="mb-7 flex items-center justify-between">
          <Link
            href="/transactions"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
            data-testid="link-back-history"
          >
            <ArrowLeft size={16} /> Transaction history
          </Link>
          <button onClick={download} disabled={downloading} className={buttonPrimary} data-testid="button-download-pdf">
            <Download size={16} /> {downloading ? 'Preparing…' : 'Download PDF'}
          </button>
        </div>
        {pdfError && (
          <div className="mb-4">
            <ErrorNotice message={pdfError} />
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
            <SectionCard className="p-5">
              <p className="mono text-[10px] uppercase tracking-[.17em] text-muted-foreground">Payment</p>
              <p className="mt-3 font-bold capitalize">{data.payment_status}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {money(data.paid_amount)} paid · {money(data.remaining_amount)} due
              </p>
            </SectionCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

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

function CatalogPage() {
  const stock = useStock();
  const { create, update, remove } = useStockMutations();
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

  return (
    <AppShell>
      <PageHeading
        eyebrow="Stock catalog"
        title="Know what’s on the shelf."
        description="Your catalog keeps suggestions grounded in the way you actually sell things."
        action={
          <button onClick={() => begin()} className={buttonPrimary} data-testid="button-add-catalog-item">
            <Plus size={17} /> Add item
          </button>
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
    </AppShell>
  );
}

/* ---------------------------------------------------------------------------
 * Transactions (invoice history)
 * ------------------------------------------------------------------------ */

function TransactionsPage() {
  const invoices = useInvoices();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const rows = (invoices.data ?? []).filter(
    (invoice) =>
      (status === 'all' || invoice.payment_status === status) &&
      invoice.invoice_number.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell>
      <PageHeading
        eyebrow="History"
        title="Every sale, in one place."
        description="Find a past invoice quickly by its number."
        action={
          <Link href="/upload" className={buttonPrimary} data-testid="link-new-transaction">
            <FilePlus2 size={17} /> New invoice
          </Link>
        }
      />
      {invoices.isError && (
        <div className="mb-5">
          <ErrorNotice message={errorMessage(invoices.error, 'Could not load invoices.')} onRetry={() => invoices.refetch()} />
        </div>
      )}
      <SectionCard className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border bg-muted/25 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 text-muted-foreground" size={17} />
            <input
              className={`${inputClass} pl-10`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search invoice number"
              data-testid="input-search-transactions"
            />
          </div>
          <select
            className={`${inputClass} sm:w-44`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            data-testid="select-transaction-status"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        {invoices.isLoading ? (
          <Loading />
        ) : rows.length ? (
          <>
            <div className="hidden grid-cols-[1fr_.8fr_.8fr_120px] gap-4 border-b border-border px-5 py-3 mono text-[10px] uppercase tracking-wider text-muted-foreground sm:grid">
              <span>Invoice</span>
              <span>Date</span>
              <span>Total</span>
              <span>Payment</span>
            </div>
            <div className="divide-y divide-border">
              {rows.map((invoice) => (
                <Link
                  href={`/invoice/${invoice.id}`}
                  key={invoice.id}
                  className="grid gap-3 px-5 py-4 transition hover:bg-muted/45 sm:grid-cols-[1fr_.8fr_.8fr_120px] sm:items-center sm:gap-4"
                  data-testid={`link-transaction-${invoice.id}`}
                >
                  <div>
                    <p className="text-sm font-bold">{invoice.invoice_number}</p>
                    <p className="mt-1 text-xs text-muted-foreground sm:hidden">{dateLabel(invoice.created_at)}</p>
                  </div>
                  <span className="hidden text-sm text-muted-foreground sm:block">{dateLabel(invoice.created_at)}</span>
                  <span className="mono text-sm">{money(invoice.total_amount)}</span>
                  <span className="mono text-[10px] uppercase tracking-wide text-muted-foreground">{invoice.payment_status}</span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="No invoices found"
            body="Try clearing the filters, or create a new invoice from a handwritten note."
            action={
              <Link href="/upload" className={buttonPrimary}>
                <FilePlus2 size={16} /> Create invoice
              </Link>
            }
          />
        )}
      </SectionCard>
    </AppShell>
  );
}

/* ---------------------------------------------------------------------------
 * Shell / routing
 * ------------------------------------------------------------------------ */

function NotFound() {
  return (
    <div className="app-shell grid place-items-center bg-background p-6 text-center">
      <div>
        <p className="mono text-xs text-muted-foreground">404 · nothing here</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-.05em]">That shelf is empty.</h1>
        <Link href="/dashboard" className={`${buttonPrimary} mt-6`} data-testid="link-not-found-home">
          Back to overview
        </Link>
      </div>
    </div>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Routes() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/dashboard">
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        </Route>
        <Route path="/upload">
          <RequireAuth>
            <UploadPage />
          </RequireAuth>
        </Route>
        <Route path="/review">
          <RequireAuth>
            <ReviewPage />
          </RequireAuth>
        </Route>
        <Route path="/invoice/:invoiceId">
          <RequireAuth>
            <InvoicePage />
          </RequireAuth>
        </Route>
        <Route path="/catalog">
          <RequireAuth>
            <CatalogPage />
          </RequireAuth>
        </Route>
        <Route path="/transactions">
          <RequireAuth>
            <TransactionsPage />
          </RequireAuth>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

export function logout() {
  clearSession();
  location.assign('/');
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Routes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
