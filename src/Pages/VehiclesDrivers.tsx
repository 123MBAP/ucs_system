import { useEffect, useState } from 'react';
import { useI18n } from 'src/lib/i18n';

const apiBase = import.meta.env.VITE_API_URL as string;

type DriverRow = {
  id: number;
  username: string;
  vehicle_id?: number | null;
  vehicle_plate: string | null;
  assigned_manpowers?: number[];
  assigned_manpower_users?: { id: number; username: string }[];
  zones: { id: number; name: string }[];
};

type Vehicle = { id: number; plate: string; make?: string | null; model?: string | null };
type Manpower = { id: number; username: string };

const VehiclesDrivers = () => {
  const { t } = useI18n();
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [manpower, setManpower] = useState<Manpower[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editVehicleId, setEditVehicleId] = useState<string>('');
  const [editManpowerIds, setEditManpowerIds] = useState<Set<number>>(new Set());

  function load() {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${apiBase}/api/manager/drivers/with-assignments`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/manager/vehicles`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/manager/manpower`, { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(async ([dr, vr, mr]) => {
        const ddata = await dr.json();
        const vdata = await vr.json();
        const mdata = await mr.json();
        if (!dr.ok) throw new Error(ddata?.error || 'Failed to load drivers');
        if (!vr.ok) throw new Error(vdata?.error || 'Failed to load vehicles');
        if (!mr.ok) throw new Error(mdata?.error || 'Failed to load manpower');
        const list: DriverRow[] = (ddata.drivers || []).map((d: any) => ({
          id: d.id,
          username: d.username,
          vehicle_id: d.vehicle_id ?? null,
          vehicle_plate: d.vehicle_plate || null,
          assigned_manpowers: Array.isArray(d.assigned_manpowers) ? d.assigned_manpowers.map((x: any) => Number(x)) : [],
          assigned_manpower_users: Array.isArray(d.assigned_manpower_users) ? d.assigned_manpower_users.map((u: any) => ({ id: Number(u.id), username: String(u.username) })) : [],
          zones: Array.isArray(d.zones) ? d.zones.map((z: any) => ({ id: Number(z.id), name: z.name })) : []
        }));
        setDrivers(list);
        setVehicles((vdata.vehicles || []).map((v: any) => ({ id: v.id, plate: v.plate, make: v.make, model: v.model })));
        setManpower((mdata.manpower || []).map((u: any) => ({ id: u.id, username: u.username })));
      })
      .catch((e: any) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function startEdit(d: DriverRow) {
    setEditingId(d.id);
    setEditVehicleId(d.vehicle_id != null ? String(d.vehicle_id) : '');
    setEditManpowerIds(new Set(d.assigned_manpowers || []));
  }

  function toggleManpowerId(id: number) {
    setEditManpowerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditVehicleId('');
    setEditManpowerIds(new Set());
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
      // vehicle manpowers set
      await fetch(`${apiBase}/api/manager/drivers/${driverId}/vehicle/manpowers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ manpowerIds: Array.from(editManpowerIds) })
      });
      cancelEdit();
      load();
    } catch (e: any) {
      setError(e?.message || 'Failed to save assignments');
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-amber-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">{t('vehDrv.title')}</h2>
      {error && <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">{error}</div>}
      {loading ? (
        <div className="text-gray-600">{t('vehDrv.loading')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map(d => (
            <div key={d.id} className="bg-white rounded-2xl shadow-md p-4 border border-amber-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{d.username}</h3>
                <span className="text-sm text-amber-700"></span>
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-gray-600 text-sm">{t('vehDrv.assignedCar')}:</span>
                  <span className="ml-2 font-medium text-gray-900">{d.vehicle_plate || t('vehDrv.notSet')}</span>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">{t('vehDrv.assignedManpowers')}:</span>
                  <span className="ml-2 font-medium text-gray-900">{d.assigned_manpower_users && d.assigned_manpower_users.length ? d.assigned_manpower_users.map(u => u.username).join(', ') : t('vehDrv.none')}</span>
                </div>
                <div>
                  {/* Zones intentionally hidden per request */}
                </div>
              </div>

              {editingId === d.id ? (
                <div className="mt-3 border-t pt-3 space-y-3">
                  <div>
                    <label className="block text-sm text-gray-800">{t('vehDrv.assignVehicle')}</label>
                    <select value={editVehicleId} onChange={e => setEditVehicleId(e.target.value)} className="mt-1 w-full border rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                      <option value="">{t('vehDrv.noneOption')}</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.plate}{v.make || v.model ? ` (${[v.make, v.model].filter(Boolean).join(' ')})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">{t('vehDrv.assignManpowersToVehicle')}</label>
                    <div className="max-h-40 overflow-auto border rounded p-2 space-y-1 bg-amber-50/40">
                      {manpower.map(mp => (
                        <label key={mp.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={editManpowerIds.has(mp.id)} onChange={() => toggleManpowerId(mp.id)} />
                          <span>{mp.username}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => saveEdit(d.id)} className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm transition-colors">{t('vehDrv.save')}</button>
                    <button onClick={cancelEdit} className="px-3 py-2 border border-amber-200 hover:border-amber-300 text-amber-800 rounded text-sm transition-colors bg-amber-50">{t('vehDrv.cancel')}</button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <button onClick={() => startEdit(d)} className="text-amber-700 hover:text-amber-800 underline text-sm">{t('vehDrv.manageManpowers')}</button>
                </div>
              )}
            </div>
          ))}
          {!drivers.length && (
            <div className="text-gray-600">{t('vehDrv.noDrivers')}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default VehiclesDrivers;
