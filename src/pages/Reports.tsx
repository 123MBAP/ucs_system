import { useEffect, useRef, useState } from 'react';

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

type PaymentRow = {
  id: number;
  client_id: number;
  amount: number;
  currency: string | null;
  status: string | null;
  completed_at: string | null;
  client_username?: string | null;
  zone_id?: number | null;
};

const Reports = () => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  // Chief data
  const [chiefRows, setChiefRows] = useState<ChiefClientSummary[]>([]);
  const [chiefPayments, setChiefPayments] = useState<PaymentRow[]>([]);
  const [chiefPaymentsTotals, setChiefPaymentsTotals] = useState<{ count: number; amount_sum: number } | null>(null);

  // Manager/Supervisor data
  const [zones, setZones] = useState<SimpleZone[]>([]);
  const [zoneId, setZoneId] = useState<string>('');
  const [msFilter, setMsFilter] = useState<'all' | 'paid' | 'remaining'>('all');
  const [zoneRows, setZoneRows] = useState<ZoneRow[]>([]);
  const [totals, setTotals] = useState<{ clients_count: number; amount_to_pay: number; amount_paid: number; amount_remaining: number } | null>(null);

  // Client data
  const [clientPayments, setClientPayments] = useState<PaymentRow[]>([]);
  const [clientPaymentsTotals, setClientPaymentsTotals] = useState<{ count: number; amount_sum: number } | null>(null);

  // Manager-only supervisors list and selection
  const [supervisors, setSupervisors] = useState<Array<{ id: number; username: string }>>([]);
  const [supervisorId, setSupervisorId] = useState<string>('');

  // Chief filter (paid/remaining/all)
  const [chiefFilter, setChiefFilter] = useState<'all' | 'paid' | 'remaining'>('all');

  // Print/PDF helpers
  const zonesRef = useRef<HTMLDivElement | null>(null);
  const chiefClientsRef = useRef<HTMLDivElement | null>(null);
  const chiefPaymentsRef = useRef<HTMLDivElement | null>(null);
  const clientPaymentsRef = useRef<HTMLDivElement | null>(null);

  function printHtml(title: string, html: string) {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, 'Apple Color Emoji','Segoe UI Emoji'; padding: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background: #f3f4f6; text-align: left; }
        h1 { font-size: 18px; margin: 0 0 12px; }
      </style>
    </head><body>
      <h1>${title}</h1>
      ${html}
      <script>window.onload = function(){ window.print(); setTimeout(()=>window.close(), 300); }<\/script>
    </body></html>`);
    w.document.close();
  }

  const exportZonesPdf = () => {
    const section = zonesRef.current?.innerHTML || '';
    const monthName = new Date(2000, month - 1, 1).toLocaleString(undefined, { month: 'long' });
    const sup = supervisors.find(s => String(s.id) === supervisorId);
    const zone = zones.find(z => String(z.id) === zoneId);
    const zoneNamesFromRows = zoneRows.map(r => r.zone_name).filter(Boolean);
    const zonesList = zone ? [zone.zone_name] : (zoneNamesFromRows.length ? zoneNamesFromRows : []);
    const header = `
      <div style="margin-bottom:16px">
        <div style="font-size:20px;font-weight:700;">UCS Company Ltd.</div>
        <div style="font-size:14px;color:#374151;">Zones Summary Report</div>
        <div style="margin-top:8px;font-size:12px;color:#111827;">
          <div><strong>Period:</strong> ${monthName} ${year}</div>
          <div><strong>Filter:</strong> ${msFilter}</div>
          <div><strong>Supervisor:</strong> ${sup ? sup.username : 'All'}</div>
          <div><strong>Zones:</strong> ${zonesList.length ? zonesList.join(', ') : 'All'}</div>
        </div>
      </div>`;
    printHtml(`Zones Summary ${year}-${month}`, header + section);
  };

  const exportChiefClientsPdf = () => {
    const section = chiefClientsRef.current?.innerHTML || '';
    const monthName = new Date(2000, month - 1, 1).toLocaleString(undefined, { month: 'long' });
    const header = `
      <div style=\"margin-bottom:16px\">
        <div style=\"font-size:20px;font-weight:700;\">UCS Company Ltd.</div>
        <div style=\"font-size:14px;color:#374151;\">Chief Clients Report</div>
        <div style=\"margin-top:8px;font-size:12px;color:#111827;\">
          <div><strong>Period:</strong> ${monthName} ${year}</div>
          <div><strong>Filter:</strong> ${chiefFilter}</div>
        </div>
      </div>`;
    printHtml(`Chief Clients ${year}-${month} (${chiefFilter})`, header + section);
  };

  const exportChiefPaymentsPdf = () => {
    const section = chiefPaymentsRef.current?.innerHTML || '';
    const monthName = new Date(2000, month - 1, 1).toLocaleString(undefined, { month: 'long' });
    const header = `
      <div style=\"margin-bottom:16px\">
        <div style=\"font-size:20px;font-weight:700;\">UCS Company Ltd.</div>
        <div style=\"font-size:14px;color:#374151;\">Chief Payments Report</div>
        <div style=\"margin-top:8px;font-size:12px;color:#111827;\">
          <div><strong>Period:</strong> ${monthName} ${year}</div>
        </div>
      </div>`;
    printHtml(`Chief Payments ${year}-${month}`, header + section);
  };

  const exportClientPaymentsPdf = () => {
    const section = clientPaymentsRef.current?.innerHTML || '';
    const monthName = new Date(2000, month - 1, 1).toLocaleString(undefined, { month: 'long' });
    const header = `
      <div style=\"margin-bottom:16px\">
        <div style=\"font-size:20px;font-weight:700;\">UCS Company Ltd.</div>
        <div style=\"font-size:14px;color:#374151;\">My Payments Report</div>
        <div style=\"margin-top:8px;font-size:12px;color:#111827;\">
          <div><strong>Period:</strong> ${monthName} ${year}</div>
        </div>
      </div>`;
    printHtml(`My Payments ${year}-${month}`, header + section);
  };

  // CSV helpers
  function toCsvValue(v: any) {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
    const headerLine = headers.map(toCsvValue).join(',');
    const lines = rows.map(r => r.map(toCsvValue).join(','));
    const csv = [headerLine, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Exporters per view
  const exportManagerSupervisorZones = () => {
    const rows = zoneRows.map(r => [r.zone_id, r.zone_name, r.clients_count, r.amount_to_pay, r.amount_paid, r.amount_remaining]);
    downloadCsv(`zones_summary_${year}-${month}.csv`, ['Zone ID', 'Zone', '# Clients', 'Amount To Pay', 'Amount Paid', 'Remaining'], rows);
  };

  const exportChiefClients = () => {
    const rows = chiefRows.map(r => [r.client_id, r.client_username ?? '', r.amount_to_pay, r.amount_paid, r.amount_remaining]);
    downloadCsv(`chief_clients_${year}-${month}_${chiefFilter}.csv`, ['Client ID', 'Client', 'To Pay', 'Paid', 'Remaining'], rows);
  };

  const exportChiefPayments = () => {
    const rows = chiefPayments.map(p => [p.id, p.completed_at ?? '', p.client_username ?? (p.client_id ?? ''), p.amount, p.currency ?? '', p.status ?? '']);
    downloadCsv(`chief_payments_${year}-${month}.csv`, ['Payment ID', 'Date', 'Client', 'Amount', 'Currency', 'Status'], rows);
  };

  const exportClientPayments = () => {
    const rows = clientPayments.map(p => [p.id, p.completed_at ?? '', p.amount, p.currency ?? '', p.status ?? '']);
    downloadCsv(`my_payments_${year}-${month}.csv`, ['Payment ID', 'Date', 'Amount', 'Currency', 'Status'], rows);
  };

  // Handlers to prevent mismatched zone/supervisor combinations for manager
  const onChangeZone = (value: string) => {
    setZoneId(value);
    // If manager chose a specific zone, reset supervisor filter to All
    if (role === 'manager' && value) {
      setSupervisorId('');
    }
  };

  const onChangeSupervisor = (value: string) => {
    setSupervisorId(value);
    // If manager chose a specific supervisor, reset zone filter to All
    if (role === 'manager' && value) {
      setZoneId('');
    }
  };

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

      // Load chief payments list with same year/month filters
      const p = new URLSearchParams();
      p.set('year', String(year));
      p.set('month', String(month));
      fetch(`${apiBase}/api/report/payments?${p.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async r => {
          const data = await r.json();
          if (!r.ok) throw new Error(data?.error || 'Failed to load payments');
          setChiefPayments(Array.isArray(data.payments) ? data.payments : []);
          setChiefPaymentsTotals(data.totals || null);
        })
        .catch((e: any) => setError(e?.message || 'Failed to load payments'));
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
      // Load client payments list with year/month filter
      const p = new URLSearchParams();
      p.set('year', String(year));
      p.set('month', String(month));
      fetch(`${apiBase}/api/report/payments?${p.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async r => {
          const data = await r.json();
          if (!r.ok) throw new Error(data?.error || 'Failed to load payments');
          setClientPayments(Array.isArray(data.payments) ? data.payments : []);
          setClientPaymentsTotals(data.totals || null);
        })
        .catch((e: any) => setError(e?.message || 'Failed to load payments'))
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
              <select className="mt-1 border rounded px-2 py-2" value={zoneId} onChange={e => onChangeZone(e.target.value)}>
                <option value="">All Zones</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.zone_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700">Paid & Remaining</label>
              <select className="mt-1 border rounded px-2 py-2" value={msFilter} onChange={e => setMsFilter(e.target.value as any)}>
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="remaining">Remaining</option>
              </select>
            </div>
            {role === 'manager' && (
              <div>
                <label className="block text-sm text-gray-700">Supervisor</label>
                <select className="mt-1 border rounded px-2 py-2" value={supervisorId} onChange={e => onChangeSupervisor(e.target.value)}>
                  <option value="">All Supervisors</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>{s.username}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="self-end pb-1 flex items-center gap-2">
              <button onClick={exportManagerSupervisorZones} className="px-3 py-2 rounded bg-amber-600 text-white">Download CSV</button>
              <button onClick={exportZonesPdf} className="px-3 py-2 rounded bg-amber-700 text-white">Download PDF</button>
            </div>
          </>
        )}

        {role === 'chief' && (
          <div className="flex items-end gap-3">
            <div className="text-sm text-gray-600">Showing clients in your assigned zones</div>
            <div>
              <label className="block text-sm text-gray-700">Paid&Remaining</label>
              <select className="mt-1 border rounded px-2 py-2" value={chiefFilter} onChange={e => setChiefFilter(e.target.value as any)}>
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="remaining">Remaining</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportChiefClients} className="px-3 py-2 rounded bg-amber-600 text-white">Download Clients CSV</button>
              <button onClick={exportChiefClientsPdf} className="px-3 py-2 rounded bg-amber-700 text-white">Download PDF</button>
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
            <div ref={zonesRef} className="bg-white rounded-lg shadow overflow-auto">
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
            <div ref={chiefClientsRef} className="bg-white rounded-lg shadow overflow-auto">
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

          {role === 'chief' && (
            <div ref={chiefPaymentsRef} className="bg-white rounded-lg shadow overflow-auto mt-6">
              <div className="px-4 py-3 font-semibold flex items-center justify-between">
                <span>Payments (filtered)</span>
                <div className="flex items-center gap-2">
                  <button onClick={exportChiefPayments} className="px-3 py-1 rounded bg-amber-600 text-white">Download CSV</button>
                  <button onClick={exportChiefPaymentsPdf} className="px-3 py-1 rounded bg-amber-700 text-white">Download PDF</button>
                </div>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Currency</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {chiefPayments.map(p => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-3">{p.completed_at ? new Date(p.completed_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3">{p.client_username || p.client_id}</td>
                      <td className="px-4 py-3 text-right">{p.amount}</td>
                      <td className="px-4 py-3">{p.currency || ''}</td>
                      <td className="px-4 py-3">{p.status || ''}</td>
                    </tr>
                  ))}
                  {!chiefPayments.length && (
                    <tr>
                      <td className="px-4 py-6 text-gray-500" colSpan={5}>No payments found.</td>
                    </tr>
                  )}
                </tbody>
                {chiefPaymentsTotals && (
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold border-t">
                      <td className="px-4 py-3 text-right" colSpan={2}>Totals</td>
                      <td className="px-4 py-3 text-right">{chiefPaymentsTotals.amount_sum}</td>
                      <td className="px-4 py-3" colSpan={2}>Count: {chiefPaymentsTotals.count}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {role === 'client' && (
            <div ref={clientPaymentsRef} className="bg-white rounded-lg shadow overflow-auto">
              <div className="px-4 py-3 font-semibold flex items-center justify-between">
                <span>My Payments (filtered)</span>
                <div className="flex items-center gap-2">
                  <button onClick={exportClientPayments} className="px-3 py-1 rounded bg-amber-600 text-white">Download CSV</button>
                  <button onClick={exportClientPaymentsPdf} className="px-3 py-1 rounded bg-amber-700 text-white">Download PDF</button>
                </div>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Currency</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clientPayments.map(p => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-3">{p.completed_at ? new Date(p.completed_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3 text-right">{p.amount}</td>
                      <td className="px-4 py-3">{p.currency || ''}</td>
                      <td className="px-4 py-3">{p.status || ''}</td>
                    </tr>
                  ))}
                  {!clientPayments.length && (
                    <tr>
                      <td className="px-4 py-6 text-gray-500" colSpan={4}>No payments found.</td>
                    </tr>
                  )}
                </tbody>
                {clientPaymentsTotals && (
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold border-t">
                      <td className="px-4 py-3 text-right">Totals</td>
                      <td className="px-4 py-3 text-right">{clientPaymentsTotals.amount_sum}</td>
                      <td className="px-4 py-3" colSpan={2}>Count: {clientPaymentsTotals.count}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
