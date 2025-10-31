import { useEffect, useState } from 'react';

const apiBase = import.meta.env.VITE_API_URL as string;

type ChiefClientSummary = {
  client_id: number;
  client_username: string | null;
  amount_to_pay: number;
  amount_paid: number;
  amount_remaining: number;
};

type ZoneRow = {
  zone_id: number;
  zone_name: string;
  clients_count: number;
  amount_to_pay: number;
  amount_paid: number;
  amount_remaining: number;
};

type SimpleZone = { id: number; zone_name: string };

const Reports = () => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  // Chief data
  const [chiefRows, setChiefRows] = useState<ChiefClientSummary[]>([]);

  // Manager/Supervisor data
  const [zones, setZones] = useState<SimpleZone[]>([]);
  const [zoneId, setZoneId] = useState<string>('');
  const [msFilter, setMsFilter] = useState<'all' | 'paid' | 'remaining'>('all');
  const [zoneRows, setZoneRows] = useState<ZoneRow[]>([]);
  const [totals, setTotals] = useState<{ clients_count: number; amount_to_pay: number; amount_paid: number; amount_remaining: number } | null>(null);

  // Client data
  const [mySummary, setMySummary] = useState<{ username: string; amount_to_pay: number; amount_paid: number; amount_remaining: number } | null>(null);

  // Manager-only supervisors list and selection
  const [supervisors, setSupervisors] = useState<Array<{ id: number; username: string }>>([]);
  const [supervisorId, setSupervisorId] = useState<string>('');

  // Chief filter (paid/remaining/all)
  const [chiefFilter, setChiefFilter] = useState<'all' | 'paid' | 'remaining'>('all');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const me = await r.json();
        if (!r.ok) throw new Error(me?.error || 'Failed to load user');
        setRole(me?.user?.role ?? null);
      })
      .catch((e: any) => setError(e?.message || 'Failed to load user'))
      .finally(() => setLoading(false));
  }, []);

  // Load selectable zones for manager/supervisor
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !role) return;
    if (role !== 'manager' && role !== 'supervisor') return;
    setLoading(true);
    setError(null);
    const qs = role === 'supervisor' ? '?scope=supervisor' : '';
    fetch(`${apiBase}/api/zones${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load zones');
        const simple: SimpleZone[] = (data.zones || []).map((z: any) => ({ id: z.id, zone_name: z.zone_name }));
        setZones(simple);
      })
      .catch((e: any) => setError(e?.message || 'Failed to load zones'))
      .finally(() => setLoading(false));
  }, [role]);

  // Load supervisors list for manager
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || role !== 'manager') return;
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/report/supervisors`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load supervisors');
        setSupervisors(Array.isArray(data.supervisors) ? data.supervisors : []);
      })
      .catch((e: any) => setError(e?.message || 'Failed to load supervisors'))
      .finally(() => setLoading(false));
  }, [role]);

  // Load reports by role
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !role) return;
    setLoading(true);
    setError(null);
    if (role === 'chief') {
      const params = new URLSearchParams();
      params.set('year', String(year));
      params.set('month', String(month));
      params.set('filter', chiefFilter);
      fetch(`${apiBase}/api/report/clients-summary?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async r => {
          const data = await r.json();
          if (!r.ok) throw new Error(data?.error || 'Failed to load summary');
          setChiefRows(Array.isArray(data.clients) ? data.clients : []);
        })
        .catch((e: any) => setError(e?.message || 'Failed to load summary'))
        .finally(() => setLoading(false));
    } else if (role === 'manager' || role === 'supervisor') {
      const params = new URLSearchParams();
      params.set('year', String(year));
      params.set('month', String(month));
      params.set('filter', msFilter);
      if (zoneId) params.set('zoneId', zoneId);
      if (role === 'manager' && supervisorId) params.set('supervisorId', supervisorId);
      fetch(`${apiBase}/api/report/zones-summary?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async r => {
          const data = await r.json();
          if (!r.ok) throw new Error(data?.error || 'Failed to load zones summary');
          setZoneRows(Array.isArray(data.rows) ? data.rows : []);
          setTotals(data.totals || null);
        })
        .catch((e: any) => setError(e?.message || 'Failed to load zones summary'))
        .finally(() => setLoading(false));
    } else if (role === 'client') {
      fetch(`${apiBase}/api/report/my-summary?year=${year}&month=${month}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async r => {
          const data = await r.json();
          if (!r.ok) throw new Error(data?.error || 'Failed to load my summary');
          setMySummary(data.client || null);
        })
        .catch((e: any) => setError(e?.message || 'Failed to load my summary'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [role, year, month, msFilter, zoneId, supervisorId, chiefFilter]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Reports</h2>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm text-gray-700">Year</label>
          <select className="mt-1 border rounded px-2 py-2" value={year} onChange={e => setYear(Number(e.target.value))}>
            {Array.from({ length: 6 }).map((_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700">Month</label>
          <select className="mt-1 border rounded px-2 py-2" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }).map((_, i) => {
              const m = i + 1;
              const d = new Date(2000, i, 1);
              const name = d.toLocaleString(undefined, { month: 'long' });
              return <option key={m} value={m}>{name}</option>;
            })}
          </select>
        </div>

        {(role === 'manager' || role === 'supervisor') && (
          <>
            <div>
              <label className="block text-sm text-gray-700">Zone</label>
              <select className="mt-1 border rounded px-2 py-2" value={zoneId} onChange={e => setZoneId(e.target.value)}>
                <option value="">All Zones</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.zone_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700">Filter</label>
              <select className="mt-1 border rounded px-2 py-2" value={msFilter} onChange={e => setMsFilter(e.target.value as any)}>
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="remaining">Remaining</option>
              </select>
            </div>
            {role === 'manager' && (
              <div>
                <label className="block text-sm text-gray-700">Supervisor</label>
                <select className="mt-1 border rounded px-2 py-2" value={supervisorId} onChange={e => setSupervisorId(e.target.value)}>
                  <option value="">All Supervisors</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>{s.username}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {role === 'chief' && (
          <div className="flex items-end gap-3">
            <div className="text-sm text-gray-600">Showing clients in your assigned zones</div>
            <div>
              <label className="block text-sm text-gray-700">Filter</label>
              <select className="mt-1 border rounded px-2 py-2" value={chiefFilter} onChange={e => setChiefFilter(e.target.value as any)}>
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="remaining">Remaining</option>
              </select>
            </div>
          </div>
        )}

        {role === 'client' && (
          <div className="text-sm text-gray-600">Showing your monthly summary</div>
        )}
      </div>

      {error && <div className="text-red-600 mb-3">{error}</div>}

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          {(role === 'manager' || role === 'supervisor') && (
            <div className="bg-white rounded-lg shadow overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Zone</th>
                    <th className="px-4 py-3 text-right"># Clients</th>
                    <th className="px-4 py-3 text-right">Amount To Pay</th>
                    <th className="px-4 py-3 text-right">Amount Paid</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {zoneRows.map(r => (
                    <tr key={r.zone_id} className="border-t">
                      <td className="px-4 py-3">{r.zone_name}</td>
                      <td className="px-4 py-3 text-right">{r.clients_count}</td>
                      <td className="px-4 py-3 text-right">{r.amount_to_pay}</td>
                      <td className="px-4 py-3 text-right">{r.amount_paid}</td>
                      <td className="px-4 py-3 text-right">{r.amount_remaining}</td>
                    </tr>
                  ))}
                  {!zoneRows.length && (
                    <tr>
                      <td className="px-4 py-6 text-gray-500" colSpan={5}>No data found.</td>
                    </tr>
                  )}
                </tbody>
                {totals && (
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold border-t">
                      <td className="px-4 py-3 text-right">Totals</td>
                      <td className="px-4 py-3 text-right">{totals.clients_count}</td>
                      <td className="px-4 py-3 text-right">{totals.amount_to_pay}</td>
                      <td className="px-4 py-3 text-right">{totals.amount_paid}</td>
                      <td className="px-4 py-3 text-right">{totals.amount_remaining}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {role === 'chief' && (
            <div className="bg-white rounded-lg shadow overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-right">Amount To Pay</th>
                    <th className="px-4 py-3 text-right">Amount Paid</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {chiefRows.map(r => (
                    <tr key={r.client_id} className="border-t">
                      <td className="px-4 py-3">{r.client_username || r.client_id}</td>
                      <td className="px-4 py-3 text-right">{r.amount_to_pay}</td>
                      <td className="px-4 py-3 text-right">{r.amount_paid}</td>
                      <td className="px-4 py-3 text-right">{r.amount_remaining}</td>
                    </tr>
                  ))}
                  {!chiefRows.length && (
                    <tr>
                      <td className="px-4 py-6 text-gray-500" colSpan={4}>No clients found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {role === 'client' && mySummary && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-right">Amount To Pay</th>
                    <th className="px-4 py-3 text-right">Amount Paid</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-4 py-3">{mySummary.username}</td>
                    <td className="px-4 py-3 text-right">{mySummary.amount_to_pay}</td>
                    <td className="px-4 py-3 text-right">{mySummary.amount_paid}</td>
                    <td className="px-4 py-3 text-right">{mySummary.amount_remaining}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
