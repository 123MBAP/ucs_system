import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const apiBase = 'http://localhost:4000';

type Zone = {
  id: number;
  zone_name: string;
  cell: string;
  village: string;
  description: string;
  chief_username: string | null;
  client_count: number;
};

type Payments = {
  amountToBePaid: number | null;
  currentMonthPaid: number | null;
  todayPaid: number | null;
};

const ZoneDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [zone, setZone] = useState<Zone | null>(null);
  const [payments, setPayments] = useState<Payments>({ amountToBePaid: null, currentMonthPaid: null, todayPaid: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/zones/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load zone');
        setZone(data.zone);
        setPayments(data.payments || { amountToBePaid: null, currentMonthPaid: null, todayPaid: null });
      })
      .catch((e: any) => setError(e?.message || 'Failed to load zone'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!zone) return <div className="p-6">Zone not found.</div>;

  return (
    <div className="p-6 space-y-4">
      <div>
        <button onClick={() => navigate(-1)} className="text-blue-600 underline text-sm">← Back</button>
      </div>
      <div className="bg-white rounded shadow p-4 border">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{zone.zone_name}</h2>
          <span className="text-sm text-gray-500">Zone #{zone.id}</span>
        </div>
        <div className="text-sm text-gray-600 mt-2">{zone.cell}, {zone.village}</div>
        <div className="text-sm text-gray-700 mt-2">{zone.description}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded shadow p-4 border">
          <div className="text-sm text-gray-500">Chief of the Zone</div>
          <div className="text-xl font-semibold">{zone.chief_username ?? 'Unassigned'}</div>
        </div>
        <div className="bg-white rounded shadow p-4 border">
          <div className="text-sm text-gray-500">Clients</div>
          <div className="text-xl font-semibold">{zone.client_count}</div>
        </div>
        <div className="bg-white rounded shadow p-4 border">
          <div className="text-sm text-gray-500">Amount To Be Paid</div>
          <div className="text-xl font-semibold">{payments.amountToBePaid != null ? `$${payments.amountToBePaid}` : 'N/A'}</div>
        </div>
        <div className="bg-white rounded shadow p-4 border">
          <div className="text-sm text-gray-500">Current Month Paid</div>
          <div className="text-xl font-semibold">{payments.currentMonthPaid != null ? `$${payments.currentMonthPaid}` : 'N/A'}</div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 border">
        <div className="text-sm text-gray-500">Today's Payments</div>
        <div className="text-xl font-semibold">{payments.todayPaid != null ? `$${payments.todayPaid}` : 'N/A'}</div>
      </div>

      {/* Zone Management (collapsible) */}
      <div className="bg-white rounded shadow p-4 border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Zone Management</h3>
          <button
            onClick={() => setManageOpen(o => !o)}
            className="text-blue-600 underline text-sm"
          >
            {manageOpen ? 'Hide' : 'Manage this zone'}
          </button>
        </div>
        {manageOpen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              className="px-4 py-2 border rounded hover:bg-gray-50 text-sm"
              onClick={() => navigate(`/register-supervisor?zoneId=${id}&reassign=1`)}
            >
              Reassign Supervisor
            </button>
            <button
              className="px-4 py-2 border rounded hover:bg-gray-50 text-sm"
              onClick={() => navigate(`/register-chief?zoneId=${id}&reassign=1`)}
            >
              Reassign Chief of Zone
            </button>
            <button
              className="px-4 py-2 border rounded hover:bg-gray-50 text-sm"
              onClick={() => navigate(`/register-client?zoneId=${id}`)}
            >
              Add Client
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZoneDetail;
