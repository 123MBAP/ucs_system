import { useEffect, useMemo, useState } from 'react';
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
  const paramsObj = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const selectedClientId = paramsObj.get('clientId');
  const selectedClientName = paramsObj.get('clientName');

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
    const base = `Pay for ${month}`;
    const withClient = selectedClientName ? `${base} — ${selectedClientName}` : base;
    setPurpose(withClient);
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
      body: JSON.stringify({
        amount: Number(amount),
        phoneNumber: phone,
        purpose: purpose || undefined,
        clientId: selectedClientId ? Number(selectedClientId) : undefined,
      })
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">Payments</h1>
          <p className="text-slate-600 mt-2">Initiate mobile money payments and track transactions</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0 text-sm text-slate-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Service Available</span>
        </div>
      </div>

      {/* Selected client notice */}
      {selectedClientName && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          Paying for client: <span className="font-semibold">{selectedClientName}</span>
        </div>
      )}
      {/* Error and loading states */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}
      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600">Loading…</div>
      )}

      {/* Initiate Payment Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-800">Initiate Payment</h3>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-xl text-black font-semibold" style={{ backgroundColor: '#FFCB05' }}>MTN MoMo</div>
            <span className="text-sm text-slate-600">You will pay using MTN Mobile Money</span>
          </div>
        </div>
        <form onSubmit={initiate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Amount</label>
            <input type="number" min="0" step="0.01" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
            <input className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">Purpose</label>
              <button type="button" onClick={() => setPurposeEdit(v => !v)} className="text-sm text-blue-600 underline">
                {purposeEdit ? 'Done' : 'Edit'}
              </button>
            </div>
            <input
              className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              readOnly={!purposeEdit}
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <button type="submit" className="w-full px-4 py-2 rounded-xl font-semibold text-black hover:brightness-95 transition-all duration-200 shadow-sm" style={{ backgroundColor: '#FFCB05' }}>Initiate MTN MoMo Payment</button>
          </div>
        </form>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Pending Transactions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {pending.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">{p.id}</td>
                    <td className="px-3 py-2">{p.client_username || p.client_id}</td>
                    <td className="px-3 py-2">{p.amount} {p.currency}</td>
                    <td className="px-3 py-2">{p.phone_number}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => complete(p.id)} className="px-2 py-1 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">Mark Completed</button>
                    </td>
                  </tr>
                ))}
                {!pending.length && (
                  <tr><td className="px-3 py-3 text-slate-500" colSpan={5}>No pending transactions.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Completed Payments</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {completed.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">{r.id}</td>
                    <td className="px-3 py-2">{r.client_username || r.client_id}</td>
                    <td className="px-3 py-2">{r.amount} {r.currency}</td>
                    <td className="px-3 py-2">{r.status}</td>
                  </tr>
                ))}
                {!completed.length && (
                  <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>No completed payments.</td></tr>
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
