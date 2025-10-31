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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-48 mb-6"></div>
            <div className="grid gap-6">
              <div className="h-64 bg-slate-200 rounded-2xl"></div>
              <div className="h-96 bg-slate-200 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors duration-200"
            >
              <Icons.Back />
              <span className="font-medium">Back to Zones</span>
            </button>
            <div className="w-px h-6 bg-slate-300"></div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">
                Service Schedule
              </h1>
              <p className="text-slate-600 mt-1">Plan and manage services for {zoneName}</p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Schedule Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Icons.Calendar />
            <h2 className="text-xl font-bold text-slate-800">Add New Service Entry</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Day & Time */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Service Day</label>
                <div className="flex space-x-4 mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="dayMode" 
                      value="saved" 
                      checked={dayMode === 'saved'} 
                      onChange={() => setDayMode('saved')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Regular Days</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="dayMode" 
                      value="special" 
                      checked={dayMode === 'special'} 
                      onChange={() => setDayMode('special')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Special Days</span>
                  </label>
                </div>
                
                {dayMode === 'saved' ? (
                  <select 
                    value={serviceDaySaved} 
                    onChange={e => setServiceDaySaved(e.target.value)} 
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <Icons.Time className="inline w-4 h-4 mr-2" />
                    Start Time
                  </label>
                  <input 
                    type="time" 
                    value={start} 
                    onChange={e => setStart(e.target.value)} 
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <Icons.Time className="inline w-4 h-4 mr-2" />
                    End Time
                  </label>
                  <input 
                    type="time" 
                    value={end} 
                    onChange={e => setEnd(e.target.value)} 
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Vehicles & Manpower */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <Icons.Vehicle className="inline w-4 h-4 mr-2" />
                    Vehicle
                  </label>
                  <select 
                    value={vehicleId} 
                    onChange={e => setVehicleId(e.target.value)} 
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select vehicle…</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.plate}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <Icons.Driver className="inline w-4 h-4 mr-2" />
                    Driver
                  </label>
                  <select 
                    value={driverId} 
                    onChange={e => setDriverId(e.target.value)} 
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select driver…</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  <Icons.Manpower className="inline w-4 h-4 mr-2" />
                  Assign Manpower
                </label>
                <div className="flex flex-wrap gap-2">
                  {manpower.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleManpower(m.id)}
                      className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                        selectedManpower.includes(m.id) 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25' 
                          : 'bg-white text-slate-700 border-slate-300 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      {m.username}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button 
              onClick={addEntry}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Icons.Add />
              <span>Add Service Entry</span>
            </button>
          </div>
        </div>

        {/* Schedule List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">Scheduled Services</h2>
            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {schedule.length} entr{schedule.length === 1 ? 'y' : 'ies'}
            </span>
          </div>

          {!schedule.length ? (
            <div className="text-center py-12">
              <Icons.Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">No services scheduled</h3>
              <p className="text-slate-500">Add your first service entry to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedule
                .slice()
                .sort((a, b) => a.service_day - b.service_day || a.service_start.localeCompare(b.service_start))
                .map(e => (
                <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="font-semibold text-slate-800">{dayName(e.service_day)}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-slate-600">
                          <Icons.Time className="w-4 h-4" />
                          <span>{e.service_start.substring(0,5)} - {e.service_end.substring(0,5)}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Icons.Vehicle className="w-4 h-4 text-slate-500" />
                          <span className="text-slate-700">
                            {vehiclePlateById.get(e.vehicle_id) || `Vehicle #${e.vehicle_id}`}
                          </span>
                        </div>
                        
                        {e.driver_id && (
                          <div className="flex items-center space-x-2">
                            <Icons.Driver className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-700">
                              {driverNameById.get(e.driver_id) || `Driver #${e.driver_id}`}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <Icons.Manpower className="w-4 h-4 text-slate-500" />
                          <span className="text-slate-700">
                            {e.assigned_manpower_ids?.length
                              ? `${e.assigned_manpower_ids.length} manpower assigned`
                              : 'No manpower assigned'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => deleteEntry(e.id)}
                      className="flex items-center space-x-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors duration-200 ml-4"
                    >
                      <Icons.Delete />
                      <span className="text-sm">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function toPgTime(value: string) {
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value;
}