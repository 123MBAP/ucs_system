import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_URL as string;

type Zone = {
  id: number;
  zone_name: string;
  chief_username: string | null;
  client_count: number;
};

const SupervisorDashboard = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/supervisor/zones`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load zones');
        setZones(Array.isArray(data.zones) ? data.zones : []);
      })
      .catch((e: any) => setError(e?.message || 'Failed to load zones'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Your Zones</h2>
        {error && <div className="text-red-600 mb-3">{error}</div>}
        {loading ? (
          <div>Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {zones.map(z => (
              <div key={z.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Zone</p>
                    <p className="text-lg font-semibold text-gray-900">{z.zone_name}</p>
                  </div>
                  <div className="text-2xl">🗺️</div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Chief</span>
                    <span className="text-sm font-medium text-gray-900">{z.chief_username || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Clients</span>
                    <span className="text-sm font-medium text-gray-900">{z.client_count}</span>
                  </div>
                  <div className="pt-3">
                    <Link to={`/supervisor/zones/${z.id}/supervision`} className="text-blue-600 underline text-sm">Manage zone</Link>
                  </div>
                </div>
              </div>
            ))}
            {!zones.length && <div className="text-gray-500">No zones assigned.</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorDashboard;
