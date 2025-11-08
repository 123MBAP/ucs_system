import { useEffect, useState } from 'react';
import type { SVGProps } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from 'src/lib/i18n';

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
  Back: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} className={`w-4 h-4 ${props.className ?? ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Zone: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} className={`w-5 h-5 ${props.className ?? ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.447-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  Location: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} className={`w-4 h-4 ${props.className ?? ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Clients: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} className={`w-4 h-4 ${props.className ?? ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Chief: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} className={`w-4 h-4 ${props.className ?? ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Supervisor: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} className={`w-4 h-4 ${props.className ?? ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Arrow: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} className={`w-4 h-4 ${props.className ?? ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
};

const Zones = () => {
  const { t } = useI18n();
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-700 hover:text-amber-700 transition-colors duration-200"
            >
              <Icons.Back />
              <span className="font-medium">{t('zones.back')}</span>
            </button>
            <div className="w-px h-6 bg-gray-300"></div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-amber-600 bg-clip-text text-transparent">
                {t('zones.title')}
              </h1>
              <p className="text-gray-600 mt-1">{t('zones.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
            <span>{t('zones.activeCount', { count: zones.length, plural: zones.length !== 1 ? 's' : '' })}</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center space-x-2 text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Zones */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/80 rounded-2xl shadow-md border border-amber-100 p-6 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="group bg-white rounded-2xl shadow-md border border-amber-100 p-6 hover:shadow-lg hover:border-amber-400 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-1"></div>
                    <h3 className="text-xl font-bold text-gray-800">{zone.zone_name}</h3>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow">
                    <Icons.Zone />
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-gray-600 mb-3">
                  <Icons.Location />
                  <span className="text-sm">{zone.cell}, {zone.village}</span>
                </div>

                <p className="text-gray-700 text-sm mb-4 line-clamp-2">{zone.description}</p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Icons.Clients />
                      <span className="text-sm font-medium">{t('zones.stats.activeClients')}</span>
                    </div>
                    <span className="font-bold text-gray-800">{zone.client_count}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Icons.Chief />
                      <span className="text-sm font-medium">{t('zones.stats.zoneChief')}</span>
                    </div>
                    <span className={`font-semibold ${zone.chief_username ? 'text-gray-800' : 'text-amber-700'}`}>
                      {zone.chief_username ?? t('zones.unassigned')}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/zones/${zone.id}`}
                  className="flex items-center justify-center space-x-2 w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl font-semibold transition-all duration-200 border border-amber-200 hover:border-amber-400"
                >
                  <span>{t('zones.viewDetails')}</span>
                  <Icons.Arrow />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Zones;
