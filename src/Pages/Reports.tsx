import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useI18n } from 'src/lib/i18n';
import LoadingSpinner from 'src/Components/LoadingSpinner';

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
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(0); // 0 = All months

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

  // Additional filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');

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

  // Number formatter
  const nf = useMemo(() => new Intl.NumberFormat(lang === 'rw' ? undefined : undefined, { maximumFractionDigits: 0 }), [lang]);

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
    const monthName = month === 0 ? t('reports.filters.all') : new Date(2000, month - 1, 1).toLocaleString(undefined, { month: 'long' });
    const sup = supervisors.find(s => String(s.id) === supervisorId);
    const zone = zones.find(z => String(z.id) === zoneId);
    const zoneNamesFromRows = zoneRows.map(r => r.zone_name).filter(Boolean);
    const zonesList = zone ? [zone.zone_name] : (zoneNamesFromRows.length ? zoneNamesFromRows : []);
    const header = `
      <div style="margin-bottom:16px">
        <div style="font-size:20px;font-weight:700;">${t('reports.company')}</div>
        <div style="font-size:14px;color:#374151;">${t('reports.export.zonesTitle')}</div>
        <div style="margin-top:8px;font-size:12px;color:#111827;">
          <div><strong>${t('reports.period')}:</strong> ${monthName} ${year}</div>
          <div><strong>${t('reports.filter')}:</strong> ${msFilter}</div>
          <div><strong>${t('reports.supervisor')}:</strong> ${sup ? sup.username : t('reports.filters.all')}</div>
          <div><strong>${t('reports.zones')}:</strong> ${zonesList.length ? zonesList.join(', ') : t('reports.filters.all')}</div>
        </div>
      </div>`;
    const monthSlug = month === 0 ? 'all' : String(month);
    printHtml(`${t('reports.export.zonesTitle')} ${year}-${monthSlug}`, header + section);
  };

  const exportChiefClientsPdf = () => {
    const section = chiefClientsRef.current?.innerHTML || '';
    const monthName = month === 0 ? t('reports.filters.all') : new Date(2000, month - 1, 1).toLocaleString(undefined, { month: 'long' });
    const header = `
      <div style="margin-bottom:16px">
        <div style="font-size:20px;font-weight:700;">${t('reports.company')}</div>
        <div style="font-size:14px;color:#374151;">${t('reports.export.chiefClientsTitle')}</div>
        <div style="margin-top:8px;font-size:12px;color:#111827;">
          <div><strong>${t('reports.period')}:</strong> ${monthName} ${year}</div>
          <div><strong>${t('reports.filter')}:</strong> ${chiefFilter}</div>
        </div>
      </div>`;
    const monthSlug = month === 0 ? 'all' : String(month);
    printHtml(`${t('reports.export.chiefClientsTitle')} ${year}-${monthSlug} (${chiefFilter})`, header + section);
  };

  const exportChiefPaymentsPdf = () => {
    const section = chiefPaymentsRef.current?.innerHTML || '';
    const monthName = month === 0 ? t('reports.filters.all') : new Date(2000, month - 1, 1).toLocaleString(undefined, { month: 'long' });
    const header = `
      <div style="margin-bottom:16px">
        <div style="font-size:20px;font-weight:700;">${t('reports.company')}</div>
        <div style="font-size:14px;color:#374151;">${t('reports.export.chiefPaymentsTitle')}</div>
        <div style="margin-top:8px;font-size:12px;color:#111827;">
          <div><strong>${t('reports.period')}:</strong> ${monthName} ${year}</div>
        </div>
      </div>`;
    const monthSlug = month === 0 ? 'all' : String(month);
    printHtml(`${t('reports.export.chiefPaymentsTitle')} ${year}-${monthSlug}`, header + section);
  };

  const exportClientPaymentsPdf = () => {
    const section = clientPaymentsRef.current?.innerHTML || '';
    const monthName = month === 0 ? t('reports.filters.all') : new Date(2000, month - 1, 1).toLocaleString(undefined, { month: 'long' });
    const header = `
      <div style="margin-bottom:16px">
        <div style="font-size:20px;font-weight:700;">${t('reports.company')}</div>
        <div style="font-size:14px;color:#374151;">${t('reports.export.clientPaymentsTitle')}</div>
        <div style="margin-top:8px;font-size:12px;color:#111827;">
          <div><strong>${t('reports.period')}:</strong> ${monthName} ${year}</div>
        </div>
      </div>`;
    const monthSlug = month === 0 ? 'all' : String(month);
    printHtml(`${t('reports.export.clientPaymentsTitle')} ${year}-${monthSlug}`, header + section);
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
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    const rows = zoneRows.map(r => [r.zone_id, r.zone_name, r.clients_count, r.amount_to_pay, r.amount_paid, r.amount_remaining]);
    const monthSlug = month === 0 ? 'all' : String(month);
    downloadCsv(`zones_summary_${year}-${monthSlug}_${msFilter || 'all'}_${ts}.csv`, ['Zone ID', t('reports.columns.zone'), t('reports.columns.clients'), t('reports.columns.toPay'), t('reports.columns.paid'), t('reports.columns.remaining')], rows);
  };

  const exportChiefClients = () => {
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    const rows = chiefRows.map(r => [r.client_id, r.client_username ?? '', r.amount_to_pay, r.amount_paid, r.amount_remaining]);
    const monthSlug = month === 0 ? 'all' : String(month);
    downloadCsv(`chief_clients_${year}-${monthSlug}_${chiefFilter}_${ts}.csv`, ['Client ID', t('reports.client'), t('reports.columns.toPay'), t('reports.columns.paid'), t('reports.columns.remaining')], rows);
  };

  const exportChiefPayments = () => {
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    const rows = chiefPaymentsFiltered.map(p => [p.id, p.completed_at ?? '', p.client_username ?? (p.client_id ?? ''), p.amount, p.currency ?? '', p.status ?? '']);
    const monthSlug = month === 0 ? 'all' : String(month);
    downloadCsv(`chief_payments_${year}-${monthSlug}_${statusFilter}_${ts}.csv`, ['Payment ID', t('reports.date'), t('reports.client'), t('reports.amount'), t('reports.currency'), t('reports.status')], rows);
  };

  const exportClientPayments = () => {
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    const rows = clientPaymentsFiltered.map(p => [p.id, p.completed_at ?? '', p.amount, p.currency ?? '', p.status ?? '']);
    const monthSlug = month === 0 ? 'all' : String(month);
    downloadCsv(`my_payments_${year}-${monthSlug}_${statusFilter}_${ts}.csv`, ['Payment ID', t('reports.date'), t('reports.amount'), t('reports.currency'), t('reports.status')], rows);
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
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
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
      if (month > 0) params.set('month', String(month));
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
      if (month > 0) p.set('month', String(month));
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
      if (month > 0) params.set('month', String(month));
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
      if (month > 0) p.set('month', String(month));
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

  // Client-side filtered payments by date/status
  const inRange = (iso: string | null) => {
    if (!iso) return false;
    const d = new Date(iso);
    if (startDate) {
      const s = new Date(startDate);
      if (d < s) return false;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      if (d > e) return false;
    }
    return true;
  };

  const byStatus = (s: string | null | undefined) =>
    statusFilter === 'all' ? true : (s || '').toLowerCase() === statusFilter;

  const chiefPaymentsFiltered = useMemo(
    () => chiefPayments.filter(p => inRange(p.completed_at) && byStatus(p.status)),
    [chiefPayments, startDate, endDate, statusFilter]
  );
  const clientPaymentsFiltered = useMemo(
    () => clientPayments.filter(p => inRange(p.completed_at) && byStatus(p.status)),
    [clientPayments, startDate, endDate, statusFilter]
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{t('reports.title')}</h2>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm text-gray-700">{t('reports.filters.year')}</label>
          <select className="mt-1 border rounded px-2 py-2" value={year} onChange={e => setYear(Number(e.target.value))}>
            {Array.from({ length: 6 }).map((_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700">{t('reports.filters.month')}</label>
          <select className="mt-1 border rounded px-2 py-2" value={month} onChange={e => setMonth(Number(e.target.value))}>
            <option value={0}>{t('reports.filters.all')}</option>
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
              <label className="block text-sm text-gray-700">{t('reports.filters.zone')}</label>
              <select className="mt-1 border rounded px-2 py-2" value={zoneId} onChange={e => onChangeZone(e.target.value)}>
                <option value="">{t('reports.allZones')}</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.zone_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700">{t('reports.filters.paidRemaining')}</label>
              <select className="mt-1 border rounded px-2 py-2" value={msFilter} onChange={e => setMsFilter(e.target.value as any)}>
                <option value="all">{t('reports.filters.all')}</option>
                <option value="paid">{t('reports.filters.paid')}</option>
                <option value="remaining">{t('reports.filters.remaining')}</option>
              </select>
            </div>
            {role === 'manager' && (
              <div>
                <label className="block text-sm text-gray-700">{t('reports.filters.supervisor')}</label>
                <select className="mt-1 border rounded px-2 py-2" value={supervisorId} onChange={e => onChangeSupervisor(e.target.value)}>
                  <option value="">{t('reports.allSupervisors')}</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>{s.username}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="self-end pb-1 flex items-center gap-2">
              <button onClick={exportManagerSupervisorZones} className="px-3 py-2 rounded bg-amber-600 text-white">{t('reports.downloadCsv')}</button>
              <button onClick={exportZonesPdf} className="px-3 py-2 rounded bg-amber-700 text-white">{t('reports.downloadPdf')}</button>
            </div>
          </>
        )}

        {role === 'chief' && (
          <div className="flex items-end gap-3">
            <div className="text-sm text-gray-600">{t('reports.chief.showingClients')}</div>
            <div>
              <label className="block text-sm text-gray-700">{t('reports.filters.paidRemaining')}</label>
              <select className="mt-1 border rounded px-2 py-2" value={chiefFilter} onChange={e => setChiefFilter(e.target.value as any)}>
                <option value="all">{t('reports.filters.all')}</option>
                <option value="paid">{t('reports.filters.paid')}</option>
                <option value="remaining">{t('reports.filters.remaining')}</option>
              </select>
            </div>
            {/* Extra filters */}
            <div>
              <label className="block text-sm text-gray-700">{t('reports.filters.startDate')}</label>
              <input type="date" className="mt-1 border rounded px-2 py-2" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-700">{t('reports.filters.endDate')}</label>
              <input type="date" className="mt-1 border rounded px-2 py-2" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-700">{t('reports.filters.status')}</label>
              <select className="mt-1 border rounded px-2 py-2" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                <option value="all">{t('reports.status.all')}</option>
                <option value="success">{t('reports.status.success')}</option>
                <option value="failed">{t('reports.status.failed')}</option>
                <option value="pending">{t('reports.status.pending')}</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportChiefClients} className="px-3 py-2 rounded bg-amber-600 text-white">{t('reports.downloadCsv')}</button>
              <button onClick={exportChiefClientsPdf} className="px-3 py-2 rounded bg-amber-700 text-white">{t('reports.downloadPdf')}</button>
            </div>
          </div>
        )}

        {role === 'client' && (
          <div className="text-sm text-gray-600">{t('reports.client.showingSummary')}</div>
        )}
      </div>

      {error && <div className="text-red-600 mb-3">{error}</div>}

      {loading ? (
        <div className="py-8 flex items-center justify-center"><LoadingSpinner /></div>
      ) : (
        <>
          {(role === 'manager' || role === 'supervisor') && (
            <div ref={zonesRef} className="bg-white rounded-lg shadow overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">{t('reports.columns.zone')}</th>
                    <th className="px-4 py-3 text-right">{t('reports.columns.clients')}</th>
                    <th className="px-4 py-3 text-right">{t('reports.columns.toPay')}</th>
                    <th className="px-4 py-3 text-right">{t('reports.columns.paid')}</th>
                    <th className="px-4 py-3 text-right">{t('reports.columns.remaining')}</th>
                  </tr>
                </thead>
                <tbody>
                  {zoneRows.map(r => (
                    <tr key={r.zone_id} className="border-t">
                      <td className="px-4 py-3"><NavLink className="text-amber-700 hover:underline" to={`/zones/${r.zone_id}`}>{r.zone_name}</NavLink></td>
                      <td className="px-4 py-3 text-right">{nf.format(r.clients_count)}</td>
                      <td className="px-4 py-3 text-right">{nf.format(r.amount_to_pay)}</td>
                      <td className="px-4 py-3 text-right">{nf.format(r.amount_paid)}</td>
                      <td className="px-4 py-3 text-right">{nf.format(r.amount_remaining)}</td>
                    </tr>
                  ))}
                  {!zoneRows.length && (
                    <tr>
                      <td className="px-4 py-6 text-gray-500" colSpan={5}>{t('reports.noData')}</td>
                    </tr>
                  )}
                </tbody>
                {totals && (
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold border-t">
                      <td className="px-4 py-3 text-right">{t('reports.totals')}</td>
                      <td className="px-4 py-3 text-right">{nf.format(totals.clients_count)}</td>
                      <td className="px-4 py-3 text-right">{nf.format(totals.amount_to_pay)}</td>
                      <td className="px-4 py-3 text-right">{nf.format(totals.amount_paid)}</td>
                      <td className="px-4 py-3 text-right">{nf.format(totals.amount_remaining)}</td>
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
                    <th className="px-4 py-3 text-left">{t('reports.client')}</th>
                    <th className="px-4 py-3 text-right">{t('reports.columns.toPay')}</th>
                    <th className="px-4 py-3 text-right">{t('reports.columns.paid')}</th>
                    <th className="px-4 py-3 text-right">{t('reports.columns.remaining')}</th>
                  </tr>
                </thead>
                <tbody>
                  {chiefRows.map(r => (
                    <tr key={r.client_id} className="border-t">
                      <td className="px-4 py-3">{r.client_username || r.client_id}</td>
                      <td className="px-4 py-3 text-right">{nf.format(r.amount_to_pay)}</td>
                      <td className="px-4 py-3 text-right">{nf.format(r.amount_paid)}</td>
                      <td className="px-4 py-3 text-right">{nf.format(r.amount_remaining)}</td>
                    </tr>
                  ))}
                  {!chiefRows.length && (
                    <tr>
                      <td className="px-4 py-6 text-gray-500" colSpan={4}>{t('reports.noData')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {role === 'chief' && (
            <div ref={chiefPaymentsRef} className="bg-white rounded-lg shadow overflow-auto mt-6">
              <div className="px-4 py-3 font-semibold flex items-center justify-between">
                <span>{t('reports.payments.heading')}</span>
                <div className="flex items-center gap-2">
                  <button onClick={exportChiefPayments} className="px-3 py-1 rounded bg-amber-600 text-white">{t('reports.downloadCsv')}</button>
                  <button onClick={exportChiefPaymentsPdf} className="px-3 py-1 rounded bg-amber-700 text-white">{t('reports.downloadPdf')}</button>
                </div>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">{t('reports.date')}</th>
                    <th className="px-4 py-3 text-left">{t('reports.client')}</th>
                    <th className="px-4 py-3 text-right">{t('reports.amount')}</th>
                    <th className="px-4 py-3 text-left">{t('reports.currency')}</th>
                    <th className="px-4 py-3 text-left">{t('reports.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {chiefPaymentsFiltered.map(p => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-3">{p.completed_at ? new Date(p.completed_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3">{p.client_username || p.client_id}</td>
                      <td className="px-4 py-3 text-right">{nf.format(p.amount)}</td>
                      <td className="px-4 py-3">{p.currency || ''}</td>
                      <td className="px-4 py-3">{p.status || ''}</td>
                    </tr>
                  ))}
                  {!chiefPaymentsFiltered.length && (
                    <tr>
                      <td className="px-4 py-6 text-gray-500" colSpan={5}>{t('reports.noData')}</td>
                    </tr>
                  )}
                </tbody>
                {chiefPaymentsTotals && (
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold border-t">
                      <td className="px-4 py-3 text-right" colSpan={2}>{t('reports.totals')}</td>
                      <td className="px-4 py-3 text-right">{nf.format(chiefPaymentsTotals.amount_sum)}</td>
                      <td className="px-4 py-3" colSpan={2}>{t('reports.count')}: {nf.format(chiefPaymentsTotals.count)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {role === 'client' && (
            <div ref={clientPaymentsRef} className="bg-white rounded-lg shadow overflow-auto">
              <div className="px-4 py-3 font-semibold flex items-center justify-between">
                <span>{t('reports.myPayments.heading')}</span>
                <div className="flex items-center gap-2">
                  <button onClick={exportClientPayments} className="px-3 py-1 rounded bg-amber-600 text-white">{t('reports.downloadCsv')}</button>
                  <button onClick={exportClientPaymentsPdf} className="px-3 py-1 rounded bg-amber-700 text-white">{t('reports.downloadPdf')}</button>
                </div>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">{t('reports.date')}</th>
                    <th className="px-4 py-3 text-right">{t('reports.amount')}</th>
                    <th className="px-4 py-3 text-left">{t('reports.currency')}</th>
                    <th className="px-4 py-3 text-left">{t('reports.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {clientPaymentsFiltered.map(p => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-3">{p.completed_at ? new Date(p.completed_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3 text-right">{nf.format(p.amount)}</td>
                      <td className="px-4 py-3">{p.currency || ''}</td>
                      <td className="px-4 py-3">{p.status || ''}</td>
                    </tr>
                  ))}
                  {!clientPaymentsFiltered.length && (
                    <tr>
                      <td className="px-4 py-6 text-gray-500" colSpan={4}>{t('reports.noData')}</td>
                    </tr>
                  )}
                </tbody>
                {clientPaymentsTotals && (
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold border-t">
                      <td className="px-4 py-3 text-right">{t('reports.totals')}</td>
                      <td className="px-4 py-3 text-right">{nf.format(clientPaymentsTotals.amount_sum)}</td>
                      <td className="px-4 py-3" colSpan={2}>{t('reports.count')}: {nf.format(clientPaymentsTotals.count)}</td>
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
