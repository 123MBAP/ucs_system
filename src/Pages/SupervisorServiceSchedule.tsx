import { useEffect, useMemo, useState, type SVGProps } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_URL as string;

type Vehicle = { id: number; plate: string };
type Driver = { id: number; username: string; first_name?: string | null; last_name?: string | null; full_name?: string | null; vehicle_id?: number | null };

type ScheduleEntry = {
  id: number;
  zone_id: number;
  supervisor_id: number;
  vehicle_id: number;
  driver_id: number | null;
  service_day: number;
  service_start: string;
  service_end: string;
  assigned_manpower_ids: number[];
  created_at: string;
};

// Enhanced Color Scheme
const colors = {
  primary: '#D97706',
  primaryLight: '#FBBF24',
  primaryHover: '#B45309',
  accent: '#15803D',
  accentLight: '#22C55E',
  accentHover: '#166534',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  text: '#0F172A',
  textLight: '#64748B',
  textLighter: '#94A3B8',
  error: '#DC2626',
  errorLight: '#FEF2F2',
  success: '#15803D',
  warning: '#D97706'
};

// Enhanced Icon components with better sizing
const Icons = {
  Back: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Calendar: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Vehicle: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Driver: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Time: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Manpower: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Delete: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Add: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Filter: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
    </svg>
  ),
  Search: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
};

// Enhanced UI Components
const SectionHeader = ({ title, number, subtitle }: { title: string; number: number; subtitle?: string }) => (
  <div className="mb-8">
    <div className="flex items-center gap-4 mb-3">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl text-white font-bold text-lg shadow-lg" style={{ backgroundColor: colors.primary }}>
        {number}
      </div>
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold" style={{ color: colors.text }}>{title}</h2>
        {subtitle && <p className="text-sm mt-1" style={{ color: colors.textLight }}>{subtitle}</p>}
      </div>
    </div>
    <div className="h-px w-full" style={{ backgroundColor: colors.borderLight }}></div>
  </div>
);

const Card = ({ children, className = '', padding = 'p-6' }: { children: React.ReactNode; className?: string; padding?: string }) => (
  <div className={`rounded-2xl shadow-sm border transition-all duration-300 hover:shadow-md ${padding} ${className}`} style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
    {children}
  </div>
);

const PrimaryButton = ({ children, onClick, disabled = false, loading = false, size = 'md', className = '' }: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-95 ${sizes[size]} ${className}`}
      style={{ 
        backgroundColor: disabled ? colors.textLighter : colors.primary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1
      }}
      onMouseOver={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = colors.primaryHover;
        }
      }}
      onMouseOut={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = colors.primary;
        }
      }}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      )}
      {children}
    </button>
  );
};

const FilterChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
      active ? 'text-white shadow-md' : 'hover:shadow-sm'
    }`}
    style={
      active ? {
        backgroundColor: colors.primary,
        borderColor: colors.primary
      } : {
        backgroundColor: colors.cardBg,
        color: colors.textLight,
        borderColor: colors.border
      }
    }
  >
    {label}
  </button>
);

