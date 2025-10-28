import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const apiBase = 'http://localhost:4000';

type Zone = {
  id: number;
  zone_name: string;
  cell: string;
  village: string;
  description: string;
  assigned_chief: number | null;
  chief_username: string | null;
  client_count: number;
};

const Zones = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/zones`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load zones');
        setZones(Array.isArray(data.zones) ? data.zones : []);
      })
      .catch((e: any) => setError(e?.message || 'Failed to load zones'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="mb-2">
        <button onClick={() => navigate(-1)} className="text-blue-600 underline text-sm">← Back</button>
      </div>
      <h2 className="text-2xl font-bold mb-4">Zones</h2>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((z) => (
            <div key={z.id} className="bg-white rounded shadow p-4 border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{z.zone_name}</h3>
                <span className="text-sm text-gray-500">#{z.id}</span>
              </div>
              <div className="text-sm text-gray-600 mb-2">{z.cell}, {z.village}</div>
              <div className="text-sm text-gray-700 mb-2">{z.description}</div>
              <div className="mt-3 space-y-1">
                <div>
                  <span className="text-gray-500 text-sm">Clients:</span>
                  <span className="ml-2 font-medium">{z.client_count}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Chief of the Zone:</span>
                  <span className="ml-2 font-medium">{z.chief_username ?? 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Supervisor:</span>
                  <span className="ml-2 font-medium">{/* TODO: populate when schema exists */}Not set</span>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <Link to={`/zones/${z.id}`} className="text-blue-600 underline text-sm">Go to zone</Link>
                  <Link to={`/zones/${z.id}/manpower`} className="text-blue-600 underline text-sm">Manage zone manpower</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Zones;
