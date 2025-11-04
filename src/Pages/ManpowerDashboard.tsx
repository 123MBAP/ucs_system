import { useEffect, useState } from 'react';
import { useI18n } from 'src/lib/i18n';
import { User, Truck, Wallet, BadgeCheck } from 'lucide-react';

const apiBase = import.meta.env.VITE_API_URL as string;

type Me = { id: number; username: string; role: string | null };

type ManpowerInfo = {
  name: string;
  salary: number | null;
  vehicle: { plate: string } | null;
  driver: { username: string } | null;
  supervisor: { username: string } | null;
};

const ManpowerDashboard = () => {
  const { t } = useI18n();
  const [, setMe] = useState<Me | null>(null);
  const [info, setInfo] = useState<ManpowerInfo>({ name: '', salary: null, vehicle: null, driver: null, supervisor: null });
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<Array<{
    id: number;
    service_day: number;
    service_start: string;
    service_end: string;
    supervisor_status: string | null;
    supervisor_reason?: string | null;
    vehicle_plate?: string | null;
    driver_username?: string | null;
    zone_name?: string | null;
    assigned_manpower_usernames?: string[] | null;
    supervisor_decided_at?: string | null;
  }>>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    fetch(`${apiBase}/api/manpower/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load dashboard');
        setMe(data.user);
        const fullName = [data?.user?.first_name, data?.user?.last_name].filter(Boolean).join(' ') || data?.user?.username || '';
        setInfo({
          name: fullName,
          salary: data?.salary ?? null,
          vehicle: data?.vehicle ?? null,
          driver: data?.driver ?? null,
          supervisor: data?.supervisor ?? null,
        });
      })
      .catch(err => console.error('Load manpower profile error:', err))
      .finally(() => setLoading(false));

    // Load personal schedule
    fetch(`${apiBase}/api/manpower/schedule`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load schedule');
        setSchedule(Array.isArray(data.schedule) ? data.schedule : []);
      })
      .catch(err => console.error('Load manpower schedule error:', err));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-zinc-800 to-indigo-600 bg-clip-text text-transparent">{t('manpower.title')}</h1>
          <p className="text-zinc-600 mt-2">{t('manpower.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0 text-sm text-zinc-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>{t('manpower.profileActive')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-600">{t('manpower.name')}</div>
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
              <div className="text-sm font-semibold text-zinc-600">{t('manpower.assignedVehicle')}</div>
              <div className="text-2xl font-bold text-zinc-900 mt-1">{loading ? '…' : (info.vehicle?.plate || t('manpower.notAssigned'))}</div>
              <div className="text-sm text-zinc-600 mt-2 flex items-center gap-1"><BadgeCheck className="w-4 h-4" /> {t('manpower.driver')}: {loading ? '…' : (info.driver?.username || '-')}</div>
              <div className="text-sm text-zinc-600 mt-1 flex items-center gap-1"><BadgeCheck className="w-4 h-4" /> {t('manpower.supervisor')}: {loading ? '…' : (info.supervisor?.username || '-')}</div>
            </div>
            <div className="shrink-0 p-2 rounded-lg bg-amber-50 text-amber-600">
              <Truck className="h-8 w-8" />
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-600">{t('manpower.salary')}</div>
              <div className="text-2xl font-bold text-zinc-900 mt-1">{loading ? '…' : (info.salary != null ? info.salary.toLocaleString() : 'Not set')}</div>
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
          <h2 className="text-xl font-bold text-zinc-800">{t('manpower.schedule.title')}</h2>
        </div>
        {schedule.length === 0 ? (
          <div className="text-zinc-600">{t('manpower.schedule.none')}</div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {schedule.map((e) => {
              const weekdayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
              const dayName = weekdayNames[(Number(e.service_day) || 1) - 1] || '';
              const status = e.supervisor_status;
              const badge = status == null
                ? { text: t('status.pending'), cls: 'bg-amber-50 text-amber-700 border-amber-200' }
                : status === 'complete'
                ? { text: t('status.completed'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                : { text: t('status.notCompleted'), cls: 'bg-red-50 text-red-700 border-red-200' };
              return (
                <div key={e.id} className="py-4 flex items-start justify-between">
                  <div>
                    <div className="text-zinc-900 font-semibold">{dayName}</div>
                    <div className="text-zinc-600 text-sm">{e.service_start?.slice(0,5)} - {e.service_end?.slice(0,5)}</div>
                    <div className="text-zinc-500 text-xs mt-1 space-y-0.5">
                      <div>
                        {e.zone_name ? `${t('manpower.zone')}: ${e.zone_name}` : ''}
                        {e.zone_name && (e.vehicle_plate || e.driver_username) ? ' • ' : ''}
                        {e.vehicle_plate ? `${t('manpower.vehicle')}: ${e.vehicle_plate}` : ''}
                        {e.vehicle_plate && e.driver_username ? ' • ' : ''}
                        {e.driver_username ? `${t('manpower.driver')}: ${e.driver_username}` : ''}
                      </div>
                      {!!(e.assigned_manpower_usernames && e.assigned_manpower_usernames.length) && (
                        <div>
                          {t('manpower.team')}: {e.assigned_manpower_usernames.join(', ')}
                        </div>
                      )}
                    </div>
                    {status === 'not_complete' && e.supervisor_reason && (
                      <div className="text-red-600 text-xs mt-1">{t('manpower.reason')}: {e.supervisor_reason}</div>
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

export default ManpowerDashboard;
