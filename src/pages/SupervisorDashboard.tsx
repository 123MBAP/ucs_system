import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_URL as string;

type Zone = {
  id: number;
  zone_name: string;
  chief_username: string | null;
  client_count: number;
};

// Icon components matching the dashboard style
const Icons = {
  Zone: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.447-.894L15 4m0 13V4m0 0L9 7" /></svg>,
  Chief: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Clients: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Arrow: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
  TrendUp: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
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

  // Calculate stats for the header cards
  const totalClients = zones.reduce((sum, zone) => sum + zone.client_count, 0);
  const zonesWithChief = zones.filter(z => z.chief_username).length;
  const avgClientsPerZone = zones.length > 0 ? Math.round(totalClients / zones.length) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">
            Zone Supervision
          </h1>
          <p className="text-slate-600 mt-2">Manage your assigned zones and oversee operations</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>All Systems Operational</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-2">Total Zones</p>
              <p className="text-3xl font-bold text-slate-900">{loading ? '...' : zones.length}</p>
              <p className="text-sm text-slate-500 mt-1">Assigned to you</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
              <Icons.Zone />
            </div>
          </div>
        </div>

        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-2">Active Chiefs</p>
              <p className="text-3xl font-bold text-slate-900">{loading ? '...' : zonesWithChief}</p>
              <div className="flex items-center mt-1">
                <div className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  <Icons.TrendUp />
                  <span className="ml-1">Active</span>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
              <Icons.Chief />
            </div>
          </div>
        </div>

        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-2">Total Clients</p>
              <p className="text-3xl font-bold text-slate-900">{loading ? '...' : totalClients.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Across all zones</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
              <Icons.Clients />
            </div>
          </div>
        </div>

        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-2">Avg per Zone</p>
              <p className="text-3xl font-bold text-slate-900">{loading ? '...' : avgClientsPerZone}</p>
              <p className="text-sm text-slate-500 mt-1">Clients per zone</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
              <Icons.Clients />
            </div>
          </div>
        </div>
      </div>

      {/* Zones Grid */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Your Zones</h2>
            <p className="text-slate-600 mt-1">Manage and supervise your assigned zones</p>
          </div>
          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            <span className="text-sm text-slate-500">
              {zones.length} zone{zones.length !== 1 ? 's' : ''} assigned
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-2 text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-slate-100 rounded-xl p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-300 rounded w-20"></div>
                    <div className="h-6 bg-slate-300 rounded w-32"></div>
                  </div>
                  <div className="w-12 h-12 bg-slate-300 rounded-xl"></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-slate-300 rounded w-16"></div>
                    <div className="h-4 bg-slate-300 rounded w-20"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-slate-300 rounded w-16"></div>
                    <div className="h-4 bg-slate-300 rounded w-8"></div>
                  </div>
                </div>
                <div className="h-10 bg-slate-300 rounded-lg mt-4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zones.map(zone => (
              <div key={zone.id} className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                {/* Zone Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Zone</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">{zone.zone_name}</h3>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Icons.Zone />
                  </div>
                </div>

                {/* Zone Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Icons.Chief />
                      <span className="font-medium">Zone Chief</span>
                    </div>
                    <span className={`font-semibold ${zone.chief_username ? 'text-slate-800' : 'text-orange-600'}`}>
                      {zone.chief_username || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Icons.Clients />
                      <span className="font-medium">Active Clients</span>
                    </div>
                    <span className="text-lg font-bold text-slate-800">{zone.client_count}</span>
                  </div>
                </div>

                {/* Action */}
                <Link 
                  to={`/supervisor/zones/${zone.id}/supervision`}
                  className="flex items-center justify-center space-x-2 w-full py-3 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-xl font-semibold transition-all duration-200 border border-slate-200 hover:border-blue-200 group-hover:shadow-md"
                >
                  <span>Manage Zone</span>
                  <Icons.Arrow />
                </Link>
              </div>
            ))}
            
            {/* Empty State */}
            {!zones.length && !loading && (
              <div className="col-span-full text-center py-12">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icons.Zone />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No zones assigned</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  You haven't been assigned to any zones yet. Please contact your administrator to get started with zone supervision.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorDashboard;