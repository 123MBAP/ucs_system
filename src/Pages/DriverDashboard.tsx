import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { User, Car, Wallet, CalendarClock } from 'lucide-react';

const apiBase = import.meta.env.VITE_API_URL as string;

type DriverInfo = {
  name: string;
  plateNumber: string | null;
  salary: number | null;
  zones: string[];
};

type DriverSchedule = {
  id: number;
  service_day: number;
  service_start: string;
  service_end: string;
  zone_name?: string | null;
  vehicle_plate?: string | null;
  assigned_manpower_usernames?: string[] | null;
  supervisor_status?: string | null;
  supervisor_reason?: string | null;
};

const DriverDashboard = () => {
  const { t } = useI18n();
  const [info, setInfo] = useState<DriverInfo>({ name: '', plateNumber: null, salary: null, zones: [] });
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<DriverSchedule[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    // Try driver dashboard endpoint first
    fetch(`${apiBase}/api/driver/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load driver dashboard');
        const fullName = [data?.user?.first_name, data?.user?.last_name].filter(Boolean).join(' ') || data?.user?.username || '';
        setInfo({
          name: fullName,
          plateNumber: data?.vehicle?.plate ?? null,
          salary: data?.salary ?? null,
          zones: Array.isArray(data?.zones) ? data.zones.map((z: any) => String(z?.name ?? z)).filter(Boolean) : [],
        });
      })
      .catch(async () => {
        // Fallback to /api/me if driver dashboard is not available
        try {
          const r = await fetch(`${apiBase}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await r.json();
          if (r.ok) {
            setInfo(prev => ({ ...prev, name: data?.user?.username || prev.name }));
          }
        } catch {}
      })
      .finally(() => setLoading(false));

    // Load driver schedule if available
    fetch(`${apiBase}/api/driver/schedule`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load schedule');
        const arr: DriverSchedule[] = Array.isArray(data?.schedule) ? data.schedule : [];
        setSchedule(arr);
        // Fallback: if vehicle not provided in dashboard, infer from schedule (most frequent plate)
        if (!info.plateNumber) {
          const counts = new Map<string, number>();
          for (const it of arr) {
            const p = it.vehicle_plate?.trim();
            if (p) counts.set(p, (counts.get(p) || 0) + 1);
          }
          if (counts.size) {
            let best: string | null = null;
            let bestCount = -1;
            counts.forEach((c, k) => { if (c > bestCount) { bestCount = c; best = k; } });
            if (best) {
              setInfo(prev => ({ ...prev, plateNumber: prev.plateNumber ?? best! }));
            }
          }
        }
      })
      .catch(() => setSchedule([]));
  }, []);

  const weekdayNames = useMemo(
    () => [
      t('weekday.mon'),
      t('weekday.tue'),
      t('weekday.wed'),
      t('weekday.thu'),
      t('weekday.fri'),
      t('weekday.sat'),
      t('weekday.sun'),
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-zinc-800 to-amber-600 bg-clip-text text-transparent">{t('driver.title')}</h1>
          <p className="text-zinc-600 mt-2">{t('driver.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0 text-sm text-zinc-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>{t('driver.profileActive')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-600">{t('driver.name')}</div>
              <div className="text-2xl font-bold text-zinc-900 mt-1">{loading ? '…' : info.name || '-'}</div>
            </div>
            <div className="shrink-0 p-2 rounded-lg bg-amber-50 text-amber-600">
              <User className="h-8 w-8" />
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-600">{t('driver.assignedCar')}</div>
              <div className="text-2xl font-bold text-zinc-900 mt-1">{loading ? '…' : (info.plateNumber ?? t('driver.notAssigned'))}</div>
            </div>
            <div className="shrink-0 p-2 rounded-lg bg-amber-50 text-amber-600">
              <Car className="h-8 w-8" />
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-600">{t('driver.salary')}</div>
              <div className="text-2xl font-bold text-zinc-900 mt-1">{loading ? '…' : (info.salary != null ? info.salary.toLocaleString() : t('common.notSet'))}</div>
            </div>
            <div className="shrink-0 p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Wallet className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      

      {/* Service Schedule */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <CalendarClock className="h-5 w-5 text-amber-600" />
          <h2 className="text-sm font-semibold text-zinc-700">{t('driver.schedule.title')}</h2>
        </div>
        {schedule.length === 0 ? (
          <div className="text-zinc-600">{t('driver.schedule.none')}</div>
        ) : (
          <div className="space-y-4">
            {schedule.map((e) => {
              const status = e.supervisor_status;
              const badge = status == null
                ? { text: t('status.pending'), cls: 'bg-amber-50 text-amber-700 border-amber-200' }
                : status === 'complete'
                ? { text: t('status.completed'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                : { text: t('status.notCompleted'), cls: 'bg-red-50 text-red-700 border-red-200' };
              const manpowerNames = (() => {
                const names = (e as any).assigned_manpower_names as string[] | undefined;
                const usernames = e.assigned_manpower_usernames ?? [];
                return (names && names.length ? names : usernames) || [];
              })();
              const weekday = weekdayNames[(Number(e.service_day) || 1) - 1] || '';
              return (
                <div key={e.id} className="rounded-xl border border-zinc-100 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-zinc-900 font-semibold">{weekday}</div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg border ${badge.cls}`}>{badge.text}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <div className="text-xs text-zinc-500">{t('driver.vehicle')}</div>
                      <div className="text-sm font-semibold text-zinc-800">{e.vehicle_plate || '-'}</div>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <div className="text-xs text-zinc-500">{t('common.serviceStart')}</div>
                      <div className="text-sm font-semibold text-zinc-800">{e.service_start?.slice(0,5) || '-'}</div>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <div className="text-xs text-zinc-500">{t('common.serviceEnd')}</div>
                      <div className="text-sm font-semibold text-zinc-800">{e.service_end?.slice(0,5) || '-'}</div>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <div className="text-xs text-zinc-500">{t('driver.zone')}</div>
                      <div className="text-sm font-semibold text-zinc-800">{e.zone_name || '-'}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-zinc-600 space-y-1">
                    {manpowerNames.length > 0 && (
                      <div>{t('driver.team')}: {manpowerNames.join(', ')}</div>
                    )}
                    {status === 'not_complete' && e.supervisor_reason && (
                      <div className="text-red-600">{e.supervisor_reason}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
