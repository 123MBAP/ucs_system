import { useEffect, useState } from 'react';

const apiBase = 'http://localhost:4000';

type PaymentRow = {
  id: number;
  client_id: number | null;
  client_username?: string | null;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  purpose?: string | null;
  transaction_id?: string | null;
  completed_at: string;
  zone_id?: number | null;
};

type ChiefClientSummary = {
  client_id: number;
  client_username: string | null;
  amount_to_pay: number;
  amount_paid: number;
  amount_remaining: number;
};

const Reports = () => {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [scope, setScope] = useState<'client' | 'zone' | 'all' | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [chiefRows, setChiefRows] = useState<ChiefClientSummary[]>([]);

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!role) return;
    setLoading(true);
    setError(null);
    if (role === 'chief') {
      fetch(`${apiBase}/api/report/clients-summary?year=${year}&month=${month}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async r => {
          const data = await r.json();
          if (!r.ok) throw new Error(data?.error || 'Failed to load summary');
          setChiefRows(Array.isArray(data.clients) ? data.clients : []);
        })
        .catch((e: any) => setError(e?.message || 'Failed to load summary'))
        .finally(() => setLoading(false));
    } else {
      fetch(`${apiBase}/api/payments/statements`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async r => {
          const data = await r.json();
          if (!r.ok) throw new Error(data?.error || 'Failed to load statements');
          setScope(data.scope ?? null);
          setPayments(Array.isArray(data.payments) ? data.payments : []);
        })
        .catch((e: any) => setError(e?.message || 'Failed to load statements'))
        .finally(() => setLoading(false));
    }
  }, [role, year, month]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Reports</h2>
      {role === 'chief' && (
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
        </div>
      )}
      {error && <div className="text-red-600 mb-3">{error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : role === 'chief' ? (
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
      ) : (
        <>
          {scope && (
            <div className="mb-4 text-sm text-gray-600">Scope: {scope === 'client' ? 'My payments' : scope === 'zone' ? 'Zone payments' : 'All payments'}</div>
          )}
          <div className="bg-white rounded-lg shadow overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Currency</th>
                  <th className="px-4 py-3 text-left">Purpose</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Provider</th>
                  <th className="px-4 py-3 text-left">Completed At</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-3">{p.id}</td>
                    <td className="px-4 py-3">{p.client_username || p.client_id || '-'}</td>
                    <td className="px-4 py-3 text-right">{p.amount}</td>
                    <td className="px-4 py-3">{p.currency}</td>
                    <td className="px-4 py-3">{p.purpose || '-'}</td>
                    <td className="px-4 py-3">{p.status}</td>
                    <td className="px-4 py-3">{p.provider}</td>
                    <td className="px-4 py-3">{new Date(p.completed_at).toLocaleString()}</td>
                  </tr>
                ))}
                {!payments.length && (
                  <tr>
                    <td className="px-4 py-6 text-gray-500" colSpan={8}>No payments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
