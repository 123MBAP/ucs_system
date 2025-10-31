import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_URL as string;

type Driver = { id: number; username: string; vehicle_id?: number | null; vehicle_plate?: string | null; assigned_manpowers?: number[] };
type Manpower = { id: number; username: string };
type Vehicle = { id: number; plate: string };

type Detail = {
  zone: { id: number; name: string };
  serviceDays: number[];
  driverAssignments: { weekday: number; driver_user_id: number }[];
  drivers: Driver[];
  manpower: Manpower[];
  vehicles: Vehicle[];
  supervisorVehicle?: { id: number; plate: string } | null;
};

function weekdayName(n: number) {
  const d = new Date(2000, 0, n); // approximate
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

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!detail) return <div className="p-6">Not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <button onClick={() => navigate(-1)} className="text-blue-600 underline text-sm">← Back</button>
      </div>
      <h2 className="text-2xl font-bold">Zone Supervision — {detail.zone.name}</h2>

      <div className="bg-white rounded shadow p-4 border">
        <h3 className="text-lg font-semibold mb-2">Supervisor Vehicle</h3>
        <div className="text-sm">
          {detail.supervisorVehicle
            ? (<span>Assigned vehicle: <span className="font-medium">{detail.supervisorVehicle.plate}</span></span>)
            : (<span>No vehicle assigned to you yet.</span>)}
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 border">
        <h3 className="text-lg font-semibold mb-2">Service Days</h3>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = i + 1;
            const on = editDays.includes(d);
            return (
              <button key={d} onClick={() => toggleDay(d)} className={`px-3 py-1 rounded border ${on ? 'bg-blue-600 text-white' : ''}`}>
                {weekdayName(d)}
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <button onClick={saveDays} className="px-4 py-2 rounded bg-blue-600 text-white">Save Service Days</button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 border">
        <h3 className="text-lg font-semibold mb-2">Driver Assignments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {editDays.sort((a,b)=>a-b).map(d => (
            <div key={d} className="border rounded p-3">
              <div className="mb-2 font-medium">{weekdayName(d)}</div>
              <select className="border rounded px-2 py-2 w-full" value={editDrivers[d] || ''} onChange={e => setEditDrivers({ ...editDrivers, [d]: e.target.value })}>
                <option value="">Select driver…</option>
                {detail.drivers.map(dr => (
                  <option key={dr.id} value={dr.id}>{dr.username} {dr.vehicle_plate ? `(${dr.vehicle_plate})` : ''}</option>
                ))}
              </select>
              <div className="mt-2">
                <button onClick={() => saveDriver(d)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Save Driver</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 border">
        <h3 className="text-lg font-semibold mb-2">Driver Vehicle Reassignment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {detail.vehicles.map(v => {
            const currentDriver = detail.drivers.find(dr => dr.vehicle_id === v.id) || null;
            return (
              <div key={v.id} className="border rounded p-3">
                <div className="mb-2 font-medium">Vehicle {v.plate}</div>
                <div className="text-sm text-gray-600 mb-1">Current driver: {currentDriver ? currentDriver.username : 'None'}</div>
                <select
                  className="border rounded px-2 py-2 w-full"
                  value={editVehicleDriver[v.id] || ''}
                  onChange={e => setEditVehicleDriver({ ...editVehicleDriver, [v.id]: e.target.value })}
                >
                  <option value="">Select driver…</option>
                  {detail.drivers.map(dr => (
                    <option key={dr.id} value={dr.id}>{dr.username}</option>
                  ))}
                </select>
                <div className="mt-2">
                  <button onClick={() => saveVehicleForVehicle(v.id)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Assign Driver</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 border">
        <h3 className="text-lg font-semibold mb-2">Manpower</h3>
        <div className="mb-3">
          <div className="text-sm text-gray-600 mb-1">Add manpower by user ID</div>
          <div className="flex gap-2">
            <input className="border rounded px-2 py-2" placeholder="Manpower user ID" value={addingMp} onChange={e => setAddingMp(e.target.value)} />
            <button onClick={addManpower} className="px-3 py-2 rounded bg-blue-600 text-white">Add</button>
          </div>
        </div>
        <div className="divide-y">
          {detail.manpower.map(mp => (
            <div key={mp.id} className="py-2 flex items-center justify-between">
              <div>{mp.username} (#{mp.id})</div>
              <button onClick={() => removeManpower(mp.id)} className="text-red-600 underline text-sm">Remove</button>
            </div>
          ))}
          {!detail.manpower.length && <div className="text-sm text-gray-500">No manpower assigned.</div>}
        </div>
      </div>
    </div>
  );
};

export default ZoneSupervision;
