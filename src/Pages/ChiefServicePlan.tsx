import React from 'react';
import { useI18n } from '../lib/i18n';

const apiBase = import.meta.env.VITE_API_URL as string;

type Zone = { id: number; name: string };

type ManpowerUser = { id: number; username: string; phone?: string | null };

type ScheduleEntry = {
  id: number;
  zone_id: number;
  zone_name: string;
  supervisor_id: number;
  vehicle_id: number | null;
  vehicle_plate: string | null;
  driver_id: number | null;
  driver_username: string | null;
  driver_phone?: string | null;
  service_day: number; // 1..7
  service_start: string; // HH:MM:SS
  service_end: string; // HH:MM:SS
  created_at: string;
  assigned_manpower_users: ManpowerUser[];
  chief_report_status?: 'complete' | 'not_complete' | null;
  chief_report_reason?: string | null;
  chief_reported_at?: string | null;
  supervisor_status?: 'complete' | 'not_complete' | null;
  supervisor_reason?: string | null;
  supervisor_decided_at?: string | null;
};


export default function ChiefServicePlan() {
  const { t, lang, setLang } = useI18n();
  const [selectedZoneId, setSelectedZoneId] = React.useState<number | null>(null);
  const [selectedZoneName, setSelectedZoneName] = React.useState<string>('');
  const [schedule, setSchedule] = React.useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [year, setYear] = React.useState<number>(new Date().getFullYear());
  const [month, setMonth] = React.useState<number>(new Date().getMonth() + 1);
  const [completedLoading, setCompletedLoading] = React.useState(false);
  const [completedError, setCompletedError] = React.useState<string | null>(null);
  const [completed, setCompleted] = React.useState<any[]>([]);
  const [selectedCompletedId, setSelectedCompletedId] = React.useState<number | null>(null);
  const [reasonOpen, setReasonOpen] = React.useState(false);
  const [reasonText, setReasonText] = React.useState('');
  const [reasonSubmitting, setReasonSubmitting] = React.useState(false);
  const [reasonEntryId, setReasonEntryId] = React.useState<number | null>(null);
  const [reportingId, setReportingId] = React.useState<number | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        setError(null);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(`${apiBase}/api/chief/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to load zone');
        const data = await res.json();
        const z: Zone[] = (data?.zones || []).map((x: any) => ({ id: x.id, name: x.name }));
        if (!active) return;
        if (z.length) {
          setSelectedZoneId(z[0].id);
          setSelectedZoneName(z[0].name);
        } else {
          setSelectedZoneId(null);
          setSelectedZoneName('');
        }
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Failed to load');
      }
    })();
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!selectedZoneId) { setSchedule([]); return; }
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(`${apiBase}/api/chief/zones/${selectedZoneId}/service-plan`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load schedule');
        const data = await res.json();
        if (!active) return;
        setSchedule(data?.schedule || []);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Failed to load schedule');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [selectedZoneId]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        setCompletedError(null);
        setCompletedLoading(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');
        const params = new URLSearchParams({ year: String(year), month: String(month) });
        const res = await fetch(`${apiBase}/api/chief/completed-services?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to load completed services');
        const data = await res.json();
        if (!active) return;
        setCompleted(Array.isArray(data?.services) ? data.services : []);
      } catch (e: any) {
        if (!active) return;
        setCompletedError(e?.message || 'Failed to load');
      } finally {
        if (active) setCompletedLoading(false);
      }
    })();
    return () => { active = false; };
  }, [year, month]);

  async function reportService(entryId: number, status: 'complete' | 'not_complete', reason?: string | null) {
    try {
      setReportingId(entryId);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${apiBase}/api/chief/service/${entryId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ status, reason: reason ?? null }),
      });
      if (!res.ok) throw new Error('Failed to submit report');
      
      if (selectedZoneId) {
        setLoading(true);
        try {
          const r2 = await fetch(`${apiBase}/api/chief/zones/${selectedZoneId}/service-plan`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const d2 = await r2.json();
          setSchedule(d2?.schedule || []);
        } finally {
          setLoading(false);
        }
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setReportingId(null);
    }
  }

  function openReason(entryId: number) {
    setReasonEntryId(entryId);
    setReasonText('');
    setReasonOpen(true);
  }

  async function submitReason() {
    if (!reasonEntryId) return;
    try {
      setReasonSubmitting(true);
      await reportService(reasonEntryId, 'not_complete', reasonText.trim() || null);
      setReasonOpen(false);
      setReasonText('');
      setReasonEntryId(null);
    } finally {
      setReasonSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('chiefPlan.title')}</h2>
          {selectedZoneName && (
            <div className="text-sm text-slate-600">{t('chiefPlan.zoneLabel')} <span className="font-medium text-slate-800">{selectedZoneName}</span></div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">{t('common.language')}</label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as any)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
          >
            <option value="en">{t('lang.english')}</option>
            <option value="rw">{t('lang.kinyarwanda')}</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <div className="lg:col-span-2 space-y-4">
        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">{t('chiefPlan.loading')}</div>
        ) : schedule.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">{t('chiefPlan.noEntries')}</div>
        ) : (
          <div className="space-y-4">
            {schedule.filter((row) => !row.supervisor_status).map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">{t('chiefPlan.createdAt')} {new Date(row.created_at).toLocaleString()}</div>

                <div className="mt-2 space-y-1 text-sm">
                  <div><span className="font-medium">{t('chiefPlan.vehicle')}</span> {row.vehicle_plate ?? t('chiefPlan.none')}</div>
                  <div><span className="font-medium">{t('chiefPlan.driver')}</span> {row.driver_username ? `${row.driver_username}${row.driver_phone ? ` (${row.driver_phone})` : ''}` : t('chiefPlan.none')}</div>
                </div>

                <div className="mt-3">
                  <div className="font-medium text-sm">{t('chiefPlan.assignedManpowers')}</div>
                  {Array.isArray(row.assigned_manpower_users) && row.assigned_manpower_users.length ? (
                    <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                      {row.assigned_manpower_users.map((m) => (
                        <li key={m.id}>{m.username}{m.phone ? ` (${m.phone})` : ''}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-1 text-sm text-slate-500">{t('chiefPlan.none')}</div>
                  )}
                </div>

                <div className="mt-3 space-y-1 text-sm">
                  <div>{t('chiefPlan.serviceStart')} {row.service_start?.slice(0, 5)}</div>
                  <div>{t('chiefPlan.serviceEnd')} {row.service_end?.slice(0, 5)}</div>
                </div>

                {row.chief_report_status ? (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 border border-amber-200">
                    <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                    {t('chiefPlan.report.waiting')}
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => reportService(row.id, 'complete')}
                      disabled={reportingId === row.id}
                      className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {t('chiefPlan.report.complete')}
                    </button>
                    <button
                      onClick={() => openReason(row.id)}
                      disabled={reportingId === row.id}
                      className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-white text-sm hover:bg-red-700 disabled:opacity-60"
                    >
                      {t('chiefPlan.report.notComplete')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">{t('chiefPlan.completedServices')}</h3>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const m = i + 1;
                return <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>;
              })}
            </select>
          </div>

          {completedError && (
            <div className="mt-2 text-xs text-red-600">{completedError}</div>
          )}

          <div className="mt-3 space-y-2">
            {completedLoading ? (
              <div className="text-sm text-slate-500">{t('chiefPlan.completed.loading')}</div>
            ) : completed.length === 0 ? (
              <div className="text-sm text-slate-500">{t('chiefPlan.completed.none')}</div>
            ) : (
              completed.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCompletedId((prev) => prev === c.id ? null : c.id)}
                  className="w-full text-left rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
                >
                  <div className="text-sm font-medium text-slate-800">{c.vehicle_plate ?? '—'} • {c.driver_username ?? '—'}</div>
                  <div className="text-xs text-slate-500">{new Date(c.supervisor_decided_at || c.created_at).toLocaleString()}</div>
                  {selectedCompletedId === c.id && (
                    <div className="mt-2 text-xs text-slate-700 space-y-2">
                      <div>{t('chiefPlan.details.startEnd', { start: String(c.service_start).slice(0,5), end: String(c.service_end).slice(0,5) })}</div>
                      <div>
                        <span className="font-semibold">{t('chiefPlan.vehicle')} </span>
                        <span>{c.vehicle_plate ?? t('chiefPlan.none')}</span>
                      </div>
                      <div>
                        <span className="font-semibold">{t('chiefPlan.driver')} </span>
                        <span>{c.driver_username ? `${c.driver_username}${c.driver_phone ? ` (${c.driver_phone})` : ''}` : t('chiefPlan.none')}</span>
                      </div>
                      <div>
                        <div className="font-semibold mb-0.5">{t('chiefPlan.assignedManpowers')}</div>
                        {Array.isArray(c.assigned_manpower_users) && c.assigned_manpower_users.length ? (
                          <ul className="list-disc pl-5 space-y-0.5">
                            {c.assigned_manpower_users.map((m: any) => (
                              <li key={m.id}>{m.username}{m.phone ? ` (${m.phone})` : ''}</li>
                            ))}
                          </ul>
                        ) : (
                          <div>{t('chiefPlan.none')}</div>
                        )}
                      </div>
                      {c.supervisor_reason ? <div>{t('chiefPlan.details.supervisorNote', { note: c.supervisor_reason })}</div> : null}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
      {reasonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => (!reasonSubmitting ? setReasonOpen(false) : null)} />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
            <div className="text-base font-semibold text-slate-800">{t('chiefPlan.modal.title')}</div>
            <div className="mt-2 text-sm text-slate-600">{t('chiefPlan.modal.subtitle')}</div>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              className="mt-3 h-28 w-full resize-none rounded-md border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              placeholder={t('chiefPlan.modal.placeholder')}
              disabled={reasonSubmitting}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => (!reasonSubmitting ? setReasonOpen(false) : null)}
                className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                disabled={reasonSubmitting}
              >
                {t('chiefPlan.cancel')}
              </button>
              <button
                onClick={submitReason}
                className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-white text-sm hover:bg-red-700 disabled:opacity-60"
                disabled={reasonSubmitting}
              >
                {t('chiefPlan.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
