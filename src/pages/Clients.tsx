import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_URL as string;

type ZoneRow = {
  id: number;
  zone_name: string;
  cell: string;
  village: string;
  chief_username: string | null;
  client_count: number;
};

type ClientRow = {
  id: number;
  username: string;
  name: { first?: string; last?: string } | null;
  zone_id: number;
  phone_number: string;
  monthly_amount?: number | null;
  created_at: string;
};

const Clients = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [rows, setRows] = useState<ZoneRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams(location.search);
    const scope = params.get('scope');
    const filter = params.get('filter') || 'all';

    if (scope === 'chief') {
      const qs = `?filter=${encodeURIComponent(filter)}`;
      fetch(`${apiBase}/api/chief/clients${qs}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async r => {
          const data = await r.json();
          if (!r.ok) throw new Error(data?.error || 'Failed to load clients');
          setClients(Array.isArray(data.clients) ? data.clients : []);
        })
        .catch((e: any) => setError(e?.message || 'Failed to load'))
        .finally(() => setLoading(false));
      return;
    }

    const qs = scope ? `?scope=${encodeURIComponent(scope)}` : '';
    fetch(`${apiBase}/api/zones${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load');
        const mapped: ZoneRow[] = (data.zones || []).map((z: any) => ({
          id: z.id,
          zone_name: z.zone_name,
          cell: z.cell,
          village: z.village,
          chief_username: z.chief_username ?? null,
          client_count: Number(z.client_count || 0)
        }));
        setRows(mapped);
      })
      .catch((e: any) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [location.search]);

  return (
    <div className="p-6">
      <div className="mb-2">
        <button onClick={() => navigate(-1)} className="text-blue-600 underline text-sm">← Back</button>
      </div>
      <h2 className="text-2xl font-bold mb-4">Clients</h2>
      {error && <div className="text-red-600 mb-3">{error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          {clients.length ? (
            <div className="overflow-x-auto bg-white border rounded shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map(c => {
                    const fullName = c.name ? `${c.name.first || ''} ${c.name.last || ''}`.trim() : '';
                    return (
                      <tr key={c.id}>
                        <td className="px-3 py-2">{fullName || c.username}</td>
                        <td className="px-3 py-2">{c.username}</td>
                        <td className="px-3 py-2">{c.phone_number}</td>
                        <td className="px-3 py-2">{c.monthly_amount != null ? Number(c.monthly_amount).toLocaleString() : '-'}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => setSelectedClient(c)}
                            className="px-2 py-1 text-sm bg-blue-600 text-white rounded"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!clients.length && (
                    <tr><td className="px-3 py-4 text-gray-600" colSpan={4}>No clients.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map(r => (
                <div key={r.id} className="bg-white rounded shadow p-4 border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">{r.zone_name}</h3>
                    <span className="text-sm text-gray-500">#{r.id}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{r.cell}, {r.village}</div>
                  <div className="mt-2 space-y-1">
                    <div>
                      <span className="text-gray-500 text-sm">Chief of the Zone:</span>
                      <span className="ml-2 font-medium">{r.chief_username || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">Clients:</span>
                      <span className="ml-2 font-medium">{r.client_count}</span>
                    </div>
                    <div className="pt-2 flex items-center gap-4">
                      <Link to={`/zones/${r.id}`} className="text-blue-600 underline text-sm">Go to zone</Link>
                      <Link to={`/zones/${r.id}/clients`} className="text-blue-600 underline text-sm">Manage zone clients</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Make Payment card when a client is selected */}
          {selectedClient && (
            <div className="mt-4 bg-white border rounded shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Make Payment</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    For client: <span className="font-medium">{(selectedClient.name ? `${selectedClient.name.first || ''} ${selectedClient.name.last || ''}`.trim() : '') || selectedClient.username}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >Clear</button>
              </div>
              <div className="mt-3">
                <Link
                  to={`/payments?scope=chief&clientId=${encodeURIComponent(String(selectedClient.id))}&clientName=${encodeURIComponent(((selectedClient.name ? `${selectedClient.name.first || ''} ${selectedClient.name.last || ''}`.trim() : '') || selectedClient.username))}`}
                  className="inline-flex items-center px-4 py-2 rounded font-semibold text-black"
                  style={{ backgroundColor: '#FFCB05' }}
                >
                  Proceed to Payment
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Clients;
