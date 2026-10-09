import { PageHeading, SectionCard, ErrorNotice } from '../App';
import { AppShell } from '../components/AppShell';
import { useQuery } from '@tanstack/react-query';
import { endpoints, money } from '../lib/data';
import { Loader2, TrendingUp, TrendingDown, IndianRupee, PieChart, Users } from 'lucide-react';
import { apiJson } from '../lib/api';

interface TopProduct {
  name: string;
  qty_sold: number;
  revenue: number;
}

interface TopCustomer {
  name: string;
  revenue: number;
}

interface ReportsSummary {
  gross_sales: number;
  discounts_given: number;
  net_sales: number;
  gst_collected: number;
  total_payments_received: number;
  total_outstanding: number;
  top_products: TopProduct[];
  top_customers: TopCustomer[];
}

function StatCard({ title, value, icon: Icon, color = 'primary' }: any) {
  return (
    <SectionCard className="flex flex-col p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`grid h-8 w-8 place-items-center rounded-lg bg-${color}/15 text-${color}`}>
          <Icon size={18} />
        </div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
      </div>
      <p className="text-2xl font-extrabold mono">{value}</p>
    </SectionCard>
  );
}

export default function ReportsPage() {
  const { data, isLoading, error, refetch } = useQuery<ReportsSummary>({
    queryKey: ['reports'],
    queryFn: () => apiJson<ReportsSummary>('/dashboard/reports'),
  });

  return (
    <AppShell>
      <PageHeading
        eyebrow="Intelligence"
        title="Reports & Analytics"
        description="Comprehensive overview of your business performance."
      />

      {isLoading && (
        <SectionCard className="p-10 flex justify-center">
          <Loader2 className="animate-spin text-muted-foreground" />
        </SectionCard>
      )}

      {error && (
        <ErrorNotice message="Could not load reports." onRetry={() => refetch()} />
      )}

      {data && (
        <div className="space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Financial Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Gross Sales" value={money(data.gross_sales)} icon={TrendingUp} />
            <StatCard title="Discounts Given" value={money(data.discounts_given)} icon={TrendingDown} color="destructive" />
            <StatCard title="Net Sales" value={money(data.net_sales)} icon={PieChart} color="accent" />
            <StatCard title="GST Collected" value={money(data.gst_collected)} icon={IndianRupee} color="secondary" />
            <StatCard title="Total Received" value={money(data.total_payments_received)} icon={IndianRupee} />
            <StatCard title="Total Outstanding" value={money(data.total_outstanding)} icon={IndianRupee} color="destructive" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mt-8">
            <SectionCard className="p-0 overflow-hidden">
              <div className="border-b border-border bg-muted/40 px-5 py-4 flex items-center gap-2">
                <PieChart size={16} className="text-muted-foreground" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Top Selling Products</h3>
              </div>
              {data.top_products.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No sales data available.</div>
              ) : (
                <div className="divide-y divide-border">
                  {data.top_products.map((p, i) => (
                    <div key={i} className="flex justify-between items-center p-4 hover:bg-muted/30">
                      <div>
                        <p className="font-bold text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.qty_sold} units sold</p>
                      </div>
                      <span className="mono font-bold">{money(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard className="p-0 overflow-hidden">
              <div className="border-b border-border bg-muted/40 px-5 py-4 flex items-center gap-2">
                <Users size={16} className="text-muted-foreground" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Top Customers</h3>
              </div>
              {data.top_customers.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No sales data available.</div>
              ) : (
                <div className="divide-y divide-border">
                  {data.top_customers.map((c, i) => (
                    <div key={i} className="flex justify-between items-center p-4 hover:bg-muted/30">
                      <p className="font-bold text-sm">{c.name}</p>
                      <span className="mono font-bold">{money(c.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </AppShell>
  );
}
