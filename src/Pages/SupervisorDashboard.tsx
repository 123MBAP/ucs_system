import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ChartComponent from 'src/Components/ChartComponent';
import { useI18n } from 'src/lib/i18n';
import LoadingSpinner from 'src/Components/LoadingSpinner';

const apiBase = import.meta.env.VITE_API_URL as string;

type Zone = {
  id: number;
  zone_name: string;
  chief_username: string | null;
  client_count: number;
};

// Icons (same as before)
const Icons = {
  Zone: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.447-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  Chief: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Clients: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Arrow: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  TrendUp: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
};

const SupervisorDashboard = () => {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Payments chart state (always show monthly)
  const [chartData, setChartData] = useState<{ amount: number }[]>([] as any);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [rawPayments, setRawPayments] = useState<any[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [series, setSeries] = useState<{
    yearly: { year: string; amount: number }[];
    monthly: { month: string; amount: number }[];
    weekly: { week: string; amount: number }[];
    daily: { day: string; amount: number }[];
  }>({ yearly: [], monthly: [], weekly: [], daily: [] });

  // Reports-like chart filters
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(0); // 0 = All months
  const [chartZoneId, setChartZoneId] = useState<string>('');

  // Zones display controls
  const [onlyWithChief, setOnlyWithChief] = useState(false);
  const zonesGridRef = useRef<HTMLDivElement | null>(null);

  const [vehicles, setVehicles] = useState<{ id: number; plate: string; image_url?: string | null; driver_username?: string | null }[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [vehViewerOpen, setVehViewerOpen] = useState(false);
  const [vehViewerSrc, setVehViewerSrc] = useState<string>('');

  const [totalsLoading, setTotalsLoading] = useState(false);
  const [totalsError, setTotalsError] = useState<string | null>(null);
  const [totals, setTotals] = useState<{ due_total: number; paid_total: number; remaining_total: number; year?: number; month?: number } | null>(null);
  // Today's paid across supervisor zones
  const [todayPaid, setTodayPaid] = useState(0);
  const [todayLoading, setTodayLoading] = useState(false);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [pwReqs, setPwReqs] = useState<{ id: number; userId: number; username: string; emailHint: string | null; role: string; createdAt: string }[]>([]);
  const [pwBusyId, setPwBusyId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login', { replace: true }); return; }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/supervisor/zones`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load zones');
        setZones(Array.isArray(data.zones) ? data.zones : []);
      })
      .catch((e: any) => setError(e?.message || 'Failed to load zones'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setTotalsLoading(true);
    setTotalsError(null);
    fetch(`${apiBase}/api/supervisor/payment-totals`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load totals');
        setTotals({
          due_total: Number(data?.due_total || 0),
          paid_total: Number(data?.paid_total || 0),
          remaining_total: Number(data?.remaining_total || 0),
          year: data?.year,
          month: data?.month,
        });
      })
      .catch((e: any) => setTotalsError(e?.message || 'Failed to load totals'))
      .finally(() => setTotalsLoading(false));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setVehiclesLoading(true);
    setVehiclesError(null);
    fetch(`${apiBase}/api/supervisor/vehicles`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load vehicles');
        setVehicles(Array.isArray(data.vehicles) ? data.vehicles : []);
      })
      .catch((e: any) => setVehiclesError(e?.message || 'Failed to load vehicles'))
      .finally(() => setVehiclesLoading(false));
  }, []);

  // Helper: is a timestamp today in local time
  const isTodayLocal = (iso?: string | null) => {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  // Compute today's paid across the supervisor's zones using local filtering (avoids server TZ issues)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!zones.length) return; // wait until zones are loaded
    const zoneIds = new Set(zones.map(z => z.id));
    setTodayLoading(true);
    setTodayError(null);
    fetch(`${apiBase}/api/payments/statements`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load payments');
        const rows = Array.isArray(data?.payments) ? data.payments : [];
        const sum = rows
          .filter((p: any) => !p?.status || String(p.status).toLowerCase().startsWith('success'))
          .filter((p: any) => zoneIds.has(Number(p?.zone_id)))
          .filter((p: any) => isTodayLocal(p?.completed_at || p?.created_at || p?.updated_at || p?.inserted_at))
          .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
        setTodayPaid(sum);
      })
      .catch((e: any) => setTodayError(e?.message || t('supervisor.error.generic')))
      .finally(() => setTodayLoading(false));
  }, [zones]);

  const nf = useMemo(() => new Intl.NumberFormat(lang === 'rw' ? undefined : undefined, { maximumFractionDigits: 0 }), [lang]);

  // Build last N month labels
  function buildLastMonths(n = 6) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const arr: { key: string; label: string }[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      arr.push({ key, label: months[d.getMonth()] });
    }
    return arr;
  }

  function aggregatePayments(payments: any[]) {
    const monthsMeta = buildLastMonths(6);
    const monthlyMap = new Map(monthsMeta.map(m => [m.key, 0] as [string, number]));
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const weekly = [0,0,0,0];
    const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - (4 - i)));
    const yearlyMap = new Map(years.map(y => [y, 0] as [string, number]));
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
    const yearly = years.map(y => ({ year: y, amount: yearlyMap.get(y) || 0 }));
    const monthly = monthsMeta.map(m => ({ month: m.label, amount: monthlyMap.get(m.key) || 0 }));
    const weeklySeries = [
      { week: 'Week 1', amount: weekly[0] },
      { week: 'Week 2', amount: weekly[1] },
      { week: 'Week 3', amount: weekly[2] },
      { week: 'Week 4', amount: weekly[3] },
    ];
    const daily = dayKeys.map((k, idx) => ({ day: dayLabels[idx], amount: dailyMap.get(k) || 0 }));
    return { yearly, monthly, weekly: weeklySeries, daily };
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setChartLoading(true);
        const token = localStorage.getItem('token');
        if (!token) { if (!cancelled) { setSeries({ yearly: [], monthly: [], weekly: [], daily: [] }); setRawPayments([]); } return; }
        setChartError(null);
        const res = await fetch(`${apiBase}/api/payments/completed`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const rows = Array.isArray(data?.payments) ? data.payments : [];
        if (!cancelled) setRawPayments(rows);
      } catch (e: any) {
        if (!cancelled) { setChartError(e?.message || t('supervisor.error.generic')); setRawPayments([]); setSeries({ yearly: [], monthly: [], weekly: [], daily: [] }); }
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [reloadKey]);

  // Apply filters to payments and compute series
  const filteredPayments = useMemo(() => {
    const inSameYearMonth = (iso?: string | null) => {
      if (!iso) return false;
      const d = new Date(iso);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      if (y !== year) return false;
      if (month && m !== month) return false;
      return true;
    };
    return rawPayments.filter((p: any) => {
      if (chartZoneId && String(p?.zone_id ?? '') !== String(chartZoneId)) return false;
      if (!inSameYearMonth(p?.completed_at || p?.created_at || p?.updated_at || p?.inserted_at)) return false;
      return true;
    });
  }, [rawPayments, chartZoneId, year, month]);

  useEffect(() => {
    const s = aggregatePayments(filteredPayments);
    setSeries(s);
  }, [filteredPayments]);

  useEffect(() => {
    setChartData(series.monthly || []);
  }, [series]);

  const totalClients = zones.reduce((sum, zone) => sum + zone.client_count, 0);
  const zonesWithChief = zones.filter(z => z.chief_username).length;
  const avgClientsPerZone = zones.length > 0 ? Math.round(totalClients / zones.length) : 0;

  return (
    <div className="space-y-8 overflow-x-hidden">
      {pwReqs.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-stone-800">Password Reset Requests</h2>
            <button
              className="text-sm text-amber-700 underline"
              onClick={async () => {
                const token = localStorage.getItem('token');
                if (!token) return;
                try {
                  const r = await fetch(`${apiBase}/api/password/supervisor/requests`, { headers: { Authorization: `Bearer ${token}` } });
                  const j = await r.json();
                  if (!r.ok) throw new Error(j?.error || 'Failed');
                  setPwReqs(Array.isArray(j?.requests) ? j.requests : []);
                } catch {}
              }}
            >
              {t('common.refresh')}
            </button>
          </div>
          <div className="space-y-2">
            {pwReqs.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-100 bg-amber-50/40">
                <div>
                  <div className="text-sm font-medium text-stone-900">{r.username} <span className="text-xs text-stone-500">({r.role})</span></div>
                  {r.emailHint && <div className="text-xs text-stone-600">Email: {r.emailHint}</div>}
                  <div className="text-xs text-stone-500">Requested at: {new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <button
                  disabled={pwBusyId === r.id}
                  onClick={async () => {
                    const token = localStorage.getItem('token');
                    if (!token) return;
                    setPwBusyId(r.id);
                    try {
                      const resp = await fetch(`${apiBase}/api/password/supervisor/requests/${r.id}/reset`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                      const d = await resp.json();
                      if (!resp.ok) throw new Error(d?.error || 'Failed');
                      setPwReqs(prev => prev.filter(x => x.id !== r.id));
                    } catch (e: any) {
                      alert(e?.message || 'Failed to reset');
                    } finally {
                      setPwBusyId(null);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-md text-white text-sm ${pwBusyId === r.id ? 'bg-gray-400' : 'bg-neutral-900 hover:bg-neutral-800'}`}
                >
                  {pwBusyId === r.id ? 'Resetting...' : 'Reset to 123'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-stone-800 to-amber-600 bg-clip-text text-transparent truncate">
            {t('supervisor.title')}
          </h1>
          <p className="text-stone-600 mt-2 truncate">{t('supervisor.subtitle')}</p>
        </div>

        <div className="flex items-center space-x-4 mt-4 sm:mt-0 min-w-0">
          <div className="flex items-center space-x-2 text-sm text-stone-500">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="truncate">{t('supervisor.systemsOk')}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Amount Due */}
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-600 mb-2">{t('supervisor.cards.amountDueTitle')}</p>
              <p className="text-3xl font-bold text-stone-900">{totalsLoading ? '...' : nf.format(Number(totals?.due_total || 0))}</p>
              <p className="text-sm text-stone-500 mt-1">{t('supervisor.cards.amountDueCaption')}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-stone-700 to-stone-500 shadow-lg">
              <Icons.TrendUp />
            </div>
          </div>
          {totalsError && (<div className="text-xs text-red-600 mt-2 truncate">{totalsError}</div>)}
        </div>

        {/* Amount Paid This Month */}
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-600 mb-2">{t('supervisor.cards.amountPaidTitle')}</p>
              <p className="text-3xl font-bold text-stone-900">{totalsLoading ? '...' : nf.format(Number(totals?.paid_total || 0))}</p>
              <p className="text-sm text-stone-500 mt-1">{t('supervisor.cards.amountPaidCaption')}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-600 to-green-500 shadow-lg">
              <Icons.TrendUp />
            </div>
          </div>
          {totalsError && (<div className="text-xs text-red-600 mt-2 truncate">{totalsError}</div>)}
        </div>

        {/* Remaining Amount */}
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-600 mb-2">{t('supervisor.cards.remainingTitle')}</p>
              <p className="text-3xl font-bold text-stone-900">{totalsLoading ? '...' : nf.format(Number(totals?.remaining_total || 0))}</p>
              <p className="text-sm text-stone-500 mt-1">{t('supervisor.cards.remainingCaption')}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-600 to-orange-500 shadow-lg">
              <Icons.TrendUp />
            </div>
          </div>
          {totalsError && (<div className="text-xs text-red-600 mt-2 truncate">{totalsError}</div>)}
        </div>

        {/* Today's Paid */}
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-600 mb-2">{t('supervisor.cards.todayPaidTitle')}</p>
              <p className="text-3xl font-bold text-stone-900">{todayLoading ? '...' : nf.format(todayPaid)}</p>
              <p className="text-sm text-stone-500 mt-1">{t('supervisor.cards.todayPaidCaption')}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-700 to-green-600 shadow-lg">
              <Icons.TrendUp />
            </div>
          </div>
          {todayError && (<div className="text-xs text-red-600 mt-2 truncate">{todayError}</div>)}
        </div>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Zones */}
        <div onClick={() => zonesGridRef.current?.scrollIntoView({ behavior: 'smooth' })} className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-600 mb-2">{t('supervisor.stats.totalZones')}</p>
              <p className="text-3xl font-bold text-stone-900">{loading ? '...' : nf.format(zones.length)}</p>
              <p className="text-sm text-stone-500 mt-1">{t('supervisor.stats.assignedToYou')}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-600 to-orange-500 shadow-lg">
              <Icons.Zone />
            </div>
          </div>
        </div>

        {/* Active Chiefs */}
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-600 mb-2">{t('supervisor.stats.activeChiefs')}</p>
              <p className="text-3xl font-bold text-stone-900">{loading ? '...' : nf.format(zonesWithChief)}</p>
              <div className="flex items-center mt-1">
                <div className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                  <Icons.TrendUp />
                  <span className="ml-1">{t('supervisor.stats.active')}</span>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-600 to-green-500 shadow-lg">
              <Icons.Chief />
            </div>
          </div>
        </div>

        {/* Total Clients */}
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-600 mb-2">{t('supervisor.stats.totalClients')}</p>
              <p className="text-3xl font-bold text-stone-900">{loading ? '...' : nf.format(totalClients)}</p>
              <p className="text-sm text-stone-500 mt-1">{t('supervisor.stats.acrossZones')}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-lime-600 to-green-500 shadow-lg">
              <Icons.Clients />
            </div>
          </div>
        </div>

        {/* Avg Clients per Zone */}
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-600 mb-2">{t('supervisor.stats.avgPerZone')}</p>
              <p className="text-3xl font-bold text-stone-900">{loading ? '...' : nf.format(avgClientsPerZone)}</p>
              <p className="text-sm text-stone-500 mt-1">{t('supervisor.stats.clientsPerZone')}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 shadow-lg">
              <Icons.Clients />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Trends */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6 overflow-x-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 min-w-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-stone-800">{t('supervisor.trends.title')}</h2>
            <p className="text-xs text-stone-500 mt-1">{t('supervisor.trends.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 md:mt-0 items-end">
            <div>
              <label className="block text-[11px] text-stone-600">{t('reports.filters.year')}</label>
              <select className="px-2 py-1.5 rounded-md text-xs bg-stone-100 text-stone-700" value={year} onChange={e => setYear(Number(e.target.value))}>
                {Array.from({ length: 6 }).map((_, i) => {
                  const y = new Date().getFullYear() - i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-stone-600">{t('reports.filters.month')}</label>
              <select className="px-2 py-1.5 rounded-md text-xs bg-stone-100 text-stone-700" value={month} onChange={e => setMonth(Number(e.target.value))}>
                <option value={0}>{t('reports.filters.all')}</option>
                {Array.from({ length: 12 }).map((_, i) => {
                  const m = i + 1;
                  const d = new Date(2000, i, 1);
                  const name = d.toLocaleString(undefined, { month: 'long' });
                  return <option key={m} value={m}>{name}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-stone-600">{t('reports.filters.zone')}</label>
              <select className="px-2 py-1.5 rounded-md text-xs bg-stone-100 text-stone-700" value={chartZoneId} onChange={e => setChartZoneId(e.target.value)}>
                <option value="">{t('supervisor.filters.allZones')}</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.zone_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="h-64 relative min-w-[480px] md:min-w-0">
          {chartLoading ? (
            <div className="h-full flex items-center justify-center text-stone-500 text-sm"><LoadingSpinner /></div>
          ) : chartError ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-600 text-sm gap-2">
              <div>{chartError}</div>
              <button onClick={() => setReloadKey(v => v + 1)} className="px-3 py-1.5 rounded-md bg-amber-600 text-white">{t('supervisor.retry')}</button>
            </div>
          ) : (
            <ChartComponent
              data={(chartData as any[]).map(d => ({ name: ('year' in d ? d.year : 'month' in d ? d.month : 'week' in d ? d.week : d.day), amount: Number(d.amount) || 0 }))}
              xKey="name"
              series={[{ key: 'amount', name: t('supervisor.trends.amount') }]}
              height={260}
            />
          )}
        </div>
      </div>

      {/* Zones Grid */}
      <div ref={zonesGridRef} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 min-w-0">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-stone-800">{t('supervisor.yourZones.title')}</h2>
            <p className="text-stone-600 mt-1 truncate">{t('supervisor.yourZones.subtitle')}</p>
          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <label className="inline-flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" className="rounded" checked={onlyWithChief} onChange={e => setOnlyWithChief(e.target.checked)} />
              {t('supervisor.filters.onlyWithChief')}
            </label>
            <span className="text-sm text-stone-500">
              {t('supervisor.yourZones.assignedCount', { count: zones.length })}
            </span>
            <button onClick={() => zonesGridRef.current?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 rounded-md bg-stone-100 text-stone-700 hover:bg-stone-200 text-sm">{t('supervisor.quick.viewZones')}</button>
          </div>
        </div>


        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-2 text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Zones List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-stone-100 rounded-xl p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-stone-300 rounded w-20"></div>
                    <div className="h-6 bg-stone-300 rounded w-32"></div>
                  </div>
                  <div className="w-12 h-12 bg-stone-300 rounded-xl"></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-stone-300 rounded w-16"></div>
                    <div className="h-4 bg-stone-300 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-10 bg-stone-300 rounded-lg mt-4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zones.filter(z => !onlyWithChief || !!z.chief_username).map(zone => (
              <div key={zone.id} className="group bg-white rounded-xl border border-amber-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="flex items-center justify-between mb-4 min-w-0">
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">{t('supervisor.zone')}</span>
                    <h3 className="text-xl font-bold text-stone-800 break-words truncate">{zone.zone_name}</h3>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl flex items-center justify-center shadow-lg">
                    <Icons.Zone />
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center space-x-2 text-stone-600">
                      <Icons.Chief />
                      <span className="font-medium">{t('supervisor.zoneChief')}</span>
                    </div>
                    <span className={`font-semibold ${zone.chief_username ? 'text-stone-800' : 'text-amber-600'} truncate`}>
                      {zone.chief_username || t('supervisor.unassigned')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-stone-600">
                      <Icons.Clients />
                      <span className="font-medium">{t('supervisor.activeClients')}</span>
                    </div>
                    <span className="text-lg font-bold text-stone-800">{nf.format(zone.client_count)}</span>
                  </div>
                </div>

                <Link
                  to={`/supervisor/zones/${zone.id}/supervision`}
                  className="flex items-center justify-center space-x-2 w-full py-3 bg-stone-50 hover:bg-amber-50 text-stone-700 hover:text-amber-700 rounded-xl font-semibold transition-all duration-200 border border-stone-200 hover:border-amber-200 group-hover:shadow-md"
                >
                  <span>{t('supervisor.manageZone')}</span>
                  <Icons.Arrow />
                </Link>
              </div>
            ))}

            {!zones.filter(z => !onlyWithChief || !!z.chief_username).length && !loading && (
              <div className="col-span-full text-center py-12">
                <div className="w-20 h-20 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icons.Zone />
                </div>
                <h3 className="text-xl font-semibold text-stone-700 mb-2">{t('supervisor.noZones.title')}</h3>
                <p className="text-stone-500 max-w-md mx-auto">{t('supervisor.noZones.desc')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assigned Vehicles (moved below zones) */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-stone-800">{t('supervisor.vehicles.assignedTitle')}</h2>
          <span className="text-sm text-stone-500">{t('supervisor.vehicles.total', { count: vehicles.length })}</span>
        </div>
        {vehiclesError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">{vehiclesError}</div>
        )}
        {vehiclesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-amber-100 rounded-xl p-4 animate-pulse">
                <div className="h-5 bg-stone-200 rounded w-32 mb-3"></div>
                <div className="h-4 bg-stone-200 rounded w-40 mb-3"></div>
                <div className="h-32 bg-stone-100 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => { if (v.image_url) { setVehViewerSrc(v.image_url); setVehViewerOpen(true); } }}
                className="text-left border border-amber-100 rounded-xl p-4 hover:shadow-md transition-shadow bg-white"
                title={v.image_url ? t('supervisor.vehicles.viewImage') : t('supervisor.vehicles.noImage')}
              >
                <div className="font-semibold text-stone-800">{v.plate}</div>
                <div className="text-sm text-stone-500">{v.driver_username || t('supervisor.vehicles.unassignedDriver')}</div>
                <div className="mt-2 h-36 rounded overflow-hidden bg-stone-50 flex items-center justify-center">
                  {v.image_url ? (
                    <img src={v.image_url} alt={v.plate} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-stone-400 text-sm">{t('supervisor.vehicles.noImage')}</span>
                  )}
                </div>
              </button>
            ))}
            {!vehicles.length && (
              <div className="col-span-full text-center py-8 text-stone-500">{t('supervisor.vehicles.noneAssigned')}</div>
            )}
          </div>
        )}
      </div>

      {vehViewerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setVehViewerOpen(false)}>
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={vehViewerSrc} alt="Vehicle" className="w-full h-auto rounded-lg shadow-lg" />
            <button
              type="button"
              onClick={() => setVehViewerOpen(false)}
              className="absolute top-2 right-2 inline-flex items-center justify-center rounded-full bg-black/60 text-white w-9 h-9 hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-amber-500"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorDashboard;
