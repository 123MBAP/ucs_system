import { useEffect, useState } from 'react';
import { User, Car, Wallet, MapPinned } from 'lucide-react';

const apiBase = import.meta.env.VITE_API_URL as string;

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-zinc-800 to-indigo-600 bg-clip-text text-transparent">Driver Dashboard</h1>
          <p className="text-zinc-600 mt-2">Your vehicle assignment and routes overview</p>
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
              <div className="text-sm font-semibold text-zinc-600">Assigned Car (Plate)</div>
              <div className="text-2xl font-bold text-zinc-900 mt-1">{loading ? '…' : info.plateNumber ?? 'Not assigned'}</div>
            </div>
            <div className="shrink-0 p-2 rounded-lg bg-amber-50 text-amber-600">
              <Car className="h-8 w-8" />
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

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <MapPinned className="h-5 w-5 text-indigo-600" />
            <div className="text-sm font-semibold text-zinc-700">Assigned Zones</div>
          </div>
        </div>
        {loading ? '…' : (
          info.zones.length ? (
            <ul className="list-disc pl-6 text-zinc-800">
              {info.zones.map((z, i) => (<li key={i}>{z}</li>))}
            </ul>
          ) : (
            <div className="text-zinc-600">None</div>
          )
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
