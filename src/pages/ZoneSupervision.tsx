import { useEffect, useState } from 'react';
import type { SVGProps } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_URL as string;

type Driver = { id: number; username: string; vehicle_id?: number | null; vehicle_plate?: string | null; assigned_manpowers?: number[] };
type Manpower = { id: number; username: string };
type Vehicle = { id: number; plate: string; assigned_manpower_users?: { id: number; username: string }[] };

type Detail = {
  zone: { id: number; name: string };
  serviceDays: number[];
  driverAssignments: { weekday: number; driver_user_id: number }[];
  drivers: Driver[];
  manpower: Manpower[];
  vehicles: Vehicle[];
  supervisorVehicles?: Vehicle[];
};

// Icon components
const Icons = {
  Back: (props: SVGProps<SVGSVGElement>) => {
    const { className, ...rest } = props;
    return (
      <svg {...rest} className={["w-4 h-4", className].filter(Boolean).join(" ")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
    );
  },
  Calendar: (props: SVGProps<SVGSVGElement>) => {
    const { className, ...rest } = props;
    return (
      <svg {...rest} className={["w-5 h-5", className].filter(Boolean).join(" ")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    );
  },
  Vehicle: (props: SVGProps<SVGSVGElement>) => {
    const { className, ...rest } = props;
    return (
      <svg {...rest} className={["w-5 h-5", className].filter(Boolean).join(" ")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    );
  },
  Driver: (props: SVGProps<SVGSVGElement>) => {
    const { className, ...rest } = props;
    return (
      <svg {...rest} className={["w-5 h-5", className].filter(Boolean).join(" ")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    );
  },
  Manpower: (props: SVGProps<SVGSVGElement>) => {
    const { className, ...rest } = props;
    return (
      <svg {...rest} className={["w-5 h-5", className].filter(Boolean).join(" ")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    );
  },
  Save: (props: SVGProps<SVGSVGElement>) => {
    const { className, ...rest } = props;
    return (
      <svg {...rest} className={["w-4 h-4", className].filter(Boolean).join(" ")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
    );
  },
  Add: (props: SVGProps<SVGSVGElement>) => {
    const { className, ...rest } = props;
    return (
      <svg {...rest} className={["w-4 h-4", className].filter(Boolean).join(" ")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
    );
  },
  Remove: (props: SVGProps<SVGSVGElement>) => {
    const { className, ...rest } = props;
    return (
      <svg {...rest} className={["w-4 h-4", className].filter(Boolean).join(" ")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
    );
  },
  Schedule: (props: SVGProps<SVGSVGElement>) => {
    const { className, ...rest } = props;
    return (
      <svg {...rest} className={["w-4 h-4", className].filter(Boolean).join(" ")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    );
  },
};

function weekdayName(n: number) {
  const d = new Date(2000, 0, n);
  return d.toLocaleString(undefined, { weekday: 'long' });
}

const ZoneSupervision = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editDays, setEditDays] = useState<number[]>([]);
  const [editDrivers, setEditDrivers] = useState<Record<number, string>>({});
  const [editVehicleDriver, setEditVehicleDriver] = useState<Record<number, string>>({});
  const [, setEditVehicleManpower] = useState<Record<number, Set<number>>>({});
  const [addingMp, setAddingMp] = useState<string>('');

  function load() {
    const token = localStorage.getItem('token');
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/supervisor/zones/${id}/supervision`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load');
        setDetail(data);
        setEditDays(data.serviceDays || []);
        const dmap: Record<number, string> = {};
        for (const a of data.driverAssignments || []) dmap[a.weekday] = String(a.driver_user_id);
        setEditDrivers(dmap);
        const vm: Record<number, Set<number>> = {};
        for (const dr of data.drivers || []) vm[dr.id] = new Set<number>(dr.assigned_manpowers || []);
        setEditVehicleManpower(vm);
      })
      .catch((e: any) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  function toggleDay(day: number) {
    setEditDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  async function saveDays() {
    const token = localStorage.getItem('token');
    if (!token || !id) return;
    await fetch(`${apiBase}/api/supervisor/zones/${id}/service-days`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ days: editDays })
    });
    load();
  }

  async function saveDriver(weekday: number) {
    const token = localStorage.getItem('token');
    if (!token || !id) return;
    const driverUserId = Number(editDrivers[weekday]);
    if (!driverUserId) return;
    await fetch(`${apiBase}/api/supervisor/zones/${id}/driver`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ weekday, driverUserId })
    });
    load();
  }

  async function saveVehicleForVehicle(vehicleId: number) {
    const token = localStorage.getItem('token');
    if (!token || !id) return;
    const driverUserId = Number(editVehicleDriver[vehicleId]);
    if (!driverUserId) return;
    await fetch(`${apiBase}/api/supervisor/zones/${id}/driver/vehicle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ driverUserId, vehicleId })
    });
    load();
  }

  async function addManpower() {
    const token = localStorage.getItem('token');
    if (!token || !id) return;
    const userId = Number(addingMp);
    if (!userId) return;
    await fetch(`${apiBase}/api/supervisor/zones/${id}/manpower`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId })
    });
    setAddingMp('');
    load();
  }

  async function removeManpower(userId: number) {
    const token = localStorage.getItem('token');
    if (!token || !id) return;
    await fetch(`${apiBase}/api/supervisor/zones/${id}/manpower/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    load();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-48 mb-6"></div>
            <div className="grid gap-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <div className="text-red-600 font-medium">{error}</div>
        </div>
      </div>
    </div>
  );

  if (!detail) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl p-6 text-center">
          <div className="text-slate-600">Zone not found</div>
        </div>
      </div>
    </div>
  );

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
                Zone Supervision
              </h1>
              <p className="text-slate-600 mt-1">Manage {detail.zone.name} operations and assignments</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/supervisor/zones/${detail.zone.id}/schedule`)}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Icons.Schedule />
            <span>Plan Service Schedule</span>
          </button>
        </div>

        {/* Supervisor Vehicles */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Icons.Vehicle />
            <h2 className="text-xl font-bold text-slate-800">Supervisor Vehicles</h2>
          </div>
          <div className="text-slate-700">
            {detail.supervisorVehicles && detail.supervisorVehicles.length ? (
              <div className="flex flex-wrap gap-2">
                {detail.supervisorVehicles.map(v => (
                  <span key={v.id} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">
                    {v.plate}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 italic">No vehicles assigned to you yet</div>
            )}
          </div>
        </div>

        {/* Service Days */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Icons.Calendar />
            <h2 className="text-xl font-bold text-slate-800">Service Days</h2>
          </div>
          <div className="flex flex-wrap gap-3 mb-6">
            {Array.from({ length: 7 }).map((_, i) => {
              const d = i + 1;
              const on = editDays.includes(d);
              return (
                <button 
                  key={d} 
                  onClick={() => toggleDay(d)} 
                  className={`px-4 py-3 rounded-xl border-2 font-medium transition-all duration-200 ${
                    on 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25' 
                      : 'bg-white text-slate-700 border-slate-300 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  {weekdayName(d)}
                </button>
              );
            })}
          </div>
          <button 
            onClick={saveDays}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Icons.Save />
            <span>Save Service Days</span>
          </button>
        </div>

        {/* Driver Assignments */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Icons.Driver />
            <h2 className="text-xl font-bold text-slate-800">Driver Assignments</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {editDays.sort((a,b)=>a-b).map(d => (
              <div key={d} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800 text-lg">{weekdayName(d)}</h3>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
                <select 
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={editDrivers[d] || ''} 
                  onChange={e => setEditDrivers({ ...editDrivers, [d]: e.target.value })}
                >
                  <option value="">Select driver…</option>
                  {detail.drivers.map(dr => (
                    <option key={dr.id} value={dr.id}>
                      {dr.username} {dr.vehicle_plate ? `(${dr.vehicle_plate})` : ''}
                    </option>
                  ))}
                </select>
                <button 
                  onClick={() => saveDriver(d)}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors duration-200"
                >
                  <Icons.Save />
                  <span>Assign Driver</span>
                </button>
              </div>
            ))}
          </div>
          {editDays.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              Select service days above to assign drivers
            </div>
          )}
        </div>

        {/* Driver Vehicle Reassignment */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Icons.Vehicle />
            <h2 className="text-xl font-bold text-slate-800">Driver Vehicle Reassignment</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {detail.vehicles.map(v => {
              const currentDriver = detail.drivers.find(dr => dr.vehicle_id === v.id) || null;
              return (
                <div key={v.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <Icons.Vehicle className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-slate-800">Vehicle {v.plate}</h3>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="text-sm text-slate-600">
                      <span className="font-medium">Current driver:</span>{' '}
                      {currentDriver ? (
                        <span className="text-slate-800">{currentDriver.username}</span>
                      ) : (
                        <span className="text-orange-600">None assigned</span>
                      )}
                    </div>
                    
                    {Array.isArray(v.assigned_manpower_users) && (
                      <div className="text-sm">
                        <div className="font-medium text-slate-700 mb-1">Assigned Manpower:</div>
                        {v.assigned_manpower_users.length ? (
                          <div className="space-y-1">
                            {v.assigned_manpower_users.map(u => (
                              <div key={u.id} className="text-slate-600 bg-white px-2 py-1 rounded-lg">
                                {u.username} (#{u.id})
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-500 italic">None assigned</div>
                        )}
                      </div>
                    )}
                  </div>

                  <select
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editVehicleDriver[v.id] || ''}
                    onChange={e => setEditVehicleDriver({ ...editVehicleDriver, [v.id]: e.target.value })}
                  >
                    <option value="">Select driver…</option>
                    {detail.drivers.map(dr => (
                      <option key={dr.id} value={dr.id}>{dr.username}</option>
                    ))}
                  </select>
                  
                  <button 
                    onClick={() => saveVehicleForVehicle(v.id)}
                    className="w-full flex items-center justify-center space-x-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors duration-200"
                  >
                    <Icons.Save />
                    <span>Assign Driver</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Manpower Management */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Icons.Manpower />
            <h2 className="text-xl font-bold text-slate-800">Manpower Management</h2>
          </div>

          {/* Add Manpower */}
          <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
            <h3 className="font-semibold text-slate-800 mb-3">Add Manpower</h3>
            <div className="flex gap-3">
              <input 
                className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter manpower user ID"
                value={addingMp}
                onChange={e => setAddingMp(e.target.value)}
                type="number"
              />
              <button 
                onClick={addManpower}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Icons.Add />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Manpower List */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-4">Assigned Manpower</h3>
            {detail.manpower.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {detail.manpower.map(mp => (
                  <div key={mp.id} className="flex items-center justify-between bg-white rounded-xl p-4 border border-slate-200">
                    <div>
                      <div className="font-medium text-slate-800">{mp.username}</div>
                      <div className="text-sm text-slate-500">ID: #{mp.id}</div>
                    </div>
                    <button 
                      onClick={() => removeManpower(mp.id)}
                      className="flex items-center space-x-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors duration-200"
                    >
                      <Icons.Remove />
                      <span className="text-sm">Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                <Icons.Manpower className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <div>No manpower assigned to this zone</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoneSupervision;