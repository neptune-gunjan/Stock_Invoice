import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { BarChart3, Boxes, FileCheck2, FilePlus2, History, LogOut, Menu, Save, Store, Users, X } from 'lucide-react';
import { clearSession } from '@/lib/auth';
import { useProfile } from '@/lib/data';

const nav = [
  { href: '/dashboard', label: 'Overview', icon: BarChart3 },
  { href: '/upload', label: 'New invoice', icon: FilePlus2 },
  { href: '/catalog', label: 'Stock catalog', icon: Boxes },
  { href: '/transactions', label: 'Transactions', icon: History },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/business', label: 'Business', icon: Store },
];

export function Mark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
        <span className="text-lg font-extrabold">S</span>
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-accent" />
      </div>
      {!compact && (
        <div>
          <div className="font-extrabold tracking-tight text-sidebar-foreground">
            stock<span className="text-secondary">.</span>
          </div>
          <div className="mono text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/55">invoice desk</div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const profile = useProfile();
  const active = (href: string) => location === href || (href !== '/dashboard' && location.startsWith(href));
  const initials =
    profile.ownerName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'SO';
  const logout = () => {
    clearSession();
    setLocation('/');
  };

  return (
    <div className="app-shell flex bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col bg-sidebar px-5 py-6 text-sidebar-foreground transition-transform duration-300 md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-10 flex items-center justify-between">
          <Link href="/dashboard" data-testid="link-brand">
            <Mark />
          </Link>
          <button
            className="rounded-lg p-2 text-sidebar-foreground/60 md:hidden"
            onClick={() => setOpen(false)}
            data-testid="button-close-menu"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mb-3 px-3 mono text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/40">Workspace</div>
        <nav className="space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                active(href)
                  ? 'bg-sidebar-accent text-secondary'
                  : 'text-sidebar-foreground/68 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
            >
              <Icon size={18} strokeWidth={active(href) ? 2.2 : 1.8} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-sidebar-border pt-5">
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary/15 font-bold text-secondary">{initials}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile.ownerName}</p>
              <p className="truncate text-xs text-sidebar-foreground/50">{profile.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            data-testid="button-logout"
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut size={17} />
            Log out
          </button>
        </div>
      </aside>
      {open && (
        <button
          className="fixed inset-0 z-30 bg-foreground/25 md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
          data-testid="button-overlay"
        />
      )}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/95 px-5 backdrop-blur md:px-9">
          <button onClick={() => setOpen(true)} className="rounded-xl p-2 hover:bg-muted md:hidden" data-testid="button-open-menu">
            <Menu size={21} />
          </button>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            <FileCheck2 size={15} className="text-secondary-foreground" />
            <span className="text-foreground">
              Today, {new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(new Date())}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {initials}
            </div>
          </div>
        </header>
        <div className="px-5 pb-24 pt-7 md:px-9 md:pb-10">{children}</div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-card/95 px-2 py-2 backdrop-blur md:hidden">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            data-testid={`link-mobile-${label.toLowerCase().replace(' ', '-')}`}
            className={`grid min-h-12 place-items-center gap-1 rounded-lg text-[10px] font-semibold ${
              active(href) ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Icon size={18} />
            <span>{label === 'New invoice' ? 'New' : label.split(' ')[0]}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
