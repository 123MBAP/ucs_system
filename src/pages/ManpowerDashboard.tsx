import { useEffect, useState } from 'react';

const apiBase = import.meta.env.VITE_API_URL as string;

type Me = { id: number; username: string; role: string | null };

type ManpowerInfo = {
  name: string;
  zone: string | null;
  salary: number | null;
};

const ManpowerDashboard = () => {
  const [, setMe] = useState<Me | null>(null);
  const [info, setInfo] = useState<ManpowerInfo>({ name: '', zone: null, salary: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    fetch(`${apiBase}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load profile');
        setMe(data.user);
        setInfo(prev => ({
          ...prev,
          name: data?.user?.username || '',
          // TODO: replace nulls when schema/endpoints for manpower profile are available
          zone: prev.zone,
          salary: prev.salary,
        }));
      })
      .catch(err => console.error('Load manpower profile error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Manpower Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Name</div>
          <div className="text-xl font-semibold">{loading ? '…' : info.name || '-'}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Assigned Zone</div>
          <div className="text-xl font-semibold">{loading ? '…' : info.zone ?? 'Not assigned'}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Salary</div>
          <div className="text-xl font-semibold">{loading ? '…' : (info.salary != null ? `$${info.salary}` : 'Not set')}</div>
        </div>
      </div>
    </div>
  );
};

export default ManpowerDashboard;