export default function SupervisorServiceSchedule() {
  const { id } = useParams();
  const zoneId = Number(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [zoneName, setZoneName] = useState<string>('');
  // Maps derived from supervision data
  const [vehicleDriverMap, setVehicleDriverMap] = useState<Map<number, number | null>>(new Map());
  const [vehicleDriverNameMap, setVehicleDriverNameMap] = useState<Map<number, string>>(new Map());
  const [vehicleManpowerMap, setVehicleManpowerMap] = useState<Map<number, { ids: number[]; names: string[] }>>(new Map());
  const [manpowerNameById, setManpowerNameById] = useState<Map<number, string>>(new Map());

  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [savedDays, setSavedDays] = useState<number[]>([]);

  const [dayMode, setDayMode] = useState<'saved' | 'special'>('saved');
  const [serviceDaySaved, setServiceDaySaved] = useState<string>('');
  const [serviceDaySpecial, setServiceDaySpecial] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [start, setStart] = useState<string>('08:00');
  const [end, setEnd] = useState<string>('17:00');
  const [selectedManpower, setSelectedManpower] = useState<number[]>([]);
  const [overrideOpen, setOverrideOpen] = useState<boolean>(false);

  // Enhanced filtering and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDay, setFilterDay] = useState<number | 'all'>('all');
  const [filterVehicle] = useState<number | 'all'>('all');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const displayName = (u: { username: string; first_name?: string | null; last_name?: string | null; full_name?: string | null }) => {
    const fn = `${u.first_name ? u.first_name : ''} ${u.last_name ? u.last_name : ''}`.trim();
    return fn || u.full_name || u.username;
  };

  useEffect(() => {
    if (!Number.isFinite(zoneId)) return;
    if (!token) return;
    setLoading(true);
    setError(null);
    
    Promise.all([
      fetch(`${apiBase}/api/supervisor/zones/${zoneId}/supervision`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/supervisor/zones/${zoneId}/schedule`, { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(async ([zr, sr]) => {
        const zdata = await zr.json();
        const sdata = await sr.json();
        if (!zr.ok) throw new Error(zdata?.error || 'Failed to load zone data');
        if (!sr.ok) throw new Error(sdata?.error || 'Failed to load schedule');
        setZoneName(zdata?.zone?.name || '');
        setVehicles((zdata?.vehicles || []).map((v: any) => ({ id: Number(v.id), plate: String(v.plate) })));
        setDrivers((zdata?.drivers || []).map((d: any) => ({ id: Number(d.id), username: String(d.username), first_name: d.first_name ?? null, last_name: d.last_name ?? null, full_name: d.full_name ?? null, vehicle_id: d.vehicle_id ?? null })));
        const mpName = new Map<number, string>();
        (zdata?.manpower || []).forEach((m: any) => {
          mpName.set(Number(m.id), displayName(m));
        });
        setManpowerNameById(mpName);
        // Build vehicle -> driver map and names
        const vDr = new Map<number, number | null>();
        const vDrName = new Map<number, string>();
        (zdata?.vehicles || []).forEach((v: any) => {
          const dr = (zdata?.drivers || []).find((d: any) => Number(d.vehicle_id) === Number(v.id));
          vDr.set(Number(v.id), dr ? Number(dr.id) : null);
          const fn = `${dr?.first_name ? dr.first_name : ''} ${dr?.last_name ? dr.last_name : ''}`.trim();
          vDrName.set(Number(v.id), fn || dr?.full_name || dr?.username || 'None assigned');
        });
        setVehicleDriverMap(vDr);
        setVehicleDriverNameMap(vDrName);
        // Build vehicle -> manpower list map
        const vMp = new Map<number, { ids: number[]; names: string[] }>();
        (zdata?.vehicles || []).forEach((v: any) => {
          const arr = Array.isArray(v.assigned_manpower_users) ? v.assigned_manpower_users : [];
          const ids = arr.map((u: any) => Number(u.id));
          const names = arr.map((u: any) => displayName(u));
          vMp.set(Number(v.id), { ids, names });
        });
        setVehicleManpowerMap(vMp);
        setSchedule((sdata?.schedule || []));
        const days: number[] = Array.isArray(zdata?.serviceDays) ? zdata.serviceDays.map((n: any) => Number(n)).filter((n: any) => Number.isFinite(n)) : [];
        setSavedDays(days);
        if (days.length) {
          setDayMode('saved');
          setServiceDaySaved(String(days[0]));
        } else {
          setDayMode('special');
          setServiceDaySpecial('1');
        }
      })
      .catch((e: any) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [zoneId, token]);

  async function addEntry() {
    if (!token) return;
    setError(null);
    const chosenDay = dayMode === 'saved' ? serviceDaySaved : serviceDaySpecial;
    if (!chosenDay || !vehicleId) {
      setError('Please select service day and vehicle');
      return;
    }
    const body = {
      service_day: Number(chosenDay),
      vehicle_id: Number(vehicleId),
      driver_id: driverId ? Number(driverId) : null,
      service_start: toPgTime(start),
      service_end: toPgTime(end),
      assigned_manpower_ids: selectedManpower,
    };
    const res = await fetch(`${apiBase}/api/supervisor/zones/${zoneId}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || 'Failed to create entry');
      return;
    }
    setSchedule(prev => [...prev, data.entry]);
    // Reset form but keep day mode and times
    setVehicleId('');
    setDriverId('');
    setSelectedManpower([]);
  }

  async function deleteEntry(entryId: number) {
    if (!token) return;
    const res = await fetch(`${apiBase}/api/supervisor/zones/${zoneId}/schedule/${entryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Failed to delete entry');
      return;
    }
    setSchedule(prev => prev.filter(e => e.id !== entryId));
  }

  const dayName = (d: number) => new Date(2000, 0, d).toLocaleString(undefined, { weekday: 'long' });
  const allDays = [1,2,3,4,5,6,7];
  const nonSavedDays = allDays.filter(d => !savedDays.includes(d));
  const vehiclePlateById = useMemo(() => {
    const m = new Map<number, string>();
    vehicles.forEach(v => m.set(v.id, v.plate));
    return m;
  }, [vehicles]);
  const driverNameById = useMemo(() => {
    const m = new Map<number, string>();
    drivers.forEach(d => m.set(d.id, d.full_name || d.username));
    return m;
  }, [drivers]);

  // Whenever a vehicle is chosen, auto-fill driver and manpower from maps and disable manual selection
  useEffect(() => {
    const vid = Number(vehicleId);
    if (!vid) return;
    const autoDriverId = vehicleDriverMap.get(vid) ?? null;
    setDriverId(autoDriverId ? String(autoDriverId) : '');
    const mp = vehicleManpowerMap.get(vid) || { ids: [], names: [] };
    setSelectedManpower(mp.ids);
  }, [vehicleId, vehicleDriverMap, vehicleManpowerMap]);

  // Enhanced filtering logic
  const filteredSchedule = useMemo(() => {
    return schedule
      .filter(entry => {
        const matchesSearch = searchTerm === '' || 
          dayName(entry.service_day).toLowerCase().includes(searchTerm.toLowerCase()) ||
          vehiclePlateById.get(entry.vehicle_id)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (entry.driver_id && driverNameById.get(entry.driver_id)?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesDay = filterDay === 'all' || entry.service_day === filterDay;
        const matchesVehicle = filterVehicle === 'all' || entry.vehicle_id === filterVehicle;
        
        return matchesSearch && matchesDay && matchesVehicle;
      })
      .sort((a, b) => a.service_day - b.service_day || a.service_start.localeCompare(b.service_start));
  }, [schedule, searchTerm, filterDay, filterVehicle, vehiclePlateById, driverNameById]);

  if (loading) {
    return (
      <div className="min-h-screen p-4 lg:p-6" style={{ backgroundColor: colors.background }}>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 rounded-2xl w-64 mb-6" style={{ backgroundColor: colors.border }}></div>
            <div className="grid gap-6">
              <div className="h-64 rounded-2xl" style={{ backgroundColor: colors.border }}></div>
              <div className="h-96 rounded-2xl" style={{ backgroundColor: colors.border }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ backgroundColor: colors.background }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 transition-all duration-300 hover:scale-105 active:scale-95 p-3 rounded-2xl"
              style={{ backgroundColor: colors.cardBg, color: colors.textLight }}
            >
              <Icons.Back className="w-5 h-5" />
              <span className="font-semibold">Back</span>
            </button>
            <div className="w-px h-8" style={{ backgroundColor: colors.border }}></div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold" style={{ color: colors.text }}>
                Service Schedule
              </h1>
              <p className="text-lg mt-2" style={{ color: colors.textLight }}>Managing services for <span style={{ color: colors.primary, fontWeight: '600' }}>{zoneName}</span></p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: colors.primary }}>{schedule.length}</div>
              <div className="text-sm" style={{ color: colors.textLight }}>Total Services</div>
            </div>
          </div>
        </div>

        {/* Enhanced Error Alert */}
        {error && (
          <div className="rounded-2xl p-4 border animate-fadeIn" style={{ backgroundColor: colors.errorLight, borderColor: colors.error }}>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: colors.error }}></div>
              <span className="font-semibold" style={{ color: colors.error }}>{error}</span>
            </div>
          </div>
        )}

        {/* SECTION 1: ADD NEW SERVICE - Enhanced Layout */}
        <section>
          <SectionHeader 
            title="Schedule New Service" 
            number={1}
            subtitle="Plan and organize service entries for your zone"
          />
          <Card padding="p-6 lg:p-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Left Column - Day & Time */}
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
                    <Icons.Calendar className="w-5 h-5" style={{ color: colors.primary }} />
                    Service Day Selection
                  </label>
                  
                  <div className="flex flex-wrap gap-3 mb-6">
                    <button
                      onClick={() => setDayMode('saved')}
                      className={`flex-1 min-w-[140px] p-4 rounded-xl border-2 text-center transition-all duration-300 ${
                        dayMode === 'saved' ? 'border-white shadow-lg scale-105' : 'border-transparent hover:border-gray-200'
                      }`}
                      style={dayMode === 'saved' ? {
                        backgroundColor: colors.primary,
                        color: 'white'
                      } : {
                        backgroundColor: colors.background,
                        color: colors.text
                      }}
                    >
                      <div className="font-semibold">Regular Days</div>
                      <div className="text-sm opacity-90 mt-1">Saved Schedule</div>
                    </button>
                    <button
                      onClick={() => setDayMode('special')}
                      className={`flex-1 min-w-[140px] p-4 rounded-xl border-2 text-center transition-all duration-300 ${
                        dayMode === 'special' ? 'border-white shadow-lg scale-105' : 'border-transparent hover:border-gray-200'
                      }`}
                      style={dayMode === 'special' ? {
                        backgroundColor: colors.accent,
                        color: 'white'
                      } : {
                        backgroundColor: colors.background,
                        color: colors.text
                      }}
                    >
                      <div className="font-semibold">Special Days</div>
                      <div className="text-sm opacity-90 mt-1">One-time Events</div>
                    </button>
                  </div>
                  
                  <select 
                    value={dayMode === 'saved' ? serviceDaySaved : serviceDaySpecial} 
                    onChange={e => dayMode === 'saved' ? setServiceDaySaved(e.target.value) : setServiceDaySpecial(e.target.value)} 
                    className="w-full rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-4 border transition-all duration-300"
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.primary;
                      e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.primary}33`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.border;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    style={{ 
                      backgroundColor: colors.cardBg,
                      borderColor: colors.border,
                      color: colors.text
                    }}
                  >
                    {dayMode === 'saved' ? (
                      <>
                        {!savedDays.length && <option value="">No regular days configured</option>}
                        {savedDays.map(d => (
                          <option key={d} value={d}>{dayName(d)}</option>
                        ))}
                      </>
                    ) : (
                      <>
                        {nonSavedDays.length ? (
                          nonSavedDays.map(d => (
                            <option key={d} value={d}>{dayName(d)}</option>
                          ))
                        ) : (
                          allDays.map(d => (
                            <option key={d} value={d}>{dayName(d)}</option>
                          ))
                        )}
                      </>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                      <Icons.Time className="w-4 h-4" style={{ color: colors.primary }} />
                      Start Time
                    </label>
                    <input 
                      type="time" 
                      value={start} 
                      onChange={e => setStart(e.target.value)} 
                      className="w-full rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-4 border transition-all duration-300"
                      style={{ 
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                      <Icons.Time className="w-4 h-4" style={{ color: colors.primary }} />
                      End Time
                    </label>
                    <input 
                      type="time" 
                      value={end} 
                      onChange={e => setEnd(e.target.value)} 
                      className="w-full rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-4 border transition-all duration-300"
                      style={{ 
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Vehicles & Manpower */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                      <Icons.Vehicle className="w-4 h-4" style={{ color: colors.primary }} />
                      Select Vehicle
                    </label>
                    <select 
                      value={vehicleId} 
                      onChange={e => setVehicleId(e.target.value)} 
                      className="w-full rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-4 border transition-all duration-300"
                      style={{ 
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                    >
                      <option value="">Choose a vehicle...</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.plate} - Vehicle</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                      <Icons.Driver className="w-4 h-4" style={{ color: colors.primary }} />
                      Assigned Driver
                    </label>
                    {vehicleId ? (
                      <>
                        <div className="w-full rounded-xl px-4 py-3 text-lg border" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}>
                          {vehicleDriverNameMap.get(Number(vehicleId)) || 'None assigned'}
                        </div>
                        <div className="mt-2 rounded-xl p-3 text-sm border" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.textLight }}>
                          You can temporarily change the driver for this service day without affecting permanent assignments.
                          <button
                            type="button"
                            onClick={() => setOverrideOpen(v => !v)}
                            className="ml-2 inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold shadow-sm"
                            style={{ backgroundColor: colors.primary, color: 'white' }}
                          >{overrideOpen ? 'Close' : 'Change'}</button>
                        </div>
                        {overrideOpen && (
                          <div className="mt-3">
                            <select
                              value={driverId}
                              onChange={e => setDriverId(e.target.value)}
                              className="w-full rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-4 border transition-all duration-300"
                              style={{ backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }}
                            >
                              <option value="">Use default assigned driver</option>
                              {drivers.map(d => (
                                <option key={d.id} value={d.id}>{displayName(d)}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-4 rounded-xl border text-sm" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.textLight }}>
                        Choose a vehicle to see its assigned driver.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
                    <Icons.Manpower className="w-4 h-4" style={{ color: colors.primary }} />
                    {vehicleId ? 'Assigned Manpower Team' : 'Assign Manpower Team'}
                    {selectedManpower.length > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full ml-2" style={{ backgroundColor: colors.primary, color: 'white' }}>
                        {selectedManpower.length} selected
                      </span>
                    )}
                  </label>
                  {vehicleId ? (
                    <>
                      <div className="flex flex-wrap gap-2 p-2 rounded-xl" style={{ backgroundColor: colors.background }}>
                        {(vehicleManpowerMap.get(Number(vehicleId))?.names || []).length ? (
                          (vehicleManpowerMap.get(Number(vehicleId))?.names || []).map((n, idx) => (
                            <span key={idx} className="px-3 py-2 rounded-xl text-sm border" style={{ backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }}>{n}</span>
                          ))
                        ) : (
                          <span className="italic" style={{ color: colors.textLight }}>None assigned</span>
                        )}
                      </div>
                      <div className="mt-2 rounded-xl p-3 text-sm border" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.textLight }}>
                        You can temporarily add or remove manpower for this service day without affecting permanent assignments.
                        <button
                          type="button"
                          onClick={() => setOverrideOpen(v => !v)}
                          className="ml-2 inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold shadow-sm"
                          style={{ backgroundColor: colors.primary, color: 'white' }}
                        >{overrideOpen ? 'Close' : 'Change'}</button>
                      </div>
                      {overrideOpen && (
                        <div className="mt-3">
                          <label className="block text-xs mb-2" style={{ color: colors.textLight }}>Select manpower for this service</label>
                          <select
                            multiple
                            value={selectedManpower.map(String)}
                            onChange={e => {
                              const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                              setSelectedManpower(opts);
                            }}
                            className="w-full rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-4 border transition-all duration-300 min-h-[140px]"
                            style={{ backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }}
                          >
                            {Array.from(manpowerNameById.entries()).map(([id, name]) => (
                              <option key={id} value={id}>{name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-4 rounded-xl border text-sm" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.textLight }}>
                      Choose a vehicle to work on the selected service day. The assigned driver and manpowers for that vehicle will be used.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end items-center gap-4 mt-8 pt-6 border-t" style={{ borderColor: colors.borderLight }}>
              <div className="text-sm" style={{ color: colors.textLight }}>
                {selectedManpower.length} manpower • {vehicleId ? 'Vehicle selected' : 'No vehicle'} • {driverId ? 'Driver (auto)' : 'No driver'}
              </div>
              <PrimaryButton 
                onClick={addEntry}
                size="lg"
                className="w-full sm:w-auto"
              >
                <Icons.Add className="w-5 h-5" />
                <span>Create Service Entry</span>
              </PrimaryButton>
            </div>
          </Card>
        </section>

        {/* SECTION 2: SCHEDULED SERVICES - Enhanced with Filtering */}
        <section>
          <SectionHeader 
            title="Scheduled Services" 
            number={2}
            subtitle="Manage and monitor all scheduled services"
          />
          
          {/* Enhanced Filter Bar */}
          <Card padding="p-4 lg:p-6" className="mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 lg:flex-initial">
                  <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: colors.textLight }} />
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full lg:w-64 pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all duration-300"
                    style={{ 
                      backgroundColor: colors.cardBg,
                      borderColor: colors.border,
                      color: colors.text
                    }}
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <FilterChip 
                  label="All Days" 
                  active={filterDay === 'all'} 
                  onClick={() => setFilterDay('all')} 
                />
                {[...new Set(schedule.map(s => s.service_day))].sort().map(day => (
                  <FilterChip 
                    key={day}
                    label={dayName(day)} 
                    active={filterDay === day} 
                    onClick={() => setFilterDay(day)} 
                  />
                ))}
              </div>
              
              <div className="text-sm font-semibold px-3 py-2 rounded-xl" style={{ backgroundColor: colors.primary, color: 'white' }}>
                {filteredSchedule.length} of {schedule.length}
              </div>
            </div>
          </Card>

          <Card padding="p-6 lg:p-8">
            {!schedule.length ? (
              <div className="text-center py-12 lg:py-16 rounded-2xl border-2 border-dashed" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                <Icons.Calendar className="w-16 h-16 mx-auto mb-4" style={{ color: colors.textLighter }} />
                <h3 className="text-xl font-semibold mb-2" style={{ color: colors.textLight }}>No services scheduled yet</h3>
                <p className="text-lg mb-6" style={{ color: colors.textLighter }}>Create your first service entry to get started</p>
                <PrimaryButton 
                  onClick={() => document.getElementById('schedule-form')?.scrollIntoView({ behavior: 'smooth' })}
                  size="md"
                >
                  <Icons.Add className="w-5 h-5" />
                  <span>Schedule First Service</span>
                </PrimaryButton>
              </div>
            ) : !filteredSchedule.length ? (
              <div className="text-center py-12 rounded-2xl" style={{ backgroundColor: colors.background }}>
                <Icons.Search className="w-16 h-16 mx-auto mb-4" style={{ color: colors.textLighter }} />
                <h3 className="text-xl font-semibold mb-2" style={{ color: colors.textLight }}>No matching services</h3>
                <p style={{ color: colors.textLighter }}>Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredSchedule.map(e => (
                  <div 
                    key={e.id} 
                    className="rounded-2xl border p-5 lg:p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group"
                    style={{ 
                      backgroundColor: colors.cardBg, 
                      borderColor: colors.borderLight 
                    }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: colors.primary }}></div>
                            <span className="text-xl font-bold" style={{ color: colors.text }}>{dayName(e.service_day)}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ backgroundColor: colors.background }}>
                              <Icons.Time className="w-4 h-4 flex-shrink-0" style={{ color: colors.primary }} />
                              <div>
                                <div className="text-xs" style={{ color: colors.textLight }}>Service Start Time</div>
                                <div className="font-semibold" style={{ color: colors.text }}>{e.service_start.substring(0,5)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ backgroundColor: colors.background }}>
                              <Icons.Time className="w-4 h-4 flex-shrink-0" style={{ color: colors.primary }} />
                              <div>
                                <div className="text-xs" style={{ color: colors.textLight }}>Service End Time</div>
                                <div className="font-semibold" style={{ color: colors.text }}>{e.service_end.substring(0,5)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-base">
                          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: colors.background }}>
                            <Icons.Vehicle className="w-5 h-5 flex-shrink-0" style={{ color: colors.primary }} />
                            <div>
                              <div className="font-semibold" style={{ color: colors.text }}>
                                {vehiclePlateById.get(e.vehicle_id) || `Vehicle #${e.vehicle_id}`}
                              </div>
                              <div className="text-sm" style={{ color: colors.textLight }}>Vehicle</div>
                            </div>
                          </div>
                          
                          {e.driver_id && (
                            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: colors.background }}>
                              <Icons.Driver className="w-5 h-5 flex-shrink-0" style={{ color: colors.primary }} />
                              <div>
                                <div className="font-semibold" style={{ color: colors.text }}>
                                  {driverNameById.get(e.driver_id) || `Driver #${e.driver_id}`}
                                </div>
                                <div className="text-sm" style={{ color: colors.textLight }}>Driver</div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: colors.background }}>
                            <Icons.Manpower className="w-5 h-5 flex-shrink-0 mt-1" style={{ color: colors.primary }} />
                            <div className="min-w-0">
                              <div className="font-semibold mb-1" style={{ color: colors.text }}>
                                {e.assigned_manpower_ids?.length ? 'Manpower' : 'No team assigned'}
                              </div>
                              {e.assigned_manpower_ids?.length ? (
                                <div className="flex flex-wrap gap-2">
                                  {e.assigned_manpower_ids.map((mid) => (
                                    <span key={mid} className="px-2 py-1 rounded-lg text-sm border" style={{ backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }}>
                                      {manpowerNameById.get(mid) || `#${mid}`}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm" style={{ color: colors.textLight }}>Manpower</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => deleteEntry(e.id)}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95 group-hover:op-100 lg:opacity-70"
                        style={{ 
                          backgroundColor: colors.errorLight,
                          color: colors.error
                        }}
                      >
                        <Icons.Delete className="w-4 h-4" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}

function toPgTime(value: string) {
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value;
}