import { useEffect, useState } from 'react';
import { useI18n } from 'src/lib/i18n';
import LoadingSpinner from '../Components/LoadingSpinner';
import SupervisorsSection from './sections/SupervisorsSection';
import ChiefsSection from './sections/ChiefsSection';
import DriversManpowerSection from './sections/DriversManpowerSection';

const apiBase = import.meta.env.VITE_API_URL as string;

type SupervisorRow = {
  id: number;
  username: string;
  vehicles: { id: number; plate: string }[];
  zones: { id: number; name: string }[];
};

type Vehicle = { id: number; plate: string; manpower?: { manpower_id: number; username: string }[]; drivers?: { user_id: number; username?: string }[] };

type Zone = { id: number; name: string; assigned_chief?: number | null; supervisor_id?: number | null };

type UserRef = { id: number; username: string };

const ManageWorkers = () => {
  const { t } = useI18n();
  const [supervisors, setSupervisors] = useState<SupervisorRow[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [chiefs, setChiefs] = useState<UserRef[]>([]);
  const [drivers, setDrivers] = useState<UserRef[]>([]);
  const [manpower, setManpower] = useState<UserRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editVehicleId, setEditVehicleId] = useState<string>('');
  const [addZoneId, setAddZoneId] = useState<string>('');
  const [moveSelection, setMoveSelection] = useState<Record<number, string>>({});

  // Manage manpower section state
  const [manageVehicle, setManageVehicle] = useState<Record<number, boolean>>({});
  const [moveManpowerTarget, setMoveManpowerTarget] = useState<Record<number, string>>({});
  const [unassignedSelected, setUnassignedSelected] = useState<Record<number, boolean>>({});
  const [assignVehicleForSelection, setAssignVehicleForSelection] = useState<string>('');

  // Manage drivers section state
  const [manageDriver, setManageDriver] = useState<Record<number, boolean>>({});
  const [moveDriverTargetVehicle, setMoveDriverTargetVehicle] = useState<Record<number, string>>({});
  const [unassignedDriverId, setUnassignedDriverId] = useState<string>('');
  const [vehicleForUnassignedDriver, setVehicleForUnassignedDriver] = useState<string>('');
  const [vehicleNoDriverId, setVehicleNoDriverId] = useState<string>('');
  const [driverNoVehicleId, setDriverNoVehicleId] = useState<string>('');

  const [assignVehicleNoSup, setAssignVehicleNoSup] = useState<string>('');
  const [assignVehicleToSupervisorId, setAssignVehicleToSupervisorId] = useState<string>('');
  const [assignZoneNoSup, setAssignZoneNoSup] = useState<string>('');
  const [assignZoneToSupervisorId, setAssignZoneToSupervisorId] = useState<string>('');

  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Manage chiefs section state
  const [manageChief, setManageChief] = useState<Record<number, boolean>>({});
  const [moveZoneChiefTarget, setMoveZoneChiefTarget] = useState<Record<number, string>>({});
  const [noChiefSelectedZone, setNoChiefSelectedZone] = useState<string>('');
  const [noChiefAssignChiefId, setNoChiefAssignChiefId] = useState<string>('');
  const [noZoneSelectedChief, setNoZoneSelectedChief] = useState<string>('');
  const [noZoneAssignZoneId, setNoZoneAssignZoneId] = useState<string>('');

  // Color constants
  const colors = {
    primary: '#D97706',
    primaryHover: '#B45309',
    accent: '#15803D',
    accentHover: '#166534',
    background: '#F3F4F6',
    cardBg: '#FFFFFF',
    border: '#E5E7EB',
    text: '#1E1E1E',
    textLight: '#6B7280',
    error: '#DC2626'
  };

  function load() {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/manageworkers/init`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load');
        const list: SupervisorRow[] = (data.supervisors || []).map((s: any) => ({
          id: s.id,
          username: s.username,
          vehicles: Array.isArray(s.vehicles) ? s.vehicles.map((v: any) => ({ id: Number(v.id), plate: String(v.plate) })) : [],
          zones: Array.isArray(s.zones) ? s.zones.map((z: any) => ({ id: Number(z.id), name: String(z.name) })) : [],
        }));
        setSupervisors(list);
        const driverMap = new Map<number, string>((data.drivers || []).map((d: any) => [Number(d.id), String(d.username)]));
        setVehicles((data.vehicles || []).map((v: any) => ({
          id: Number(v.id),
          plate: String(v.plate),
          manpower: Array.isArray(v.manpower) ? v.manpower.map((m: any) => ({ manpower_id: Number(m.manpower_id), username: String(m.username) })) : [],
          drivers: Array.isArray(v.drivers) ? v.drivers.map((d: any) => ({ user_id: Number(d.user_id), username: driverMap.get(Number(d.user_id)) })) : [],
        })));
        setZones((data.zones || []).map((z: any) => ({ id: Number(z.id), name: String(z.zone_name), assigned_chief: z.assigned_chief ?? null, supervisor_id: z.supervisor_id ?? null })));
        setChiefs((data.chiefs || []).map((u: any) => ({ id: Number(u.id), username: String(u.username) })));
        setDrivers((data.drivers || []).map((u: any) => ({ id: Number(u.id), username: String(u.username) })));
        setManpower((data.manpower || []).map((u: any) => ({ id: Number(u.id), username: String(u.username) })));
      })
      .catch((e: any) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }

  async function deleteManpower(manpowerId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`${apiBase}/api/manageworkers/manpower/${manpowerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    load();
  }

  useEffect(() => { load(); }, []);

  function startEdit(s: SupervisorRow) {
    setEditingId(s.id);
    setEditVehicleId('');
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
      setActionLoading(prev => ({ ...prev, [`saveVehicle-${supervisorId}`]: true }));
      const res = await fetch(`${apiBase}/api/manageworkers/supervisors/${supervisorId}/vehicle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vehicleId: Number(editVehicleId) })
      });
      if (res.status === 409) {
        const proceed = window.confirm('This vehicle is already assigned to another supervisor. Do you want to move it to this supervisor?');
        if (proceed) {
          await fetch(`${apiBase}/api/manageworkers/supervisors/${supervisorId}/vehicle/move`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ vehicleId: Number(editVehicleId) })
          });
        } else {
          return;
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
      setActionLoading(prev => ({ ...prev, [`saveVehicle-${supervisorId}`]: false }));
    }
  }

  async function unassignVehicle(supervisorId: number, vehicleId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`${apiBase}/api/manageworkers/supervisors/${supervisorId}/vehicle/${vehicleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    load();
  }

  async function assignVehicleToSupervisor(supervisorId: number, vehicleId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      setActionLoading(prev => ({ ...prev, assignVehicleNoSup: true }));
      const res = await fetch(`${apiBase}/api/manageworkers/supervisors/${supervisorId}/vehicle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vehicleId })
      });
      if (res.status === 409) {
        const proceed = window.confirm('This vehicle is already assigned to another supervisor. Do you want to move it to this supervisor?');
        if (proceed) {
          await fetch(`${apiBase}/api/manageworkers/supervisors/${supervisorId}/vehicle/move`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ vehicleId })
          });
        } else {
          return;
        }
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to assign vehicle');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to assign/move vehicle');
    } finally {
      setAssignVehicleNoSup('');
      setAssignVehicleToSupervisorId('');
      load();
      setActionLoading(prev => ({ ...prev, assignVehicleNoSup: false }));
    }
  }

  async function addZone(supervisorId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!addZoneId) return;
    try {
      setActionLoading(prev => ({ ...prev, [`addZone-${supervisorId}`]: true }));
      const res = await fetch(`${apiBase}/api/manageworkers/supervisors/${supervisorId}/zones/add`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ zoneId: Number(addZoneId) })
      });
      if (res.status === 409) {
        await res.json().catch(() => ({}));
        const proceed = window.confirm('This zone is already assigned to a supervisor. Do you want to move it to this supervisor?');
        if (proceed) {
          await fetch(`${apiBase}/api/manageworkers/supervisors/${supervisorId}/zones/move`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ zoneId: Number(addZoneId) })
          });
        } else {
          return;
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
      setActionLoading(prev => ({ ...prev, [`addZone-${supervisorId}`]: false }));
    }
  }

  async function assignZoneToSupervisor(supervisorId: number, zoneId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      setActionLoading(prev => ({ ...prev, assignZoneNoSup: true }));
      const res = await fetch(`${apiBase}/api/manageworkers/supervisors/${supervisorId}/zones/add`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ zoneId })
      });
      if (res.status === 409) {
        await res.json().catch(() => ({}));
        const proceed = window.confirm('This zone is already assigned to a supervisor. Do you want to move it to this supervisor?');
        if (proceed) {
          await fetch(`${apiBase}/api/manageworkers/supervisors/${supervisorId}/zones/move`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ zoneId })
          });
        } else {
          return;
        }
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to add zone');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to add/move zone');
    } finally {
      setAssignZoneNoSup('');
      setAssignZoneToSupervisorId('');
      load();
      setActionLoading(prev => ({ ...prev, assignZoneNoSup: false }));
    }
  }

  async function removeZone(supervisorId: number, zoneId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`${apiBase}/api/manageworkers/supervisors/${supervisorId}/zones/remove`, {
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
    setActionLoading(prev => ({ ...prev, [`moveZone-${zoneId}`]: true }));
    await fetch(`${apiBase}/api/manageworkers/supervisors/${targetSupervisorId}/zones/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ zoneId })
    });
    setMoveSelection(prev => ({ ...prev, [zoneId]: '' }));
    load();
    setActionLoading(prev => ({ ...prev, [`moveZone-${zoneId}`]: false }));
  }

  async function setZoneChief(zoneId: number, chiefUserId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setActionLoading(prev => ({ ...prev, [`setChief-${zoneId}`]: true }));
    await fetch(`${apiBase}/api/manageworkers/zones/${zoneId}/reassign-chief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ chiefUserId })
    });
    load();
    setActionLoading(prev => ({ ...prev, [`setChief-${zoneId}`]: false }));
  }

  async function removeZoneChief(zoneId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setActionLoading(prev => ({ ...prev, [`removeChief-${zoneId}`]: true }));
    await fetch(`${apiBase}/api/manageworkers/zones/${zoneId}/chief`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    load();
    setActionLoading(prev => ({ ...prev, [`removeChief-${zoneId}`]: false }));
  }

  async function assignDriverVehicle(driverUserId: number, vehicleId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setActionLoading(prev => ({ ...prev, [`assignDriver-${driverUserId}`]: true }));
    await fetch(`${apiBase}/api/manageworkers/drivers/${driverUserId}/vehicle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ vehicleId })
    });
    load();
    setActionLoading(prev => ({ ...prev, [`assignDriver-${driverUserId}`]: false }));
  }

  async function unassignDriverVehicle(driverUserId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`${apiBase}/api/manageworkers/drivers/${driverUserId}/vehicle`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    load();
  }

  async function assignManpowerVehicle(manpowerId: number, vehicleId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setActionLoading(prev => ({ ...prev, [`assignManpower-${manpowerId}`]: true }));
    await fetch(`${apiBase}/api/manageworkers/manpower/${manpowerId}/vehicle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ vehicleId })
    });
    load();
    setActionLoading(prev => ({ ...prev, [`assignManpower-${manpowerId}`]: false }));
  }

  async function unassignManpowerVehicle(manpowerId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`${apiBase}/api/manageworkers/manpower/${manpowerId}/vehicle`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    load();
  }

  return (
    <div className="p-6 space-y-8 min-h-screen" style={{ backgroundColor: colors.background }}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 ucs-gradient-text">{t('manageWorkers.title')}</h1>
        <p className="text-lg" style={{ color: colors.textLight }}>{t('manageWorkers.subtitle')}</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg text-white font-medium text-center" style={{ backgroundColor: colors.error }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size={32} className="border-gray-400 border-t-gray-600" />
        </div>
      ) : (
        <div className="space-y-12 max-w-7xl mx-auto">
          <SupervisorsSection
            t={t}
            colors={colors}
            supervisors={supervisors}
            vehicles={vehicles}
            zones={zones}
            editingId={editingId}
            editVehicleId={editVehicleId}
            addZoneId={addZoneId}
            moveSelection={moveSelection}
            assignVehicleNoSup={assignVehicleNoSup}
            assignVehicleToSupervisorId={assignVehicleToSupervisorId}
            assignZoneNoSup={assignZoneNoSup}
            assignZoneToSupervisorId={assignZoneToSupervisorId}
            actionLoading={actionLoading}
            startEdit={startEdit}
            cancelEdit={cancelEdit}
            setEditVehicleId={setEditVehicleId}
            setAddZoneId={setAddZoneId}
            setMoveSelection={setMoveSelection}
            setAssignVehicleNoSup={setAssignVehicleNoSup}
            setAssignVehicleToSupervisorId={setAssignVehicleToSupervisorId}
            setAssignZoneNoSup={setAssignZoneNoSup}
            setAssignZoneToSupervisorId={setAssignZoneToSupervisorId}
            saveVehicle={saveVehicle}
            unassignVehicle={unassignVehicle}
            addZone={addZone}
            removeZone={removeZone}
            moveZone={moveZone}
            assignVehicleToSupervisor={assignVehicleToSupervisor}
            assignZoneToSupervisor={assignZoneToSupervisor}
          />

          <ChiefsSection
            colors={colors}
            chiefs={chiefs}
            zones={zones}
            actionLoading={actionLoading}
            manageChief={manageChief}
            moveZoneChiefTarget={moveZoneChiefTarget}
            noChiefSelectedZone={noChiefSelectedZone}
            noChiefAssignChiefId={noChiefAssignChiefId}
            noZoneSelectedChief={noZoneSelectedChief}
            noZoneAssignZoneId={noZoneAssignZoneId}
            setManageChief={setManageChief}
            setMoveZoneChiefTarget={setMoveZoneChiefTarget}
            setNoChiefSelectedZone={setNoChiefSelectedZone}
            setNoChiefAssignChiefId={setNoChiefAssignChiefId}
            setNoZoneSelectedChief={setNoZoneSelectedChief}
            setNoZoneAssignZoneId={setNoZoneAssignZoneId}
            setZoneChief={setZoneChief}
            removeZoneChief={removeZoneChief}
          />

          <DriversManpowerSection
            colors={colors}
            vehicles={vehicles}
            drivers={drivers}
            manpower={manpower}
            actionLoading={actionLoading}
            manageVehicle={manageVehicle}
            moveManpowerTarget={moveManpowerTarget}
            unassignedSelected={unassignedSelected}
            assignVehicleForSelection={assignVehicleForSelection}
            setManageVehicle={setManageVehicle}
            setMoveManpowerTarget={setMoveManpowerTarget}
            setUnassignedSelected={setUnassignedSelected}
            setAssignVehicleForSelection={setAssignVehicleForSelection}
            assignManpowerVehicle={assignManpowerVehicle}
            unassignManpowerVehicle={unassignManpowerVehicle}
            deleteManpower={deleteManpower}
            manageDriver={manageDriver}
            moveDriverTargetVehicle={moveDriverTargetVehicle}
            unassignedDriverId={unassignedDriverId}
            vehicleForUnassignedDriver={vehicleForUnassignedDriver}
            vehicleNoDriverId={vehicleNoDriverId}
            driverNoVehicleId={driverNoVehicleId}
            setManageDriver={setManageDriver}
            setMoveDriverTargetVehicle={setMoveDriverTargetVehicle}
            setUnassignedDriverId={setUnassignedDriverId}
            setVehicleForUnassignedDriver={setVehicleForUnassignedDriver}
            setVehicleNoDriverId={setVehicleNoDriverId}
            setDriverNoVehicleId={setDriverNoVehicleId}
            assignDriverVehicle={assignDriverVehicle}
            unassignDriverVehicle={unassignDriverVehicle}
          />
        </div>
      )}
    </div>
  );
};
export default ManageWorkers;