import { BarChart3, MapPinned, UserCog, Users as UsersIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ChartComponent from 'src/Components/ChartComponent';

type MonthlyPoint = { month: string; amount: number };
type WeeklyPoint = { week: string; amount: number };
type ChartPoint = MonthlyPoint | WeeklyPoint;

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: boolean;
  trendValue?: number;
  actionLabel?: string;
  actionTo?: string;
  gradient?: string;
};

const apiBase = import.meta.env.VITE_API_URL as string;

const Icons = {
  TrendUp: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  TrendDown: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
};

const Dashboard = () => {
  // Monthly chart data only (to match SupervisorDashboard behavior)
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentsRows, setPaymentsRows] = useState<any[]>([]);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = All months

  // Filters like Reports + SupervisorDashboard
  type SimpleZone = { id: number; zone_name: string; supervisor_id?: number | null };
  const [zones, setZones] = useState<SimpleZone[]>([]);
  const [zoneId, setZoneId] = useState<string>('');
  const [supervisors, setSupervisors] = useState<Array<{ id: number; username: string }>>([]);
  const [supervisorId, setSupervisorId] = useState<string>('');

  const fmt = (n: number | null | undefined) => Number(n ?? 0).toLocaleString();

  const [dashboardData, setDashboardData] = useState({
    zones: { total: 15, supervisors: 45, chiefs: 15 },
    clients: { total: 3247 },
    manpower: { total: 15680 },
    vehicles: { total: 892, drivers: 945 },
    payments: { currentMonth: 245670, today: 12345 },
  });

  // Derived series from real payments data
  const [series, setSeries] = useState<{
    yearly: { year: string; amount: number }[];
    monthly: MonthlyPoint[];
    weekly: WeeklyPoint[];
    daily: { day: string; amount: number }[];
  }>({ yearly: [], monthly: [], weekly: [], daily: [] });

  //

  // Group completed payments into yearly, monthly (for selected year), weekly (for selected year+month) and daily sums
  function aggregatePayments(payments: any[], year: number, month1to12: number) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    // Monthly: all 12 months of selected year
    const monthsMeta = Array.from({ length: 12 }, (_, i) => ({
      key: `${year}-${String(i+1).padStart(2,'0')}`,
      label: months[i],
      year,
      monthIdx: i,
    }));
    const monthlyMap = new Map(monthsMeta.map(m => [m.key, 0] as [string, number]));
    // Weekly: selected month in selected year
    const weekly = [0,0,0,0];
    const curKey = `${year}-${String(month1to12).padStart(2,'0')}`;
    // Yearly: last 5 years including current
    const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - (4 - i)));
    const yearlyMap = new Map(years.map(y => [y, 0] as [string, number]));
    // Daily: last 7 days including today (kept global)
    const now = new Date();
    const dayLabels: string[] = [];
    const dayKeys: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      dayKeys.push(key);
      dayLabels.push(`Day ${7 - i}`);
    }
    const dailyMap = new Map(dayKeys.map(k => [k, 0] as [string, number]));
    const filtered = Array.isArray(payments)
      ? payments.filter((p) => {
          const s = String(p?.status || '').toLowerCase();
          return !p?.status || s === 'success' || s === 'successful';
        })
      : [];

    for (const p of filtered) {
      const amount = Number(p.amount || 0);
      const dt = new Date(p.completed_at || p.created_at || p.updated_at || p.inserted_at || Date.now());
      const mKey = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
      if (monthlyMap.has(mKey)) monthlyMap.set(mKey, (monthlyMap.get(mKey) || 0) + amount);
      if (mKey === curKey) {
        const weekOfMonth = Math.min(4, Math.max(1, Math.ceil(dt.getDate() / 7)));
        weekly[weekOfMonth - 1] += amount;
      }
      const yKey = String(dt.getFullYear());
      if (yearlyMap.has(yKey)) yearlyMap.set(yKey, (yearlyMap.get(yKey) || 0) + amount);
      const dKey = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
      if (dailyMap.has(dKey)) dailyMap.set(dKey, (dailyMap.get(dKey) || 0) + amount);
    }

    const monthlySeries: MonthlyPoint[] = monthsMeta.map(m => ({ month: m.label, amount: monthlyMap.get(m.key) || 0 }));
    const weeklySeries: WeeklyPoint[] = [
      { week: 'Week 1', amount: weekly[0] },
      { week: 'Week 2', amount: weekly[1] },
      { week: 'Week 3', amount: weekly[2] },
      { week: 'Week 4', amount: weekly[3] },
    ];
    const yearlySeries = years.map(y => ({ year: y, amount: yearlyMap.get(y) || 0 }));
    const dailySeries = dayKeys.map((k, idx) => ({ day: dayLabels[idx], amount: dailyMap.get(k) || 0 }));
    return { yearly: yearlySeries, monthly: monthlySeries, weekly: weeklySeries, daily: dailySeries };
  }

  useEffect(() => {
    // Always show monthly series
    setChartData(series.monthly || []);
  }, [series]);

  // Fetch completed payments and compute series
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setChartLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          // Use demo data if no token
          const demoData = [
            { month: 'Jan', amount: 40000 },
            { month: 'Feb', amount: 32000 },
            { month: 'Mar', amount: 28000 },
            { month: 'Apr', amount: 35000 },
            { month: 'May', amount: 42000 },
            { month: 'Jun', amount: 38000 },
          ];
          setChartData(demoData);
          return;
        }
        const res = await fetch(`${apiBase}/api/payments/completed`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const rows = Array.isArray(data?.payments) ? data.payments : [];
        if (!cancelled) {
          setPaymentsRows(rows);
          const s = aggregatePayments(rows, selectedYear, selectedMonth);
          setSeries({ yearly: s.yearly, monthly: s.monthly, weekly: s.weekly, daily: s.daily });
        }
      } catch (e) {
        if (!cancelled) {
          // Fallback demo data
          const demoData = [
            { month: 'Jan', amount: 40000 },
            { month: 'Feb', amount: 32000 },
            { month: 'Mar', amount: 28000 },
            { month: 'Apr', amount: 35000 },
            { month: 'May', amount: 42000 },
            { month: 'Jun', amount: 38000 },
          ];
          setChartData(demoData);
        }
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Load zones for manager (and supervisor if needed in the future)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${apiBase}/api/zones`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load zones');
        const zs: SimpleZone[] = (data.zones || []).map((z: any) => ({ id: z.id, zone_name: z.zone_name, supervisor_id: z.supervisor_id }));
        setZones(zs);
      })
      .catch(() => {});
  }, []);

  // Load supervisors list (manager)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${apiBase}/api/report/supervisors`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load supervisors');
        setSupervisors(Array.isArray(data.supervisors) ? data.supervisors : []);
      })
      .catch(() => {});
  }, []);

  // Filter payments by selected year/month, zone, supervisor
  const filteredPayments = useMemo(() => {
    const inSameYearMonth = (iso?: string | null) => {
      if (!iso) return false;
      const d = new Date(iso);
      if (d.getFullYear() !== selectedYear) return false;
      if (selectedMonth && (d.getMonth() + 1) !== selectedMonth) return false;
      return true;
    };
    const supervisorZoneIds = supervisorId
      ? zones.filter(z => String(z.supervisor_id ?? '') === String(supervisorId)).map(z => z.id)
      : [];
    return paymentsRows.filter((p: any) => {
      if (!inSameYearMonth(p?.completed_at || p?.created_at || p?.updated_at || p?.inserted_at)) return false;
      if (zoneId && String(p?.zone_id ?? '') !== String(zoneId)) return false;
      if (!zoneId && supervisorId && !supervisorZoneIds.includes(Number(p?.zone_id))) return false;
      return true;
    });
  }, [paymentsRows, selectedYear, selectedMonth, zoneId, supervisorId, zones]);

  // Recompute series when filters change
  useEffect(() => {
    const s = aggregatePayments(filteredPayments, selectedYear, selectedMonth);
    setSeries({ yearly: s.yearly, monthly: s.monthly, weekly: s.weekly, daily: s.daily });
  }, [filteredPayments, selectedYear, selectedMonth]);

  // Recompute series when drill-down filters change
  useEffect(() => {
    const s = aggregatePayments(paymentsRows, selectedYear, selectedMonth);
    setSeries({ yearly: s.yearly, monthly: s.monthly, weekly: s.weekly, daily: s.daily });
  }, [paymentsRows, selectedYear, selectedMonth]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    fetch(`${apiBase}/api/manager/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load dashboard');
        setDashboardData((prev) => ({
          ...prev,
          zones: data.zones ?? prev.zones,
          clients: data.clients ?? prev.clients,
          manpower: data.manpower ?? prev.manpower,
          vehicles: data.vehicles ?? prev.vehicles,
          payments: data.payments ?? prev.payments,
        }));
      })
      .catch((e) => console.error('Dashboard load error:', e))
      .finally(() => setLoading(false));
  }, []);

  const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    trend,
    trendValue,
    actionLabel,
    actionTo,
    gradient = 'from-amber-500 to-yellow-600',
  }: StatCardProps) => (
    <div className="group bg-white rounded-xl shadow-sm border border-zinc-100 p-3 sm:p-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <p className="text-xs font-medium text-zinc-500 mb-1">{title}</p>
          <p className="text-2xl font-semibold text-zinc-900">{loading ? '...' : value}</p>
          {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
          {trend && typeof trendValue === 'number' && (
            <div
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-2 ${
                trendValue > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {trendValue > 0 ? <Icons.TrendUp /> : <Icons.TrendDown />}
              <span className="ml-1">{Math.abs(trendValue)}%</span>
            </div>
          )}
          {actionLabel && actionTo && (
            <Link
              to={actionTo}
              className="block text-xs text-amber-600 mt-2 hover:underline transition-colors"
            >
              {actionLabel}
            </Link>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br ${gradient} shadow-sm`}>
          <div className="text-white w-5 h-5">{icon}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Business Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Here's an overview of your operations today.</p>
        </div>
        <div className="flex items-center mt-3 sm:mt-0 space-x-2 text-sm text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>System Online</span>
        </div>
      </div>

      {/* Compact cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title="Zones Managed"
          value={dashboardData.zones.total}
          subtitle={`${dashboardData.zones.supervisors} Supervisors • ${dashboardData.zones.chiefs} Chiefs`}
          icon={<MapPinned className="w-5 h-5" />}
          actionLabel="Manage zones"
          actionTo="/zones"
          gradient="from-amber-500 to-orange-500"
        />
        <StatCard
          title="Total Clients"
          value={fmt(dashboardData.clients.total)}
          subtitle="Active clients"
          icon={<UsersIcon className="w-5 h-5" />}
          trend
          trendValue={12.5}
          actionLabel="Manage clients"
          actionTo="/clients"
          gradient="from-green-500 to-emerald-500"
        />
        <StatCard
          title="Manpower"
          value={fmt(dashboardData.manpower.total)}
          subtitle="Total workforce"
          icon={<UserCog className="w-5 h-5" />}
          trend
          trendValue={8.2}
          actionLabel="Manage manpower"
          actionTo="/manpower-dashboard"
          gradient="from-zinc-700 to-neutral-800"
        />
        <StatCard
          title="Vehicles & Drivers"
          value={dashboardData.vehicles.total}
          subtitle={`${dashboardData.vehicles.drivers} Drivers`}
          icon={<BarChart3 className="w-5 h-5" />}
          actionLabel="Manage vehicles"
          actionTo="/vehicles"
          gradient="from-amber-600 to-orange-600"
        />
        <StatCard
          title="Current Month Payments"
          value={`$${fmt(dashboardData.payments.currentMonth)}`}
          subtitle="Total payments this month"
          icon={<BarChart3 className="w-5 h-5" />}
          trend
          trendValue={15.3}
          gradient="from-emerald-500 to-teal-600"
        />
        <StatCard
          title="Today's Payments"
          value={`$${fmt(dashboardData.payments.today)}`}
          subtitle="Payments received today"
          icon={<BarChart3 className="w-5 h-5" />}
          gradient="from-amber-600 to-yellow-500"
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-800">Payment Trends</h2>
            <p className="text-xs text-zinc-500 mt-1">Visual overview of payment performance</p>
          </div>
          <div className="flex flex-wrap items-end gap-2 mt-3 md:mt-0">
            <div>
              <label className="block text-[11px] text-zinc-600">Year</label>
              <select className="text-xs bg-white border border-zinc-200 rounded-md px-2 py-1 text-zinc-700" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                {Array.from({ length: 6 }).map((_, i) => {
                  const y = new Date().getFullYear() - i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-zinc-600">Month</label>
              <select className="text-xs bg-white border border-zinc-200 rounded-md px-2 py-1 text-zinc-700" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                <option value={0}>All months</option>
                {Array.from({ length: 12 }).map((_, i) => {
                  const m = i + 1;
                  const d = new Date(2000, i, 1);
                  const name = d.toLocaleString(undefined, { month: 'long' });
                  return <option key={m} value={m}>{name}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-zinc-600">Zone</label>
              <select className="text-xs bg-white border border-zinc-200 rounded-md px-2 py-1 text-zinc-700" value={zoneId} onChange={(e) => { setZoneId(e.target.value); if (e.target.value) setSupervisorId(''); }}>
                <option value="">All Zones</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.zone_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-zinc-600">Supervisor</label>
              <select className="text-xs bg-white border border-zinc-200 rounded-md px-2 py-1 text-zinc-700" value={supervisorId} onChange={(e) => { setSupervisorId(e.target.value); if (e.target.value) setZoneId(''); }}>
                <option value="">All Supervisors</option>
                {supervisors.map(s => (
                  <option key={s.id} value={s.id}>{s.username}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="h-64 relative w-full">
          {chartLoading ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm">Loading payments...</div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm">No payments to display</div>
          ) : (
            <ChartComponent
              data={(chartData as any[]).map(d => ({ name: (d as any).month || (d as any).week || (d as any).year || (d as any).day, amount: Number((d as any).amount) || 0 }))}
              xKey="name"
              series={[{ key: 'amount', name: 'Amount' }]}
              height={260}
            />
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-4 sm:p-5">
        <h3 className="text-base font-semibold text-zinc-800 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { label: 'Add New Zone', to: '/add-zone', Icon: MapPinned, color: 'text-amber-600 bg-amber-50' },
            { label: 'Register Client', to: '/register-client', Icon: UsersIcon, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'View Reports', to: '/reports', Icon: BarChart3, color: 'text-neutral-700 bg-neutral-50' },
            { label: 'Manage Workers', to: '/manage-workers', Icon: UserCog, color: 'text-orange-600 bg-orange-50' },
          ].map(({ label, to, Icon, color }, index) => (
            <Link
              key={index}
              to={to}
              className="flex flex-col items-center justify-center p-3 bg-zinc-50 rounded-lg hover:bg-white border border-zinc-200 transition-all duration-200 group"
            >
              <span className={`mb-1.5 p-1.5 rounded-md ${color}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-medium text-zinc-700 text-center group-hover:text-amber-600">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;