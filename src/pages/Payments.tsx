import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_URL as string;

type PendingTxn = {
  id: number;
  client_id: number;
  amount: number;
  currency: string;
  provider: string;
  phone_number: string;
  purpose?: string | null;
  external_ref?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  client_username?: string;
};

type CompletedPayment = {
  id: number;
  client_id: number | null;
  amount: number;
  currency: string;
  provider: string;
  phone_number: string;
  purpose?: string | null;
  external_ref?: string | null;
  transaction_id?: string | null;
  status: string;
  created_at: string;
  completed_at: string;
  client_username?: string;
};

const Payments = () => {
  const location = useLocation();
  const [pending, setPending] = useState<PendingTxn[]>([]);
  const [completed, setCompleted] = useState<CompletedPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [purposeEdit, setPurposeEdit] = useState(false);

  function loadAll() {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams(location.search);
    const scope = params.get('scope');
    const filter = params.get('filter');
    const parts: string[] = [];
    if (scope) parts.push(`scope=${encodeURIComponent(scope)}`);
    if (filter) parts.push(`filter=${encodeURIComponent(filter)}`);
    // Default to showing only the logged-in user's payments when no scope is set
    if (!scope) parts.push('mine=true');
    const qs = parts.length ? `?${parts.join('&')}` : '';
    Promise.all([
      fetch(`${apiBase}/api/payments/transactions${qs}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/payments/completed${qs}`, { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(async ([pr, rr]) => {
        const pdata = await pr.json();
        const rdata = await rr.json();
        if (!pr.ok) throw new Error(pdata?.error || 'Failed to load pending');
        if (!rr.ok) throw new Error(rdata?.error || 'Failed to load completed');
        setPending(pdata.transactions || []);
        setCompleted(rdata.payments || []);
      })
      .catch((e: any) => setError(e?.message || 'Failed to load payments'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const now = new Date();
    const month = now.toLocaleString(undefined, { month: 'long' });
    const def = `Pay for ${month}`;
    setPurpose(def);
    loadAll();
  }, [location.search]);

  function initiate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!amount || !phone) { setError('Amount and Phone are required'); return; }
    fetch(`${apiBase}/api/payments/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: Number(amount), phoneNumber: phone, purpose: purpose || undefined })
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to initiate payment');
        // reset minimal
        setAmount(''); setPhone('');
        loadAll();
        try { window.dispatchEvent(new Event('payments-updated')); } catch {}
      })
      .catch((e: any) => setError(e?.message || 'Failed to initiate payment'));
  }

  function complete(txnId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    const ok = window.confirm(`Mark transaction #${txnId} as completed (success)?`);
    if (!ok) return;
    fetch(`${apiBase}/api/payments/transactions/${txnId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'success' })
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to complete transaction');
        loadAll();
        try { window.dispatchEvent(new Event('payments-updated')); } catch {}
      })
      .catch((e: any) => setError(e?.message || 'Failed to complete transaction'));
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Payments</h2>
      {error && <div className="text-red-600">{error}</div>}
      {loading && <div>Loading…</div>}

      <div className="bg-white border rounded shadow p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Initiate Payment</h3>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded text-black font-semibold" style={{ backgroundColor: '#FFCB05' }}>MTN MoMo</div>
            <span className="text-sm text-gray-600">You will pay using MTN Mobile Money</span>
          </div>
        </div>
        <form onSubmit={initiate} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm text-gray-700">Amount</label>
            <input type="number" min="0" step="0.01" className="mt-1 w-full border rounded px-2 py-2" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Phone</label>
            <input className="mt-1 w-full border rounded px-2 py-2" value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm text-gray-700">Purpose</label>
              <button type="button" onClick={() => setPurposeEdit(v => !v)} className="text-sm text-blue-600 underline">
                {purposeEdit ? 'Done' : 'Edit'}
              </button>
            </div>
            <input
              className="mt-1 w-full border rounded px-2 py-2"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              readOnly={!purposeEdit}
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <button type="submit" className="w-full px-4 py-2 rounded font-semibold text-black" style={{ backgroundColor: '#FFCB05' }}>Initiate MTN MoMo Payment</button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Pending Transactions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pending.map(p => (
                  <tr key={p.id}>
                    <td className="px-3 py-2">{p.id}</td>
                    <td className="px-3 py-2">{p.client_username || p.client_id}</td>
                    <td className="px-3 py-2">{p.amount} {p.currency}</td>
                    <td className="px-3 py-2">{p.phone_number}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => complete(p.id)} className="px-2 py-1 text-sm bg-green-600 text-white rounded">Mark Completed</button>
                    </td>
                  </tr>
                ))}
                {!pending.length && (
                  <tr><td className="px-3 py-3 text-gray-500" colSpan={5}>No pending transactions.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white border rounded shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Completed Payments</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {completed.map(r => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">{r.id}</td>
                    <td className="px-3 py-2">{r.client_username || r.client_id}</td>
                    <td className="px-3 py-2">{r.amount} {r.currency}</td>
                    <td className="px-3 py-2">{r.status}</td>
                  </tr>
                ))}
                {!completed.length && (
                  <tr><td className="px-3 py-3 text-gray-500" colSpan={4}>No completed payments.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;
