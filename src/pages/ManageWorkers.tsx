import { useEffect, useState } from 'react';

const apiBase = 'http://localhost:4000';

type SupervisorRow = {
  id: number;
  username: string;
  vehicle_id?: number | null;
  vehicle_plate?: string | null;
  zones: { id: number; name: string }[];
};

type Vehicle = { id: number; plate: string };

type Zone = { id: number; name: string };

const ManageWorkers = () => {
  const [supervisors, setSupervisors] = useState<SupervisorRow[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editVehicleId, setEditVehicleId] = useState<string>('');
  const [addZoneId, setAddZoneId] = useState<string>('');
  const [moveSelection, setMoveSelection] = useState<Record<number, string>>({});

  function load() {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${apiBase}/api/manager/supervisors/with-assignments`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/manager/vehicles`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/zones?unassigned=true`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([sr, vr, zr]) => {
        const sdata = await sr.json();
        const vdata = await vr.json();
        const zdata = await zr.json();
        if (!sr.ok) throw new Error(sdata?.error || 'Failed to load supervisors');
        if (!vr.ok) throw new Error(vdata?.error || 'Failed to load vehicles');
        if (!zr.ok) throw new Error(zdata?.error || 'Failed to load zones');
        const list: SupervisorRow[] = (sdata.supervisors || []).map((s: any) => ({
          id: s.id,
          username: s.username,
          vehicle_id: s.vehicle_id ?? null,
          vehicle_plate: s.vehicle_plate ?? null,
          zones: Array.isArray(s.zones) ? s.zones.map((z: any) => ({ id: Number(z.id), name: z.name })) : [],
        }));
        setSupervisors(list);
        setVehicles((vdata.vehicles || []).map((v: any) => ({ id: v.id, plate: v.plate })));
        setZones((zdata.zones || []).map((z: any) => ({ id: Number(z.id), name: String(z.zone_name) })));
      })
      .catch((e: any) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function startEdit(s: SupervisorRow) {
    setEditingId(s.id);
    setEditVehicleId(s.vehicle_id != null ? String(s.vehicle_id) : '');
    setAddZoneId('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditVehicleId('');
    setAddZoneId('');
    setMoveSelection({});
  }

  async function saveVehicle(supervisorId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (editVehicleId === '') return;
    try {
      const res = await fetch(`${apiBase}/api/manager/supervisors/${supervisorId}/vehicle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vehicleId: Number(editVehicleId) })
      });
      if (res.status === 409) {
        const proceed = window.confirm('This vehicle is already assigned to another supervisor. Do you want to move it to this supervisor?');
        if (proceed) {
          await fetch(`${apiBase}/api/manager/supervisors/${supervisorId}/vehicle/move`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ vehicleId: Number(editVehicleId) })
          });
        } else {
          return; // abort
        }
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to assign vehicle');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to assign/move vehicle');
    } finally {
      cancelEdit();
      load();
    }
  }

  async function unassignVehicle(supervisorId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`${apiBase}/api/manager/supervisors/${supervisorId}/vehicle`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    cancelEdit();
    load();
  }

  async function addZone(supervisorId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!addZoneId) return;
    try {
      const res = await fetch(`${apiBase}/api/manager/supervisors/${supervisorId}/zones/add`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ zoneId: Number(addZoneId) })
      });
      if (res.status === 409) {
        await res.json().catch(() => ({}));
        const proceed = window.confirm('This zone is already assigned to a supervisor. Do you want to move it to this supervisor?');
        if (proceed) {
          await fetch(`${apiBase}/api/manager/supervisors/${supervisorId}/zones/move`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ zoneId: Number(addZoneId) })
          });
        } else {
          return; // abort
        }
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to add zone');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to add/move zone');
    } finally {
      setAddZoneId('');
      load();
    }
  }

  async function removeZone(supervisorId: number, zoneId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`${apiBase}/api/manager/supervisors/${supervisorId}/zones/remove`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ zoneId })
    });
    load();
  }

  async function moveZone(zoneId: number, targetSupervisorIdStr: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    const targetSupervisorId = Number(targetSupervisorIdStr);
    if (!Number.isFinite(targetSupervisorId)) return;
    await fetch(`${apiBase}/api/manager/supervisors/${targetSupervisorId}/zones/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ zoneId })
    });
    setMoveSelection(prev => ({ ...prev, [zoneId]: '' }));
    load();
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Manage Workers</h2>
      {error && <div className="text-red-600 mb-3">{error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {supervisors.map(s => (
            <div key={s.id} className="bg-white rounded shadow p-4 border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{s.username}</h3>
                <span className="text-sm text-gray-500">#{s.id}</span>
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-gray-500 text-sm">Assigned Vehicle:</span>
                  <span className="ml-2 font-medium">{s.vehicle_plate || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Zones:</span>
                  <span className="ml-2 font-medium">{s.zones && s.zones.length ? s.zones.map(z => z.name).join(', ') : 'None'}</span>
                </div>
              </div>

              {editingId === s.id ? (
                <div className="mt-3 border-t pt-3 space-y-3">
                  <div>
                    <label className="block text-sm text-gray-700">Assign Vehicle</label>
                    <select value={editVehicleId} onChange={e => setEditVehicleId(e.target.value)} className="mt-1 w-full border rounded px-2 py-1 text-sm">
                      <option value="">-- None --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.plate}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => saveVehicle(s.id)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Save Vehicle</button>
                      <button onClick={() => unassignVehicle(s.id)} className="px-3 py-1 border rounded text-sm">Unassign Vehicle</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Add Zone to Supervisor</label>
                    <div className="flex items-center gap-2">
                      <select value={addZoneId} onChange={e => setAddZoneId(e.target.value)} className="border rounded px-2 py-1 text-sm">
                        <option value="">Select a zone…</option>
                        {zones
                          .filter(z => !s.zones.some(sz => sz.id === z.id))
                          .map(z => (
                            <option key={z.id} value={z.id}>{z.name}</option>
                          ))}
                      </select>
                      <button onClick={() => addZone(s.id)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Add</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Remove Zone</label>
                    <div className="flex flex-wrap gap-2">
                      {s.zones.map(z => (
                        <button key={z.id} onClick={() => removeZone(s.id, z.id)} className="px-2 py-1 border rounded text-xs">{z.name} ✕</button>
                      ))}
                      {!s.zones.length && <div className="text-gray-500 text-sm">No zones to remove</div>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Move Zone to Another Supervisor</label>
                    <div className="space-y-2">
                      {s.zones.map(z => (
                        <div key={z.id} className="flex items-center gap-2">
                          <span className="text-sm">{z.name}</span>
                          <select
                            value={moveSelection[z.id] || ''}
                            onChange={e => setMoveSelection(prev => ({ ...prev, [z.id]: e.target.value }))}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="">Select supervisor…</option>
                            {supervisors.filter(sv => sv.id !== s.id).map(sv => (
                              <option key={sv.id} value={sv.id}>{sv.username}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => moveZone(z.id, moveSelection[z.id])}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                            disabled={!moveSelection[z.id]}
                          >
                            Move
                          </button>
                        </div>
                      ))}
                      {!s.zones.length && <div className="text-gray-500 text-sm">No zones to move</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={cancelEdit} className="px-3 py-1 border rounded text-sm">Close</button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <button onClick={() => startEdit(s)} className="text-blue-600 underline text-sm">Manage</button>
                </div>
              )}
            </div>
          ))}
          {!supervisors.length && (
            <div className="text-gray-600">No supervisors found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManageWorkers;
