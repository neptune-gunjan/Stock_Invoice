import re

with open('src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure recharts is imported
if 'recharts' not in content:
    content = content.replace(
        "import { useEffect, useMemo",
        "import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';\nimport { useEffect, useMemo"
    )

new_chart = '''function SalesChart({
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
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => \\\} />
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
}'''

start_idx = content.find('function SalesChart({')
end_idx = content.find('function Dashboard() {')
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_chart + '\n\n' + content[end_idx:]

with open('src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
