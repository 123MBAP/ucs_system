import { useEffect, useState } from 'react';
import type { SVGProps } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_URL as string;

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

// Icon components
const Icons = {
  Back: (props: SVGProps<SVGSVGElement>) => <svg {...props} className={`w-4 h-4 ${props.className ?? ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>,
  Zone: (props: SVGProps<SVGSVGElement>) => <svg {...props} className={`w-5 h-5 ${props.className ?? ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.447-.894L15 4m0 13V4m0 0L9 7" /></svg>,
  Location: (props: SVGProps<SVGSVGElement>) => <svg {...props} className={`w-4 h-4 ${props.className ?? ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Clients: (props: SVGProps<SVGSVGElement>) => <svg {...props} className={`w-4 h-4 ${props.className ?? ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Chief: (props: SVGProps<SVGSVGElement>) => <svg {...props} className={`w-4 h-4 ${props.className ?? ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Supervisor: (props: SVGProps<SVGSVGElement>) => <svg {...props} className={`w-4 h-4 ${props.className ?? ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Arrow: (props: SVGProps<SVGSVGElement>) => <svg {...props} className={`w-4 h-4 ${props.className ?? ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors duration-200"
            >
              <Icons.Back />
              <span className="font-medium">Back</span>
            </button>
            <div className="w-px h-6 bg-slate-300"></div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">
                Zones Management
              </h1>
              <p className="text-slate-600 mt-1">Manage and monitor all operational zones</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>{zones.length} zone{zones.length !== 1 ? 's' : ''} active</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-2">
                    <div className="h-6 bg-slate-200 rounded w-32"></div>
                    <div className="h-4 bg-slate-200 rounded w-24"></div>
                  </div>
                  <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded"></div>
                  <div className="h-4 bg-slate-200 rounded w-4/5"></div>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="h-3 bg-slate-200 rounded w-16"></div>
                    <div className="h-3 bg-slate-200 rounded w-8"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-3 bg-slate-200 rounded w-20"></div>
                    <div className="h-3 bg-slate-200 rounded w-16"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-3 bg-slate-200 rounded w-16"></div>
                    <div className="h-3 bg-slate-200 rounded w-12"></div>
                  </div>
                </div>
                <div className="h-10 bg-slate-200 rounded-xl mt-4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zones.map((zone) => (
              <div 
                key={zone.id} 
                className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Zone Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Zone</span>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                        #{zone.id}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">{zone.zone_name}</h3>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Icons.Zone />
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center space-x-2 text-slate-600 mb-3">
                  <Icons.Location />
                  <span className="text-sm">{zone.cell}, {zone.village}</span>
                </div>

                {/* Description */}
                <p className="text-slate-700 text-sm mb-4 line-clamp-2">{zone.description}</p>

                {/* Stats */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Icons.Clients />
                      <span className="text-sm font-medium">Active Clients</span>
                    </div>
                    <span className="font-bold text-slate-800">{zone.client_count}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Icons.Chief />
                      <span className="text-sm font-medium">Zone Chief</span>
                    </div>
                    <span className={`font-semibold ${zone.chief_username ? 'text-slate-800' : 'text-orange-600'}`}>
                      {zone.chief_username ?? 'Unassigned'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Icons.Supervisor />
                      <span className="text-sm font-medium">Supervisor</span>
                    </div>
                    <span className="text-slate-500 text-sm">Not assigned</span>
                  </div>
                </div>

                {/* Action */}
                <Link 
                  to={`/zones/${zone.id}`}
                  className="flex items-center justify-center space-x-2 w-full py-3 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-xl font-semibold transition-all duration-200 border border-slate-200 hover:border-blue-200 group-hover:shadow-md"
                >
                  <span>View Zone Details</span>
                  <Icons.Arrow />
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && zones.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Icons.Zone className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No zones found</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              There are no zones currently available. Zones will appear here once they are created and activated in the system.
            </p>
          </div>
        )}

        {/* Quick Stats */}
        {!loading && zones.length > 0 && (
          <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Zones Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-slate-800">{zones.length}</div>
                <div className="text-xs text-slate-600 uppercase tracking-wide mt-1">Total Zones</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">
                  {zones.filter(z => z.chief_username).length}
                </div>
                <div className="text-xs text-slate-600 uppercase tracking-wide mt-1">Zones with Chief</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">
                  {zones.reduce((sum, zone) => sum + zone.client_count, 0)}
                </div>
                <div className="text-xs text-slate-600 uppercase tracking-wide mt-1">Total Clients</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">
                  {Math.round(zones.reduce((sum, zone) => sum + zone.client_count, 0) / zones.length) || 0}
                </div>
                <div className="text-xs text-slate-600 uppercase tracking-wide mt-1">Avg Clients/Zone</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Zones;