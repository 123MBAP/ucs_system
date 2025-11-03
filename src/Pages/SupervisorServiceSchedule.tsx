import { useEffect, useMemo, useState, type SVGProps } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_URL as string;

type Vehicle = { id: number; plate: string };
type Driver = { id: number; username: string };
type Manpower = { id: number; username: string };

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

// Color constants
const colors = {
  primary: '#D97706',
  primaryHover: '#B45309',
  accent: '#15803D',
  accentHover: '#166534',
  background: '#F9FAFB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  text: '#1E1E1E',
  textLight: '#6B7280',
  error: '#DC2626',
  success: '#15803D'
};

// Icon components
const Icons = {
  Back: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      className={props.className ?? 'w-4 h-4'}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Calendar: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      className={props.className ?? 'w-5 h-5'}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Vehicle: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      className={props.className ?? 'w-5 h-5'}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Driver: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      className={props.className ?? 'w-5 h-5'}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Time: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      className={props.className ?? 'w-5 h-5'}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Manpower: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      className={props.className ?? 'w-5 h-5'}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Delete: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      className={props.className ?? 'w-4 h-4'}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Add: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      className={props.className ?? 'w-4 h-4'}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
};

// UI Components
const SectionHeader = ({ title, number }: { title: string; number: number }) => (
  <div className="flex items-center gap-3 mb-6 pb-3 border-b" style={{ borderColor: colors.border }}>
    <div 
      className="flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm"
      style={{ backgroundColor: colors.primary }}
    >
      {number}
    </div>
    <h2 className="text-2xl font-bold" style={{ color: colors.text }}>{title}</h2>
  </div>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div 
    className={`rounded-lg shadow-sm border p-6 ${className}`}
    style={{ 
      backgroundColor: colors.cardBg, 
      borderColor: colors.border 
    }}
  >
    {children}
  </div>
);

const PrimaryButton = ({ children, onClick, disabled = false, loading = false, className = '' }: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className={`px-4 py-2 rounded-lg font-medium text-white transition-colors flex items-center gap-2 ${className}`}
    style={{ 
      backgroundColor: disabled ? colors.textLight : colors.primary,
      cursor: disabled ? 'not-allowed' : 'pointer'
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
    {children}
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
  const [manpower, setManpower] = useState<Manpower[]>([]);
  const [zoneName, setZoneName] = useState<string>('');

  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [savedDays, setSavedDays] = useState<number[]>([]);

  const [dayMode, setDayMode] = useState<'saved' | 'special'>('saved');
  const [serviceDaySaved, setServiceDaySaved] = useState<string>('');
  const [serviceDaySpecial, setServiceDaySpecial] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [start, setStart] = useState<string>('08:00');
  const [end, setEnd] = useState<string>('12:00');
  const [selectedManpower, setSelectedManpower] = useState<number[]>([]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

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
        setDrivers((zdata?.drivers || []).map((d: any) => ({ id: Number(d.id), username: String(d.username) })));
        setManpower((zdata?.manpower || []).map((m: any) => ({ id: Number(m.id), username: String(m.username) })));
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

  function toggleManpower(id: number) {
    setSelectedManpower(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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
    drivers.forEach(d => m.set(d.id, d.username));
    return m;
  }, [drivers]);

  if (loading) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: colors.background }}>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 rounded w-48 mb-6" style={{ backgroundColor: colors.border }}></div>
            <div className="grid gap-6">
              <div className="h-64 rounded-lg" style={{ backgroundColor: colors.border }}></div>
              <div className="h-96 rounded-lg" style={{ backgroundColor: colors.border }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.background }}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 transition-colors duration-200"
              style={{ color: colors.textLight }}
            >
              <Icons.Back />
              <span className="font-medium">Back to Zone</span>
            </button>
            <div className="w-px h-6" style={{ backgroundColor: colors.border }}></div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
                Service Schedule
              </h1>
              <p className="mt-1" style={{ color: colors.textLight }}>Plan and manage services for {zoneName}</p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg p-4 border" style={{ backgroundColor: '#FEF2F2', borderColor: colors.error }}>
            <div className="flex items-center space-x-2" style={{ color: colors.error }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* SECTION 1: ADD NEW SERVICE */}
        <section>
          <SectionHeader title="Add New Service Entry" number={1} />
          <Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Day & Time */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: colors.text }}>Service Day</label>
                  <div className="flex space-x-4 mb-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="dayMode" 
                        value="saved" 
                        checked={dayMode === 'saved'} 
                        onChange={() => setDayMode('saved')}
                        style={{ accentColor: colors.primary }}
                      />
                      <span className="text-sm font-medium" style={{ color: colors.text }}>Regular Days</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="dayMode" 
                        value="special" 
                        checked={dayMode === 'special'} 
                        onChange={() => setDayMode('special')}
                        style={{ accentColor: colors.primary }}
                      />
                      <span className="text-sm font-medium" style={{ color: colors.text }}>Special Days</span>
                    </label>
                  </div>
                  
                  {dayMode === 'saved' ? (
                    <select 
                      value={serviceDaySaved} 
                      onChange={e => setServiceDaySaved(e.target.value)} 
                      className="w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 border"
                      style={{ 
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                    >
                      {!savedDays.length && <option value="">No regular days set</option>}
                      {savedDays.map(d => (
                        <option key={d} value={d}>{dayName(d)}</option>
                      ))}
                    </select>
                  ) : (
                    <select 
                      value={serviceDaySpecial} 
                      onChange={e => setServiceDaySpecial(e.target.value)} 
                      className="w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 border"
                      style={{ 
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                    >
                      {nonSavedDays.length ? (
                        nonSavedDays.map(d => (
                          <option key={d} value={d}>{dayName(d)}</option>
                        ))
                      ) : (
                        allDays.map(d => (
                          <option key={d} value={d}>{dayName(d)}</option>
                        ))
                      )}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                      <Icons.Time className="inline w-4 h-4 mr-2" style={{ color: colors.primary }} />
                      Start Time
                    </label>
                    <input 
                      type="time" 
                      value={start} 
                      onChange={e => setStart(e.target.value)} 
                      className="w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 border"
                      style={{ 
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                      <Icons.Time className="inline w-4 h-4 mr-2" style={{ color: colors.primary }} />
                      End Time
                    </label>
                    <input 
                      type="time" 
                      value={end} 
                      onChange={e => setEnd(e.target.value)} 
                      className="w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 border"
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                      <Icons.Vehicle className="inline w-4 h-4 mr-2" style={{ color: colors.primary }} />
                      Vehicle
                    </label>
                    <select 
                      value={vehicleId} 
                      onChange={e => setVehicleId(e.target.value)} 
                      className="w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 border"
                      style={{ 
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                    >
                      <option value="">Select vehicle…</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.plate}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                      <Icons.Driver className="inline w-4 h-4 mr-2" style={{ color: colors.primary }} />
                      Driver
                    </label>
                    <select 
                      value={driverId} 
                      onChange={e => setDriverId(e.target.value)} 
                      className="w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 border"
                      style={{ 
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                    >
                      <option value="">Select driver…</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.username}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: colors.text }}>
                    <Icons.Manpower className="inline w-4 h-4 mr-2" style={{ color: colors.primary }} />
                    Assign Manpower
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {manpower.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleManpower(m.id)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                          selectedManpower.includes(m.id) 
                            ? 'text-white shadow-lg' 
                            : 'border hover:shadow-md'
                        }`}
                        style={selectedManpower.includes(m.id) ? {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary
                        } : {
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          borderColor: colors.border
                        }}
                      >
                        {m.username}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <PrimaryButton 
                onClick={addEntry}
                className="px-6 py-3"
              >
                <Icons.Add />
                <span>Add Service Entry</span>
              </PrimaryButton>
            </div>
          </Card>
        </section>

        {/* SECTION 2: SCHEDULED SERVICES */}
        <section>
          <SectionHeader title="Scheduled Services" number={2} />
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Current Schedule</h3>
              <span 
                className="text-sm px-3 py-1 rounded-full"
                style={{ backgroundColor: colors.background, color: colors.textLight }}
              >
                {schedule.length} entr{schedule.length === 1 ? 'y' : 'ies'}
              </span>
            </div>

            {!schedule.length ? (
              <div className="text-center py-12 rounded-lg border" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                <Icons.Calendar className="w-16 h-16 mx-auto mb-4" style={{ color: colors.textLight }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textLight }}>No services scheduled</h3>
                <p style={{ color: colors.textLight }}>Add your first service entry to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {schedule
                  .slice()
                  .sort((a, b) => a.service_day - b.service_day || a.service_start.localeCompare(b.service_start))
                  .map(e => (
                  <div 
                    key={e.id} 
                    className="rounded-lg border p-4 transition-shadow duration-200 hover:shadow-md"
                    style={{ 
                      backgroundColor: colors.cardBg, 
                      borderColor: colors.border 
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }}></div>
                            <span className="font-semibold" style={{ color: colors.text }}>{dayName(e.service_day)}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-sm" style={{ color: colors.textLight }}>
                            <Icons.Time className="w-4 h-4" />
                            <span>{e.service_start.substring(0,5)} - {e.service_end.substring(0,5)}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Icons.Vehicle className="w-4 h-4" style={{ color: colors.textLight }} />
                            <span style={{ color: colors.text }}>
                              {vehiclePlateById.get(e.vehicle_id) || `Vehicle #${e.vehicle_id}`}
                            </span>
                          </div>
                          
                          {e.driver_id && (
                            <div className="flex items-center space-x-2">
                              <Icons.Driver className="w-4 h-4" style={{ color: colors.textLight }} />
                              <span style={{ color: colors.text }}>
                                {driverNameById.get(e.driver_id) || `Driver #${e.driver_id}`}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2">
                            <Icons.Manpower className="w-4 h-4" style={{ color: colors.textLight }} />
                            <span style={{ color: colors.text }}>
                              {e.assigned_manpower_ids?.length
                                ? `${e.assigned_manpower_ids.length} manpower assigned`
                                : 'No manpower assigned'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => deleteEntry(e.id)}
                        className="flex items-center space-x-1 px-3 py-2 rounded-lg font-medium transition-colors duration-200 ml-4"
                        style={{ 
                          backgroundColor: '#FEF2F2',
                          color: colors.error
                        }}
                      >
                        <Icons.Delete />
                        <span className="text-sm">Delete</span>
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