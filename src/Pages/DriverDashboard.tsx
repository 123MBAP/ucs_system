import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { User, Car, Wallet, MapPinned, CalendarClock } from 'lucide-react';

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
      })
      .catch(() => setSchedule([]));
  }, []);

  const weekdayNames = useMemo(() => ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-zinc-800 to-indigo-600 bg-clip-text text-transparent">{t('driver.title')}</h1>
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
            <div className="shrink-0 p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <User className="h-8 w-8" />
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-600">{t('driver.assignedCar')}</div>
              <div className="text-2xl font-bold text-zinc-900 mt-1">{loading ? '…' : info.plateNumber ?? 'Not assigned'}</div>
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
              <div className="text-2xl font-bold text-zinc-900 mt-1">{loading ? '…' : (info.salary != null ? info.salary.toLocaleString() : 'Not set')}</div>
            </div>
            <div className="shrink-0 p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Wallet className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <MapPinned className="h-5 w-5 text-indigo-600" />
            <div className="text-sm font-semibold text-zinc-700">{t('driver.assignedZones')}</div>
          </div>
        </div>
        {loading ? '…' : (
          info.zones.length ? (
            <ul className="list-disc pl-6 text-zinc-800">
              {info.zones.map((z, i) => (<li key={i}>{z}</li>))}
            </ul>
          ) : (
            <div className="text-zinc-600">{t('driver.none')}</div>
          )
        )}
      </div>

      {/* Service Schedule */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <CalendarClock className="h-5 w-5 text-indigo-600" />
          <h2 className="text-sm font-semibold text-zinc-700">{t('driver.schedule.title')}</h2>
        </div>
        {schedule.length === 0 ? (
          <div className="text-zinc-600">{t('driver.schedule.none')}</div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {schedule.map((e) => {
              const status = e.supervisor_status;
              const badge = status == null
                ? { text: t('status.pending'), cls: 'bg-amber-50 text-amber-700 border-amber-200' }
                : status === 'complete'
                ? { text: t('status.completed'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                : { text: t('status.notCompleted'), cls: 'bg-red-50 text-red-700 border-red-200' };
              return (
                <div key={e.id} className="py-4 flex items-start justify-between">
                  <div>
                    <div className="text-zinc-900 font-semibold">{weekdayNames[(Number(e.service_day) || 1) - 1] || ''}</div>
                    <div className="text-zinc-600 text-sm">{e.service_start?.slice(0,5)} - {e.service_end?.slice(0,5)}</div>
                    <div className="text-zinc-500 text-xs mt-1 space-y-0.5">
                      <div>
                        {e.zone_name ? `${t('driver.zone')}: ${e.zone_name}` : ''}
                        {e.zone_name && e.vehicle_plate ? ' • ' : ''}
                        {e.vehicle_plate ? `${t('driver.vehicle')}: ${e.vehicle_plate}` : ''}
                      </div>
                      {!!(e.assigned_manpower_usernames && e.assigned_manpower_usernames.length) && (
                        <div>
                          {t('driver.team')}: {e.assigned_manpower_usernames.join(', ')}
                        </div>
                      )}
                    </div>
                    {status === 'not_complete' && e.supervisor_reason && (
                      <div className="text-red-600 text-xs mt-1">{e.supervisor_reason}</div>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg border ${badge.cls}`}>{badge.text}</span>
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
