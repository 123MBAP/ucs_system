import { useEffect, useState } from 'react';
import { User, MapPinned, Wallet } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-zinc-800 to-indigo-600 bg-clip-text text-transparent">Manpower Dashboard</h1>
          <p className="text-zinc-600 mt-2">Your assignment and payroll overview</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0 text-sm text-zinc-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Profile Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-600">Name</div>
              <div className="text-2xl font-bold text-zinc-900 mt-1">{loading ? '…' : info.name || '-'}</div>
            </div>
            <div className="shrink-0 p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <User className="h-8 w-8" />
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-600">Assigned Zone</div>
              <div className="text-2xl font-bold text-zinc-900 mt-1">{loading ? '…' : info.zone ?? 'Not assigned'}</div>
            </div>
            <div className="shrink-0 p-2 rounded-lg bg-amber-50 text-amber-600">
              <MapPinned className="h-8 w-8" />
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-600">Salary</div>
              <div className="text-2xl font-bold text-zinc-900 mt-1">{loading ? '…' : (info.salary != null ? `$${info.salary}` : 'Not set')}</div>
            </div>
            <div className="shrink-0 p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Wallet className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManpowerDashboard;
