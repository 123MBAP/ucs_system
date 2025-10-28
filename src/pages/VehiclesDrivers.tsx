import { useEffect, useState } from 'react';

const apiBase = 'http://localhost:4000';

type DriverRow = {
  id: number;
  username: string;
  vehicle_id?: number | null;
  vehicle_plate: string | null;
  zones: { id: number; name: string }[];
};

type Vehicle = { id: number; plate: string; make?: string | null; model?: string | null };
type Zone = { id: string; name: string };

const VehiclesDrivers = () => {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editVehicleId, setEditVehicleId] = useState<string>('');
  const [editZoneIds, setEditZoneIds] = useState<string[]>([]);

  function load() {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${apiBase}/api/manager/drivers/with-assignments`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/manager/vehicles`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/zones`, { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(async ([dr, vr, zr]) => {
        const ddata = await dr.json();
        const vdata = await vr.json();
        const zdata = await zr.json();
        if (!dr.ok) throw new Error(ddata?.error || 'Failed to load drivers');
        if (!vr.ok) throw new Error(vdata?.error || 'Failed to load vehicles');
        if (!zr.ok) throw new Error(zdata?.error || 'Failed to load zones');
        const list: DriverRow[] = (ddata.drivers || []).map((d: any) => ({
          id: d.id,
          username: d.username,
          vehicle_id: d.vehicle_id ?? null,
          vehicle_plate: d.vehicle_plate || null,
          zones: Array.isArray(d.zones) ? d.zones.map((z: any) => ({ id: Number(z.id), name: z.name })) : []
        }));
        setDrivers(list);
        setVehicles((vdata.vehicles || []).map((v: any) => ({ id: v.id, plate: v.plate, make: v.make, model: v.model })));
        setZones((zdata.zones || []).map((z: any) => ({ id: String(z.id), name: z.zone_name })));
      })
      .catch((e: any) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function startEdit(d: DriverRow) {
    setEditingId(d.id);
    setEditVehicleId(d.vehicle_id != null ? String(d.vehicle_id) : '');
    setEditZoneIds(d.zones.map(z => String(z.id)));
  }

  function toggleZoneId(id: string) {
    setEditZoneIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditVehicleId('');
    setEditZoneIds([]);
  }

  async function saveEdit(driverId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      // vehicle assign/unassign
      if (editVehicleId === '') {
        await fetch(`${apiBase}/api/manager/drivers/${driverId}/vehicle`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await fetch(`${apiBase}/api/manager/drivers/${driverId}/vehicle`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ vehicleId: Number(editVehicleId) })
        });
      }
      // zones set
      await fetch(`${apiBase}/api/manager/drivers/${driverId}/zones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ zoneIds: editZoneIds.map(z => Number(z)) })
      });
      cancelEdit();
      load();
    } catch (e: any) {
      setError(e?.message || 'Failed to save assignments');
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Vehicles & Drivers</h2>
      {error && <div className="text-red-600 mb-3">{error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map(d => (
            <div key={d.id} className="bg-white rounded shadow p-4 border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{d.username}</h3>
                <span className="text-sm text-gray-500">#{d.id}</span>
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-gray-500 text-sm">Assigned Car:</span>
                  <span className="ml-2 font-medium">{d.vehicle_plate || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Assigned Zones:</span>
                  <span className="ml-2 font-medium">{d.zones && d.zones.length ? d.zones.map(z => z.name).join(', ') : 'None'}</span>
                </div>
              </div>

              {editingId === d.id ? (
                <div className="mt-3 border-t pt-3 space-y-3">
                  <div>
                    <label className="block text-sm text-gray-700">Assign Vehicle</label>
                    <select value={editVehicleId} onChange={e => setEditVehicleId(e.target.value)} className="mt-1 w-full border rounded px-2 py-1 text-sm">
                      <option value="">-- None --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.plate}{v.make || v.model ? ` (${[v.make, v.model].filter(Boolean).join(' ')})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Assign Zones</label>
                    <div className="max-h-40 overflow-auto border rounded p-2 space-y-1">
                      {zones.map(z => (
                        <label key={z.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={editZoneIds.includes(z.id)} onChange={() => toggleZoneId(z.id)} />
                          <span>{z.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => saveEdit(d.id)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Save</button>
                    <button onClick={cancelEdit} className="px-3 py-1 border rounded text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <button onClick={() => startEdit(d)} className="text-blue-600 underline text-sm">Assign</button>
                </div>
              )}
            </div>
          ))}
          {!drivers.length && (
            <div className="text-gray-600">No drivers found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default VehiclesDrivers;
