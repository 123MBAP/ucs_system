import React from 'react';

const apiBase = import.meta.env.VITE_API_URL as string;

type ScheduleEntry = {
  id: number;
  zone_id: number;
  supervisor_id: number;
  vehicle_id: number | null;
  vehicle_plate: string | null;
  driver_id: number | null;
  driver_username: string | null;
  service_day: number;
  service_start: string;
  service_end: string;
  created_at: string;
  zone_name?: string | null;
  chief_report_status?: 'complete' | 'not_complete' | null;
  chief_report_reason?: string | null;
  chief_reported_at?: string | null;
  supervisor_status?: 'complete' | 'not_complete' | null;
  supervisor_reason?: string | null;
  supervisor_decided_at?: string | null;
};

export default function SupervisorServices() {
  const [zones, setZones] = React.useState<Array<{id:number; name:string}>>([]);
  const [schedule, setSchedule] = React.useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [year, setYear] = React.useState<string>(String(new Date().getFullYear())); // default: current year; '' means All
  const [month, setMonth] = React.useState<string>(String(new Date().getMonth() + 1)); // default: current month; '' means All
  const [zoneFilter, setZoneFilter] = React.useState<string>(''); // '' means All
  const [completedLoading, setCompletedLoading] = React.useState(false);
  const [completedError, setCompletedError] = React.useState<string | null>(null);
  const [completed, setCompleted] = React.useState<any[]>([]);
  const [selectedCompletedId, setSelectedCompletedId] = React.useState<number | null>(null);

  const [verifyOpen, setVerifyOpen] = React.useState(false);
  const [verifyReason, setVerifyReason] = React.useState('');
  const [verifySubmitting, setVerifySubmitting] = React.useState(false);
  const [verifyEntryId, setVerifyEntryId] = React.useState<number | null>(null);
  const [verifyStatus, setVerifyStatus] = React.useState<'complete' | 'not_complete'>('complete');
  const [verifyingId, setVerifyingId] = React.useState<number | null>(null);

  // Centralized loaders
  async function loadUnconfirmed() {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${apiBase}/api/supervisor/schedule`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load schedule');
      const data = await res.json();
      setSchedule(Array.isArray(data?.schedule) ? data.schedule : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }

  async function loadCompleted() {
    try {
      setCompletedError(null);
      setCompletedLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const params = new URLSearchParams();
      if (zoneFilter) params.set('zone_id', zoneFilter);
      if (year) params.set('year', year);
      if (month) params.set('month', month);
      const res = await fetch(`${apiBase}/api/supervisor/completed-services?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load completed services');
      const data = await res.json();
      setCompleted(Array.isArray(data?.services) ? data.services : []);
    } catch (e: any) {
      setCompletedError(e?.message || 'Failed to load');
    } finally {
      setCompletedLoading(false);
    }
  }

  function refreshAll() {
    loadUnconfirmed();
    loadCompleted();
  }

  // Load unconfirmed on mount
  React.useEffect(() => {
    loadUnconfirmed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load supervisor completed services with filters
  React.useEffect(() => {
    loadCompleted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, zoneFilter]);

  // Load zones for filter
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(`${apiBase}/api/supervisor/zones`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to load zones');
        const data = await res.json();
        if (!active) return;
        const zs = (data?.zones || []).map((z: any) => ({ id: z.id, name: z.zone_name || z.name }));
        setZones(zs);
      } catch {
        /* ignore filter zones load errors */
      }
    })();
    return () => { active = false; };
  }, []);

  async function verifyCompleteImmediately(entryId: number) {
    try {
      setVerifyingId(entryId);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${apiBase}/api/supervisor/service/${entryId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'complete', reason: null }),
      });
      if (!res.ok) throw new Error('Failed to confirm');
      // Refresh both lists
      await Promise.all([loadUnconfirmed(), loadCompleted()]);
    } catch (e) {
      console.error(e);
    } finally {
      setVerifyingId(null);
    }
  }

  function openVerifyNotComplete(entryId: number) {
    setVerifyEntryId(entryId);
    setVerifyStatus('not_complete');
    setVerifyReason('');
    setVerifyOpen(true);
  }

  async function submitVerify() {
    if (!verifyEntryId) return;
    try {
      setVerifySubmitting(true);
      setVerifyingId(verifyEntryId);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${apiBase}/api/supervisor/service/${verifyEntryId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ status: verifyStatus, reason: verifyReason.trim() || null }),
      });
      if (!res.ok) throw new Error('Failed to submit verification');
      // Refresh both lists
      await Promise.all([loadUnconfirmed(), loadCompleted()]);
      setVerifyOpen(false);
      setVerifyEntryId(null);
      setVerifyReason('');
    } catch (e) {
      console.error(e);
    } finally {
      setVerifySubmitting(false);
      setVerifyingId(null);
    }
  }

  return (
    <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Services Supervision</h2>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-600">Unconfirmed services across your zones</div>
            <button
              onClick={refreshAll}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">Loading…</div>
        ) : schedule.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">No entries</div>
        ) : (
          <div className="space-y-4">
            {schedule.map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Created at: {new Date(row.created_at).toLocaleString()}</div>

                <div className="mt-2 space-y-1 text-sm">
                  <div><span className="font-medium">Vehicle:</span> {row.vehicle_plate ?? '—'}</div>
                  <div><span className="font-medium">Driver:</span> {row.driver_username ?? '—'}</div>
                </div>

                <div className="mt-3 space-y-1 text-sm">
                  <div>The service will start at: {row.service_start?.slice(0, 5)}</div>
                  <div>The service will end at: {row.service_end?.slice(0, 5)}</div>
                </div>

                {row.chief_report_status ? (
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => verifyCompleteImmediately(row.id)}
                      disabled={verifyingId === row.id}
                      className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Confirm completion
                    </button>
                    <button
                      onClick={() => openVerifyNotComplete(row.id)}
                      disabled={verifyingId === row.id}
                      className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-white text-sm hover:bg-red-700 disabled:opacity-60"
                    >
                      Mark not completed
                    </button>
                    {row.chief_report_reason ? (
                      <span className="ml-2 text-xs text-slate-500">Chief note: {row.chief_report_reason}</span>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700 border border-slate-200">
                    Waiting for chief report
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
            <h3 className="text-base font-semibold text-slate-800">Confirmed services</h3>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
            >
              <option value="">All zones</option>
              {zones.map(z => (
                <option key={z.id} value={String(z.id)}>{z.name}</option>
              ))}
            </select>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="">All years</option>
              {Array.from({ length: 7 }).map((_, i) => {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={String(y)}>{y}</option>;
              })}
            </select>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="">All months</option>
              {Array.from({ length: 12 }).map((_, i) => {
                const m = i + 1;
                return <option key={m} value={String(m)}>{m.toString().padStart(2, '0')}</option>;
              })}
            </select>
          </div>

          {completedError && (
            <div className="mt-2 text-xs text-red-600">{completedError}</div>
          )}

          <div className="mt-3 space-y-2">
            {completedLoading ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : completed.length === 0 ? (
              <div className="text-sm text-slate-500">No confirmed services</div>
            ) : (
              completed.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCompletedId((prev: number | null) => prev === c.id ? null : c.id)}
                  className="cursor-pointer w-full text-left rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
                >
                  <div className="text-sm font-medium text-slate-800">{c.vehicle_plate ?? '—'} • {c.driver_username ?? '—'}</div>
                  <div className="text-xs text-slate-500">{new Date(c.supervisor_decided_at || c.created_at).toLocaleString()}</div>
                  {selectedCompletedId === c.id && (
                    <div className="mt-2 text-xs text-slate-700 space-y-1">
                      <div>Start: {String(c.service_start).slice(0,5)} • End: {String(c.service_end).slice(0,5)}</div>
                      {c.supervisor_reason ? <div>Supervisor note: {c.supervisor_reason}</div> : null}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {verifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => (!verifySubmitting ? setVerifyOpen(false) : null)} />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
            <div className="text-base font-semibold text-slate-800">{verifyStatus === 'complete' ? 'Confirm completion' : 'Mark not completed'}</div>
            <div className="mt-2 text-sm text-slate-600">{verifyStatus === 'complete' ? 'Optional note' : 'Provide a reason (optional)'}</div>
            <textarea
              value={verifyReason}
              onChange={(e) => setVerifyReason(e.target.value)}
              className="mt-3 h-28 w-full resize-none rounded-md border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              placeholder={verifyStatus === 'complete' ? 'Note (optional)' : 'Reason (optional)'}
              disabled={verifySubmitting}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => (!verifySubmitting ? setVerifyOpen(false) : null)}
                className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                disabled={verifySubmitting}
              >
                Cancel
              </button>
              <button
                onClick={submitVerify}
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-white text-sm disabled:opacity-60 ${verifyStatus === 'complete' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                disabled={verifySubmitting}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
