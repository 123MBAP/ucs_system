import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  // Payments chart state
  const [chartType, setChartType] = useState<'yearly' | 'monthly' | 'weekly' | 'daily'>('monthly');
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

  // Payment filters
  const [filterZoneId, setFilterZoneId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Zones display controls
  const [onlyWithChief, setOnlyWithChief] = useState(false);
  const zonesGridRef = useRef<HTMLDivElement | null>(null);

  const [vehicles, setVehicles] = useState<{ id: number; plate: string; image_url?: string | null; driver_username?: string | null }[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [vehViewerOpen, setVehViewerOpen] = useState(false);
  const [vehViewerSrc, setVehViewerSrc] = useState<string>('');

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
    return rawPayments.filter((p: any) => {
      if (filterZoneId && String(p?.zone_id ?? '') !== String(filterZoneId)) return false;
      const dateStr = p?.completed_at || p?.created_at || p?.updated_at || p?.inserted_at;
      if (startDate) {
        const s = new Date(startDate);
        const d = new Date(dateStr || 0);
        if (d < s) return false;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23,59,59,999);
        const d = new Date(dateStr || 0);
        if (d > e) return false;
      }
      return true;
    });
  }, [rawPayments, filterZoneId, startDate, endDate]);

  useEffect(() => {
    const s = aggregatePayments(filteredPayments);
    setSeries(s);
  }, [filteredPayments]);

  useEffect(() => {
    const map: any = { yearly: series.yearly, monthly: series.monthly, weekly: series.weekly, daily: series.daily };
    setChartData(map[chartType] || []);
  }, [chartType, series]);

  const totalClients = zones.reduce((sum, zone) => sum + zone.client_count, 0);
  const zonesWithChief = zones.filter(z => z.chief_username).length;
  const avgClientsPerZone = zones.length > 0 ? Math.round(totalClients / zones.length) : 0;

  return (
    <div className="space-y-8 overflow-x-hidden">
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
          <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
            {/* Filters: zone and date range */}
            <select className="px-2 py-1.5 rounded-md text-xs bg-stone-100 text-stone-700" value={filterZoneId} onChange={e => setFilterZoneId(e.target.value)}>
              <option value="">{t('supervisor.filters.allZones')}</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.zone_name}</option>
              ))}
            </select>
            <input type="date" className="px-2 py-1.5 rounded-md text-xs bg-stone-100 text-stone-700" value={startDate} onChange={e => setStartDate(e.target.value)} aria-label={t('supervisor.filters.startDate')} />
            <input type="date" className="px-2 py-1.5 rounded-md text-xs bg-stone-100 text-stone-700" value={endDate} onChange={e => setEndDate(e.target.value)} aria-label={t('supervisor.filters.endDate')} />
            {(['yearly','monthly','weekly','daily'] as const).map(key => (
              <button
                key={key}
                onClick={() => setChartType(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  chartType === key ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {key === 'yearly' ? t('supervisor.trends.year') : key === 'monthly' ? t('supervisor.trends.monthly') : key === 'weekly' ? t('supervisor.trends.weekly') : t('supervisor.trends.daily')}
              </button>
            ))}
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
          ) : (chartData as any[]).length === 0 ? (
            <div className="h-full flex items-center justify-center text-stone-500 text-sm">{t('supervisor.trends.empty')}</div>
          ) : (
            (() => {
              const amounts = (chartData as any[]).map((d: any) => Number(d.amount) || 0);
              const rawMax = Math.max(...amounts, 1);
              const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
              const niceMax = Math.ceil(rawMax / magnitude) * magnitude; // round up to 1, 2, 5, 10 * power of 10
              const steps = 6; // 6 horizontal lines (including bottom)
              const ticks = Array.from({ length: steps }, (_, i) => Math.round((niceMax / (steps - 1)) * i));

              return (
                <div className="h-full flex">
                  {/* Y Axis with ticks */}
                  <div className="w-10 relative">
                    {ticks.map((t, i) => {
                      const pct = 100 - (t / niceMax) * 100;
                      return (
                        <div key={i} className="absolute left-0 w-full" style={{ top: `${pct}%` }}>
                          <div className="-translate-y-1/2 flex items-center">
                            <span className="text-[10px] text-stone-500 w-8 text-right pr-1">{nf.format(t)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Plot area */}
                  <div className="flex-1 relative min-w-0">
                    {/* Gridlines */}
                    {ticks.map((t, i) => {
                      const pct = 100 - (t / niceMax) * 100;
                      return (
                        <div key={i} className="absolute left-0 right-0" style={{ top: `${pct}%` }}>
                          <div className={`h-px ${i === 0 ? 'bg-stone-300' : 'bg-stone-100'}`}></div>
                        </div>
                      );
                    })}

                    {/* Vertical Gridlines */}
                    <div className="absolute inset-x-0 bottom-6 top-2 pointer-events-none">
                      {(() => {
                        const count = (chartData as any[]).length || 1;
                        return Array.from({ length: count }, (_, i) => {
                          const leftPct = ((i + 0.5) / count) * 100; // center of each bar
                          return (
                            <div key={i} className="absolute top-0 bottom-0" style={{ left: `${leftPct}%` }}>
                              <div className="w-px h-full bg-stone-100 -translate-x-1/2" />
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Bars */}
                    <div className="absolute inset-x-0 bottom-6 top-2">
                      <div className="flex items-end justify-between h-full space-x-2">
                        {(chartData as any[]).map((item: any, index: number) => {
                          const height = Math.max(0, Math.min(100, (Number(item.amount) / niceMax) * 100));
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center group">
                              <div className="text-center mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div className="bg-stone-800 text-white text-xs px-2 py-1 rounded-md shadow">
                                  {nf.format(Number(item.amount))}
                                </div>
                              </div>
                              <div
                                className="w-full bg-gradient-to-t from-amber-500 to-yellow-500 rounded-md transition-all duration-300 hover:opacity-90 cursor-pointer"
                                style={{ height: `${height}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* X Axis labels */}
                    <div className="absolute left-0 right-0 bottom-0">
                      <div className="flex justify-between items-center">
                        {(chartData as any[]).map((item: any, index: number) => (
                          <div key={index} className="flex-1 text-center truncate">
                            <p className="text-[11px] font-medium text-stone-600 break-words">
                              {'year' in item ? item.year : 'month' in item ? item.month : 'week' in item ? item.week : item.day}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Zones Grid */}
      <div ref={zonesGridRef} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 min-w-0">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-stone-800">Your Zones</h2>
            <p className="text-stone-600 mt-1 truncate">Manage and supervise your assigned zones</p>
          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <label className="inline-flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" className="rounded" checked={onlyWithChief} onChange={e => setOnlyWithChief(e.target.checked)} />
              {t('supervisor.filters.onlyWithChief')}
            </label>
            <span className="text-sm text-stone-500">
              {nf.format(zones.length)} zone{zones.length !== 1 ? 's' : ''} assigned
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
          <h2 className="text-xl font-bold text-stone-800">Assigned Vehicles</h2>
          <span className="text-sm text-stone-500">{vehicles.length} total</span>
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
                title={v.image_url ? 'Click to view image' : 'No image available'}
              >
                <div className="font-semibold text-stone-800">{v.plate}</div>
                <div className="text-sm text-stone-500">{v.driver_username || 'Unassigned driver'}</div>
                <div className="mt-2 h-36 rounded overflow-hidden bg-stone-50 flex items-center justify-center">
                  {v.image_url ? (
                    <img src={v.image_url} alt={v.plate} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-stone-400 text-sm">No image</span>
                  )}
                </div>
              </button>
            ))}
            {!vehicles.length && (
              <div className="col-span-full text-center py-8 text-stone-500">No vehicles assigned</div>
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
