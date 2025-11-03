import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Payments chart state
  const [chartType, setChartType] = useState<'yearly' | 'monthly' | 'weekly' | 'daily'>('monthly');
  const [chartData, setChartData] = useState<{ amount: number }[]>([] as any);
  const [chartLoading, setChartLoading] = useState(false);
  const [series, setSeries] = useState<{
    yearly: { year: string; amount: number }[];
    monthly: { month: string; amount: number }[];
    weekly: { week: string; amount: number }[];
    daily: { day: string; amount: number }[];
  }>({ yearly: [], monthly: [], weekly: [], daily: [] });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
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
        if (!token) { setSeries({ yearly: [], monthly: [], weekly: [], daily: [] }); return; }
        const res = await fetch(`${apiBase}/api/payments/completed`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const rows = Array.isArray(data?.payments) ? data.payments : [];
        const s = aggregatePayments(rows);
        if (!cancelled) setSeries(s);
      } catch {
        if (!cancelled) setSeries({ yearly: [], monthly: [], weekly: [], daily: [] });
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const map: any = { yearly: series.yearly, monthly: series.monthly, weekly: series.weekly, daily: series.daily };
    setChartData(map[chartType] || []);
  }, [chartType, series]);

  const totalClients = zones.reduce((sum, zone) => sum + zone.client_count, 0);
  const zonesWithChief = zones.filter(z => z.chief_username).length;
  const avgClientsPerZone = zones.length > 0 ? Math.round(totalClients / zones.length) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-stone-800 to-amber-600 bg-clip-text text-transparent">
            Zone Supervision
          </h1>
          <p className="text-stone-600 mt-2">Manage your assigned zones and oversee operations</p>
        </div>

        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <div className="flex items-center space-x-2 text-sm text-stone-500">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>All Systems Operational</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Zones */}
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-600 mb-2">Total Zones</p>
              <p className="text-3xl font-bold text-stone-900">{loading ? '...' : zones.length}</p>
              <p className="text-sm text-stone-500 mt-1">Assigned to you</p>
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
              <p className="text-sm font-semibold text-stone-600 mb-2">Active Chiefs</p>
              <p className="text-3xl font-bold text-stone-900">{loading ? '...' : zonesWithChief}</p>
              <div className="flex items-center mt-1">
                <div className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                  <Icons.TrendUp />
                  <span className="ml-1">Active</span>
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
              <p className="text-sm font-semibold text-stone-600 mb-2">Total Clients</p>
              <p className="text-3xl font-bold text-stone-900">{loading ? '...' : totalClients.toLocaleString()}</p>
              <p className="text-sm text-stone-500 mt-1">Across all zones</p>
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
              <p className="text-sm font-semibold text-stone-600 mb-2">Avg per Zone</p>
              <p className="text-3xl font-bold text-stone-900">{loading ? '...' : avgClientsPerZone}</p>
              <p className="text-sm text-stone-500 mt-1">Clients per zone</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 shadow-lg">
              <Icons.Clients />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Trends */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-stone-800">Payment Trends</h2>
            <p className="text-xs text-stone-500 mt-1">Completed payments overview</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
            {(['yearly','monthly','weekly','daily'] as const).map(key => (
              <button
                key={key}
                onClick={() => setChartType(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  chartType === key ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {key === 'yearly' ? 'Year' : key === 'monthly' ? 'Monthly' : key === 'weekly' ? 'Weekly' : 'Daily'}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 relative">
          {chartLoading ? (
            <div className="h-full flex items-center justify-center text-stone-500 text-sm">Loading payments...</div>
          ) : (chartData as any[]).length === 0 ? (
            <div className="h-full flex items-center justify-center text-stone-500 text-sm">No payments to display</div>
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
                            <span className="text-[10px] text-stone-500 w-8 text-right pr-1">{t.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Plot area */}
                  <div className="flex-1 relative">
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
                                  ${Number(item.amount).toLocaleString()}
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
                          <div key={index} className="flex-1 text-center">
                            <p className="text-[11px] font-medium text-stone-600">
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
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-stone-800">Your Zones</h2>
            <p className="text-stone-600 mt-1">Manage and supervise your assigned zones</p>
          </div>
          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            <span className="text-sm text-stone-500">
              {zones.length} zone{zones.length !== 1 ? 's' : ''} assigned
            </span>
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
            {zones.map(zone => (
              <div key={zone.id} className="group bg-white rounded-xl border border-amber-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Zone</span>
                    <h3 className="text-xl font-bold text-stone-800">{zone.zone_name}</h3>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl flex items-center justify-center shadow-lg">
                    <Icons.Zone />
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-stone-600">
                      <Icons.Chief />
                      <span className="font-medium">Zone Chief</span>
                    </div>
                    <span className={`font-semibold ${zone.chief_username ? 'text-stone-800' : 'text-amber-600'}`}>
                      {zone.chief_username || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-stone-600">
                      <Icons.Clients />
                      <span className="font-medium">Active Clients</span>
                    </div>
                    <span className="text-lg font-bold text-stone-800">{zone.client_count}</span>
                  </div>
                </div>

                <Link
                  to={`/supervisor/zones/${zone.id}/supervision`}
                  className="flex items-center justify-center space-x-2 w-full py-3 bg-stone-50 hover:bg-amber-50 text-stone-700 hover:text-amber-700 rounded-xl font-semibold transition-all duration-200 border border-stone-200 hover:border-amber-200 group-hover:shadow-md"
                >
                  <span>Manage Zone</span>
                  <Icons.Arrow />
                </Link>
              </div>
            ))}

            {!zones.length && !loading && (
              <div className="col-span-full text-center py-12">
                <div className="w-20 h-20 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icons.Zone />
                </div>
                <h3 className="text-xl font-semibold text-stone-700 mb-2">No zones assigned</h3>
                <p className="text-stone-500 max-w-md mx-auto">
                  You haven't been assigned to any zones yet. Please contact your administrator to get started with zone supervision.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorDashboard;
