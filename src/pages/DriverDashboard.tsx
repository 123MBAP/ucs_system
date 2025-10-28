import { useEffect, useState } from 'react';

const apiBase = 'http://localhost:4000';

type DriverInfo = {
  name: string;
  plateNumber: string | null;
  salary: number | null;
  zones: string[];
};

const DriverDashboard = () => {
  const [info, setInfo] = useState<DriverInfo>({ name: '', plateNumber: null, salary: null, zones: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    fetch(`${apiBase}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load profile');
        setInfo(prev => ({
          ...prev,
          name: data?.user?.username || '',
          // TODO: populate from real endpoints when schema for drivers/cars/zones is available
          plateNumber: prev.plateNumber,
          salary: prev.salary,
          zones: prev.zones,
        }));
      })
      .catch(err => console.error('Load driver profile error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Driver Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Name</div>
          <div className="text-xl font-semibold">{loading ? '…' : info.name || '-'}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Assigned Car (Plate)</div>
          <div className="text-xl font-semibold">{loading ? '…' : info.plateNumber ?? 'Not assigned'}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Salary</div>
          <div className="text-xl font-semibold">{loading ? '…' : (info.salary != null ? `$${info.salary}` : 'Not set')}</div>
        </div>
      </div>
      <div className="bg-white p-4 rounded shadow mt-4">
        <div className="text-sm text-gray-500 mb-2">Assigned Zones</div>
        {loading ? '…' : (
          info.zones.length ? (
            <ul className="list-disc pl-6">
              {info.zones.map((z, i) => (<li key={i}>{z}</li>))}
            </ul>
          ) : (
            <div>None</div>
          )
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
