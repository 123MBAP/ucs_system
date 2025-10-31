import { useEffect, useState } from 'react';

const apiBase = import.meta.env.VITE_API_URL as string;

type ChiefSummary = {
  chiefName: string | null;
  zoneName: string | null;
  zones: { id: number; name: string }[];
  clientsTotal: number;
  amountTotal: number;
  amountPaid: number;
  amountRemaining: number;
  clientsPaid: number;
  clientsRemaining: number;
  todayPayments: number;
  period: { year: number; month: number };
};

const ChiefDashboard = () => {
  const [data, setData] = useState<ChiefSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/chief/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || 'Failed to load');
        setData(d);
      })
      .catch((e: any) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const chiefName = data?.chiefName || '-';
  const zoneName = data?.zoneName || (data?.zones?.length ? 'Multiple Zones' : '-');
  const clientsTotal = data?.clientsTotal || 0;
  const amountTotal = data?.amountTotal || 0;
  const amountPaid = data?.amountPaid || 0;
  const amountRemaining = data?.amountRemaining ?? Math.max(0, amountTotal - amountPaid);
  const clientsPaid = data?.clientsPaid || 0;
  const clientsRemaining = data?.clientsRemaining ?? Math.max(0, clientsTotal - clientsPaid);
  const todayPayments = data?.todayPayments || 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chief of Zone Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Overview for chief and zone</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Chief</p>
          <p className="text-lg font-semibold text-gray-900">{chiefName}</p>
          <p className="text-sm text-gray-500 mt-2">Zone</p>
          <p className="text-lg font-semibold text-gray-900">{zoneName}</p>
        </div>
      </div>

      {error && <div className="text-red-600">{error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Number of Clients</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{clientsTotal.toLocaleString()}</p>
              </div>
              <div className="text-3xl">👥</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount To Be Paid</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{amountTotal.toLocaleString()}</p>
              </div>
              <div className="text-3xl">💼</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Amount Paid</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{amountPaid.toLocaleString()}</p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Remaining Amount</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{amountRemaining.toLocaleString()}</p>
              </div>
              <div className="text-3xl">🧮</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clients Paid</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{clientsPaid.toLocaleString()}</p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clients Remaining</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{clientsRemaining.toLocaleString()}</p>
              </div>
              <div className="text-3xl">⏳</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Payments</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{todayPayments.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">Payments received today</p>
              </div>
              <div className="text-3xl">📅</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChiefDashboard;
