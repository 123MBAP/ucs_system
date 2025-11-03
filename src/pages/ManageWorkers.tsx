import { useEffect, useState, type ReactNode } from 'react';
import LoadingSpinner from '../Components/LoadingSpinner';

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

  // Section Header Component
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

  // Subsection Header Component
  const SubsectionHeader = ({ title }: { title: string }) => (
    <h3 className="text-lg font-semibold mb-4 pb-2 border-b" style={{ color: colors.text, borderColor: colors.border }}>
      {title}
    </h3>
  );

  // Card Component
  const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
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

  // Button Components
  const PrimaryButton = ({ children, onClick, disabled = false, loading = false, className = '' }: { 
    children: ReactNode; 
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
      {loading && <LoadingSpinner size={16} className="border-white/60 border-t-white" />}
      {children}
    </button>
  );

  const OutlineButton = ({ children, onClick, disabled = false, className = '' }: { 
    children: ReactNode; 
    onClick?: () => void; 
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium border transition-colors ${className}`}
      style={{ 
        color: colors.text,
        borderColor: colors.border,
        backgroundColor: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
      onMouseOver={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = colors.background;
        }
      }}
      onMouseOut={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {children}
    </button>
  );

  return (
    <div className="p-6 space-y-8 min-h-screen" style={{ backgroundColor: colors.background }}>
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: colors.text }}>Manage Workers</h1>
        <p className="text-lg" style={{ color: colors.textLight }}>
          Manage supervisors, chiefs, manpower, and drivers across your organization
        </p>
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
          {/* SECTION 1: SUPERVISORS */}
          <section>
            <SectionHeader title="Manage Supervisors" number={1} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {supervisors.map(s => (
                <Card key={s.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: colors.text }}>{s.username}</h3>
                      <span className="text-sm" style={{ color: colors.textLight }}>ID: #{s.id}</span>
                    </div>
                    {editingId === s.id ? (
                      <OutlineButton onClick={cancelEdit} className="text-sm px-3 py-1">
                        Close
                      </OutlineButton>
                    ) : (
                      <button 
                        onClick={() => startEdit(s)}
                        className="text-sm font-medium underline px-3 py-1 rounded"
                        style={{ color: colors.primary }}
                      >
                        Manage
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 mb-4">
                    <div>
                      <span className="text-sm font-medium" style={{ color: colors.textLight }}>Assigned Vehicles:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.vehicles && s.vehicles.length ? 
                          s.vehicles.map(v => (
                            <span key={v.id} className="px-2 py-1 text-xs rounded border" style={{ borderColor: colors.border }}>
                              {v.plate}
                            </span>
                          )) : 
                          <span className="text-sm" style={{ color: colors.textLight }}>None</span>
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium" style={{ color: colors.textLight }}>Zones:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.zones && s.zones.length ? 
                          s.zones.map(z => (
                            <span key={z.id} className="px-2 py-1 text-xs rounded border" style={{ borderColor: colors.border }}>
                              {z.name}
                            </span>
                          )) : 
                          <span className="text-sm" style={{ color: colors.textLight }}>None</span>
                        }
                      </div>
                    </div>
                  </div>

                  {editingId === s.id && (
                    <div className="space-y-4 border-t pt-4" style={{ borderColor: colors.border }}>
                      {/* Assign Vehicle */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>Assign Vehicle</label>
                        <select 
                          value={editVehicleId} 
                          onChange={e => setEditVehicleId(e.target.value)} 
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-amber-600 focus:ring-amber-600"
                          style={{ 
                            borderColor: colors.border
                          }}
                        >
                          <option value="">Select a vehicle…</option>
                          {vehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.plate}</option>
                          ))}
                        </select>
                        <div className="mt-2">
                          <PrimaryButton
                            onClick={() => saveVehicle(s.id)}
                            disabled={!editVehicleId || !!actionLoading[`saveVehicle-${s.id}`]}
                            loading={!!actionLoading[`saveVehicle-${s.id}`]}
                            className="text-sm px-3 py-1"
                          >
                            Add Vehicle
                          </PrimaryButton>
                        </div>
                      </div>

                      {/* Unassign Vehicles */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>Unassign Vehicles</label>
                        <div className="flex flex-wrap gap-2">
                          {s.vehicles.map(v => (
                            <button 
                              key={v.id} 
                              onClick={() => unassignVehicle(s.id, v.id)}
                              className="px-3 py-1 text-xs rounded-lg border flex items-center gap-1 transition-colors"
                              style={{ borderColor: colors.border }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.background}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {v.plate} <span>✕</span>
                            </button>
                          ))}
                          {!s.vehicles.length && <div className="text-sm" style={{ color: colors.textLight }}>No vehicles to unassign</div>}
                        </div>
                      </div>

                      {/* Add Zone */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>Add Zone</label>
                        <div className="flex gap-2">
                          <select 
                            value={addZoneId} 
                            onChange={e => setAddZoneId(e.target.value)} 
                            className="flex-1 border rounded-lg px-3 py-2 text-sm"
                            style={{ borderColor: colors.border }}
                          >
                            <option value="">Select a zone…</option>
                            {zones
                              .filter(z => !s.zones.some(sz => sz.id === z.id))
                              .map(z => (
                                <option key={z.id} value={z.id}>{z.name}</option>
                              ))}
                          </select>
                          <PrimaryButton
                            onClick={() => addZone(s.id)}
                            disabled={!addZoneId || !!actionLoading[`addZone-${s.id}`]}
                            loading={!!actionLoading[`addZone-${s.id}`]}
                            className="text-sm px-3 py-1"
                          >
                            Add
                          </PrimaryButton>
                        </div>
                      </div>

                      {/* Remove Zones */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>Remove Zones</label>
                        <div className="flex flex-wrap gap-2">
                          {s.zones.map(z => (
                            <button 
                              key={z.id} 
                              onClick={() => removeZone(s.id, z.id)}
                              className="px-3 py-1 text-xs rounded-lg border flex items-center gap-1 transition-colors"
                              style={{ borderColor: colors.border }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.background}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {z.name} <span>✕</span>
                            </button>
                          ))}
                          {!s.zones.length && <div className="text-sm" style={{ color: colors.textLight }}>No zones to remove</div>}
                        </div>
                      </div>

                      {/* Move Zones */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>Move Zones to Another Supervisor</label>
                        <div className="space-y-3">
                          {s.zones.map(z => (
                            <div key={z.id} className="flex items-center gap-2">
                              <span className="text-sm flex-1" style={{ color: colors.text }}>{z.name}</span>
                              <select
                                value={moveSelection[z.id] || ''}
                                onChange={e => setMoveSelection(prev => ({ ...prev, [z.id]: e.target.value }))}
                                className="border rounded-lg px-2 py-1 text-sm"
                                style={{ borderColor: colors.border }}
                              >
                                <option value="">Select supervisor…</option>
                                {supervisors.filter(sv => sv.id !== s.id).map(sv => (
                                  <option key={sv.id} value={sv.id}>{sv.username}</option>
                                ))}
                              </select>
                              <PrimaryButton
                                onClick={() => moveZone(z.id, moveSelection[z.id])}
                                disabled={!moveSelection[z.id] || !!actionLoading[`moveZone-${z.id}`]}
                                loading={!!actionLoading[`moveZone-${z.id}`]}
                                className="text-sm px-2 py-1"
                              >
                                Move
                              </PrimaryButton>
                            </div>
                          ))}
                          {!s.zones.length && <div className="text-sm" style={{ color: colors.textLight }}>No zones to move</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
              {!supervisors.length && (
                <Card>
                  <div className="text-center py-8" style={{ color: colors.textLight }}>
                    No supervisors found
                  </div>
                </Card>
              )}
            </div>

            {/* Unassigned Resources */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Unassigned Vehicles */}
              <Card>
                <SubsectionHeader title="Unassigned Vehicles" />
                {(() => {
                  const assignedVehicleIds = new Set<number>();
                  supervisors.forEach(s => (s.vehicles || []).forEach(v => assignedVehicleIds.add(v.id)));
                  const vehiclesNoSupervisor = vehicles.filter(v => !assignedVehicleIds.has(v.id));
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <select 
                          className="flex-1 border rounded-lg px-3 py-2 text-sm"
                          style={{ borderColor: colors.border }}
                          value={assignVehicleNoSup} 
                          onChange={e => setAssignVehicleNoSup(e.target.value)}
                        >
                          <option value="">Select vehicle…</option>
                          {vehiclesNoSupervisor.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                        </select>
                        <select 
                          className="flex-1 border rounded-lg px-3 py-2 text-sm"
                          style={{ borderColor: colors.border }}
                          value={assignVehicleToSupervisorId} 
                          onChange={e => setAssignVehicleToSupervisorId(e.target.value)}
                        >
                          <option value="">Select supervisor…</option>
                          {supervisors.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
                        </select>
                        <PrimaryButton
                          disabled={!assignVehicleNoSup || !assignVehicleToSupervisorId || !!actionLoading.assignVehicleNoSup}
                          loading={!!actionLoading.assignVehicleNoSup}
                          onClick={() => {
                            const vId = Number(assignVehicleNoSup); const sId = Number(assignVehicleToSupervisorId);
                            if (Number.isFinite(vId) && Number.isFinite(sId)) assignVehicleToSupervisor(sId, vId);
                          }}
                          className="text-sm whitespace-nowrap"
                        >
                          Assign
                        </PrimaryButton>
                      </div>
                      {vehiclesNoSupervisor.length === 0 && (
                        <div className="text-sm text-center py-4" style={{ color: colors.textLight }}>
                          All vehicles are assigned to supervisors
                        </div>
                      )}
                    </div>
                  );
                })()}
              </Card>

              {/* Unassigned Zones */}
              <Card>
                <SubsectionHeader title="Unassigned Zones" />
                {(() => {
                  const assignedZoneIds = new Set<number>();
                  supervisors.forEach(s => (s.zones || []).forEach(z => assignedZoneIds.add(z.id)));
                  const zonesNoSupervisor = zones.filter(z => !assignedZoneIds.has(z.id));
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <select 
                          className="flex-1 border rounded-lg px-3 py-2 text-sm"
                          style={{ borderColor: colors.border }}
                          value={assignZoneNoSup} 
                          onChange={e => setAssignZoneNoSup(e.target.value)}
                        >
                          <option value="">Select zone…</option>
                          {zonesNoSupervisor.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </select>
                        <select 
                          className="flex-1 border rounded-lg px-3 py-2 text-sm"
                          style={{ borderColor: colors.border }}
                          value={assignZoneToSupervisorId} 
                          onChange={e => setAssignZoneToSupervisorId(e.target.value)}
                        >
                          <option value="">Select supervisor…</option>
                          {supervisors.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
                        </select>
                        <PrimaryButton
                          disabled={!assignZoneNoSup || !assignZoneToSupervisorId || !!actionLoading.assignZoneNoSup}
                          loading={!!actionLoading.assignZoneNoSup}
                          onClick={() => {
                            const zId = Number(assignZoneNoSup); const sId = Number(assignZoneToSupervisorId);
                            if (Number.isFinite(zId) && Number.isFinite(sId)) assignZoneToSupervisor(sId, zId);
                          }}
                          className="text-sm whitespace-nowrap"
                        >
                          Assign
                        </PrimaryButton>
                      </div>
                      {zonesNoSupervisor.length === 0 && (
                        <div className="text-sm text-center py-4" style={{ color: colors.textLight }}>
                          All zones are assigned to supervisors
                        </div>
                      )}
                    </div>
                  );
                })()}
              </Card>
            </div>
          </section>

          {/* SECTION 2: CHIEFS */}
          <section>
            <SectionHeader title="Manage Chiefs" number={2} />
            
            <div className="space-y-6">
              {/* Chiefs with Zones */}
              <Card>
                <SubsectionHeader title="Chiefs and Their Zones" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chiefs.map(ch => {
                    const chZones = zones.filter(z => z.assigned_chief === ch.id);
                    if (chZones.length === 0) return null;
                    return (
                      <div key={ch.id} className="border rounded-lg p-4" style={{ borderColor: colors.border }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-semibold" style={{ color: colors.text }}>{ch.username}</div>
                          <button 
                            onClick={() => setManageChief(prev => ({ ...prev, [ch.id]: !prev[ch.id] }))}
                            className="text-sm font-medium px-3 py-1 rounded border"
                            style={{ 
                              color: colors.primary,
                              borderColor: colors.primary
                            }}
                          >
                            {manageChief[ch.id] ? 'Done' : 'Manage'}
                          </button>
                        </div>
                        <div className="space-y-3">
                          {chZones.map(z => (
                            <div key={z.id} className="flex items-center justify-between text-sm p-2 rounded border" style={{ borderColor: colors.border }}>
                              <span style={{ color: colors.text }}>{z.name}</span>
                              {manageChief[ch.id] && (
                                <div className="flex items-center gap-2">
                                  <button
                                    className="px-2 py-1 text-xs rounded border"
                                    style={{ borderColor: colors.border }}
                                    disabled={!!actionLoading[`removeChief-${z.id}`]}
                                    onClick={() => removeZoneChief(z.id)}
                                  >
                                    Unassign
                                  </button>
                                  <select
                                    className="border rounded px-2 py-1 text-xs"
                                    style={{ borderColor: colors.border }}
                                    value={moveZoneChiefTarget[z.id] || ''}
                                    onChange={e => setMoveZoneChiefTarget(prev => ({ ...prev, [z.id]: e.target.value }))}
                                  >
                                    <option value="">Move to…</option>
                                    {chiefs.filter(c => c.id !== ch.id).map(c => (
                                      <option key={c.id} value={c.id}>{c.username}</option>
                                    ))}
                                  </select>
                                  <PrimaryButton
                                    disabled={!moveZoneChiefTarget[z.id] || !!actionLoading[`setChief-${z.id}`]}
                                    loading={!!actionLoading[`setChief-${z.id}`]}
                                    onClick={() => {
                                      const target = Number(moveZoneChiefTarget[z.id]);
                                      if (Number.isFinite(target)) setZoneChief(z.id, target);
                                    }}
                                    className="text-xs px-2 py-1"
                                  >
                                    Move
                                  </PrimaryButton>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {chiefs.filter(ch => zones.some(z => z.assigned_chief === ch.id)).length === 0 && (
                    <div className="col-span-full text-center py-8" style={{ color: colors.textLight }}>
                      No chiefs with assigned zones
                    </div>
                  )}
                </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Zones with no Chief */}
                <Card>
                  <SubsectionHeader title="Zones Needing Chiefs" />
                  {(() => {
                    const zonesNoChief = zones.filter(z => !z.assigned_chief);
                    const chiefsNoZones = chiefs.filter(c => zones.every(z => z.assigned_chief !== c.id));
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <select 
                            className="flex-1 border rounded-lg px-3 py-2 text-sm"
                            style={{ borderColor: colors.border }}
                            value={noChiefSelectedZone} 
                            onChange={e => setNoChiefSelectedZone(e.target.value)}
                          >
                            <option value="">Select zone…</option>
                            {zonesNoChief.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                          </select>
                          <select 
                            className="flex-1 border rounded-lg px-3 py-2 text-sm"
                            style={{ borderColor: colors.border }}
                            value={noChiefAssignChiefId} 
                            onChange={e => setNoChiefAssignChiefId(e.target.value)}
                          >
                            <option value="">Select chief…</option>
                            {chiefsNoZones.map(c => <option key={c.id} value={c.id}>{c.username}</option>)}
                          </select>
                          <PrimaryButton
                            disabled={!noChiefSelectedZone || !noChiefAssignChiefId || !!actionLoading[`setChief-${Number(noChiefSelectedZone)}`]}
                            loading={!!actionLoading[`setChief-${Number(noChiefSelectedZone)}`]}
                            onClick={() => {
                              const zId = Number(noChiefSelectedZone); const cId = Number(noChiefAssignChiefId);
                              if (Number.isFinite(zId) && Number.isFinite(cId)) setZoneChief(zId, cId);
                              setNoChiefSelectedZone(''); setNoChiefAssignChiefId('');
                            }}
                            className="text-sm whitespace-nowrap"
                          >
                            Assign
                          </PrimaryButton>
                        </div>
                        {zonesNoChief.length === 0 && (
                          <div className="text-sm text-center py-4" style={{ color: colors.textLight }}>
                            All zones have chiefs assigned
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </Card>

                {/* Chiefs with no Zones */}
                <Card>
                  <SubsectionHeader title="Chiefs Without Zones" />
                  {(() => {
                    const chiefsNoZones = chiefs.filter(c => zones.every(z => z.assigned_chief !== c.id));
                    const zonesNoChief = zones.filter(z => !z.assigned_chief);
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <select 
                            className="flex-1 border rounded-lg px-3 py-2 text-sm"
                            style={{ borderColor: colors.border }}
                            value={noZoneSelectedChief} 
                            onChange={e => setNoZoneSelectedChief(e.target.value)}
                          >
                            <option value="">Select chief…</option>
                            {chiefsNoZones.map(c => <option key={c.id} value={c.id}>{c.username}</option>)}
                          </select>
                          <select 
                            className="flex-1 border rounded-lg px-3 py-2 text-sm"
                            style={{ borderColor: colors.border }}
                            value={noZoneAssignZoneId} 
                            onChange={e => setNoZoneAssignZoneId(e.target.value)}
                          >
                            <option value="">Select zone…</option>
                            {zonesNoChief.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                          </select>
                          <PrimaryButton
                            disabled={!noZoneSelectedChief || !noZoneAssignZoneId || !!actionLoading[`setChief-${Number(noZoneAssignZoneId)}`]}
                            loading={!!actionLoading[`setChief-${Number(noZoneAssignZoneId)}`]}
                            onClick={() => {
                              const cId = Number(noZoneSelectedChief); const zId = Number(noZoneAssignZoneId);
                              if (Number.isFinite(zId) && Number.isFinite(cId)) setZoneChief(zId, cId);
                              setNoZoneSelectedChief(''); setNoZoneAssignZoneId('');
                            }}
                            className="text-sm whitespace-nowrap"
                          >
                            Assign
                          </PrimaryButton>
                        </div>
                        {chiefsNoZones.length === 0 && (
                          <div className="text-sm text-center py-4" style={{ color: colors.textLight }}>
                            All chiefs have zones assigned
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </Card>
              </div>
            </div>
          </section>

          {/* SECTION 3: MANPOWER */}
          <section>
            <SectionHeader title="Manage Manpower" number={3} />
            
            <div className="space-y-6">
              {/* Vehicles with Manpower */}
              <Card>
                <SubsectionHeader title="Vehicles and Their Manpower" />
                <div className="space-y-4">
                  {vehicles.map(v => (
                    <div key={v.id} className="border rounded-lg p-4" style={{ borderColor: colors.border }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-semibold" style={{ color: colors.text }}>{v.plate}</div>
                        <button
                          onClick={() => setManageVehicle(prev => ({ ...prev, [v.id]: !prev[v.id] }))}
                          className="text-sm font-medium px-3 py-1 rounded border"
                          style={{ 
                            color: colors.primary,
                            borderColor: colors.primary
                          }}
                        >
                          {manageVehicle[v.id] ? 'Done' : 'Manage'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(v.manpower || []).length === 0 && (
                          <div className="text-sm" style={{ color: colors.textLight }}>No manpower assigned</div>
                        )}
                        {(v.manpower || []).map(m => (
                          <div key={m.manpower_id} className="flex items-center gap-2 border rounded-lg px-3 py-2" style={{ borderColor: colors.border }}>
                            <span className="text-sm" style={{ color: colors.text }}>{m.username}</span>
                            {manageVehicle[v.id] && (
                              <div className="flex items-center gap-2">
                                <button
                                  className="px-2 py-1 text-xs rounded border"
                                  style={{ borderColor: colors.border }}
                                  onClick={() => unassignManpowerVehicle(m.manpower_id)}
                                >
                                  Remove
                                </button>
                                <select
                                  className="border rounded px-2 py-1 text-xs"
                                  style={{ borderColor: colors.border }}
                                  value={moveManpowerTarget[m.manpower_id] || ''}
                                  onChange={e => setMoveManpowerTarget(prev => ({ ...prev, [m.manpower_id]: e.target.value }))}
                                >
                                  <option value="">Move to…</option>
                                  {vehicles.filter(ov => ov.id !== v.id).map(ov => (
                                    <option key={ov.id} value={ov.id}>{ov.plate}</option>
                                  ))}
                                </select>
                                <PrimaryButton
                                  disabled={!moveManpowerTarget[m.manpower_id] || !!actionLoading[`assignManpower-${m.manpower_id}`]}
                                  loading={!!actionLoading[`assignManpower-${m.manpower_id}`]}
                                  onClick={() => {
                                    const target = Number(moveManpowerTarget[m.manpower_id]);
                                    if (Number.isFinite(target)) assignManpowerVehicle(m.manpower_id, target);
                                  }}
                                  className="text-xs px-2 py-1"
                                >
                                  Move
                                </PrimaryButton>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Unassigned Manpower */}
              <Card>
                <SubsectionHeader title="Unassigned Manpower" />
                {(() => {
                  const assignedIds = new Set<number>();
                  vehicles.forEach(v => (v.manpower || []).forEach(m => assignedIds.add(m.manpower_id)));
                  const unassigned = manpower.filter(m => !assignedIds.has(m.id));
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <select
                          className="flex-1 border rounded-lg px-3 py-2 text-sm"
                          style={{ borderColor: colors.border }}
                          value={assignVehicleForSelection}
                          onChange={e => setAssignVehicleForSelection(e.target.value)}
                        >
                          <option value="">Select vehicle…</option>
                          {vehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.plate}</option>
                          ))}
                        </select>
                        <PrimaryButton
                          disabled={!assignVehicleForSelection || Object.keys(unassignedSelected).filter(id => unassignedSelected[Number(id)]).length === 0}
                          onClick={async () => {
                            const selectedIds = Object.keys(unassignedSelected).map(Number).filter(id => unassignedSelected[id]);
                            const target = Number(assignVehicleForSelection);
                            for (const mid of selectedIds) {
                              await assignManpowerVehicle(mid, target);
                            }
                            setUnassignedSelected({});
                            setAssignVehicleForSelection('');
                          }}
                          className="text-sm whitespace-nowrap"
                        >
                          Assign Selected
                        </PrimaryButton>
                        <button
                          className="px-4 py-2 rounded-lg font-medium border text-sm whitespace-nowrap"
                          style={{ 
                            borderColor: colors.error,
                            color: colors.error
                          }}
                          disabled={Object.keys(unassignedSelected).filter(id => unassignedSelected[Number(id)]).length === 0}
                          onClick={async () => {
                            const selectedIds = Object.keys(unassignedSelected).map(Number).filter(id => unassignedSelected[id]);
                            if (!selectedIds.length) return;
                            const ok = window.confirm(`Delete ${selectedIds.length} manpower user(s)? This cannot be undone.`);
                            if (!ok) return;
                            for (const mid of selectedIds) {
                              await deleteManpower(mid);
                            }
                            setUnassignedSelected({});
                          }}
                        >
                          Delete Selected
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {unassigned.map(u => (
                          <label key={u.id} className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={!!unassignedSelected[u.id]}
                              onChange={e => setUnassignedSelected(prev => ({ ...prev, [u.id]: e.target.checked }))}
                              className="rounded"
                              style={{ accentColor: colors.primary }}
                            />
                            <span className="text-sm" style={{ color: colors.text }}>{u.username}</span>
                          </label>
                        ))}
                        {unassigned.length === 0 && (
                          <div className="col-span-full text-center py-8" style={{ color: colors.textLight }}>
                            No unassigned manpower
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </Card>
            </div>
          </section>

          {/* SECTION 4: DRIVERS */}
          <section>
            <SectionHeader title="Manage Drivers" number={4} />
            
            <div className="space-y-6">
              {/* Drivers with Vehicles */}
              <Card>
                <SubsectionHeader title="Drivers and Their Vehicles" />
                {(() => {
                  const entries: { driver: UserRef; vehicle: Vehicle }[] = [];
                  const driverMap = new Map<number, UserRef>(drivers.map(d => [d.id, d]));
                  vehicles.forEach(v => (v.drivers || []).forEach(d => {
                    const ref = d.user_id && driverMap.get(d.user_id);
                    if (ref) entries.push({ driver: ref, vehicle: v });
                  }));
                  const vehiclesNoDriver = vehicles.filter(v => !v.drivers || v.drivers.length === 0);
                  return (
                    <div className="space-y-3">
                      {entries.length === 0 && (
                        <div className="text-center py-8" style={{ color: colors.textLight }}>
                          No drivers currently assigned to vehicles
                        </div>
                      )}
                      {entries.map(({ driver, vehicle }) => (
                        <div key={`${driver.id}-${vehicle.id}`} className="flex items-center justify-between p-3 border rounded-lg" style={{ borderColor: colors.border }}>
                          <div className="text-sm">
                            <span className="font-medium" style={{ color: colors.text }}>{driver.username}</span>
                            <span className="ml-2" style={{ color: colors.textLight }}>→ {vehicle.plate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {manageDriver[driver.id] ? (
                              <>
                                <button 
                                  className="px-3 py-1 text-xs rounded border"
                                  style={{ borderColor: colors.border }}
                                  disabled={!!actionLoading[`assignDriver-${driver.id}`]} 
                                  onClick={() => unassignDriverVehicle(driver.id)}
                                >
                                  Remove
                                </button>
                                <select
                                  className="border rounded px-2 py-1 text-xs"
                                  style={{ borderColor: colors.border }}
                                  value={moveDriverTargetVehicle[driver.id] || ''}
                                  onChange={e => setMoveDriverTargetVehicle(prev => ({ ...prev, [driver.id]: e.target.value }))}
                                >
                                  <option value="">Move to…</option>
                                  {vehiclesNoDriver.filter(v => v.id !== vehicle.id).map(v => (
                                    <option key={v.id} value={v.id}>{v.plate}</option>
                                  ))}
                                </select>
                                <PrimaryButton
                                  disabled={!moveDriverTargetVehicle[driver.id] || !!actionLoading[`assignDriver-${driver.id}`]}
                                  loading={!!actionLoading[`assignDriver-${driver.id}`]}
                                  onClick={() => {
                                    const target = Number(moveDriverTargetVehicle[driver.id]);
                                    if (Number.isFinite(target)) assignDriverVehicle(driver.id, target);
                                  }}
                                  className="text-xs px-2 py-1"
                                >
                                  Move
                                </PrimaryButton>
                                <button 
                                  className="px-3 py-1 text-xs rounded border"
                                  style={{ borderColor: colors.border }}
                                  onClick={() => setManageDriver(prev => ({ ...prev, [driver.id]: false }))}
                                >
                                  Done
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => setManageDriver(prev => ({ ...prev, [driver.id]: true }))}
                                className="text-sm font-medium px-3 py-1 rounded border"
                                style={{ 
                                  color: colors.primary,
                                  borderColor: colors.primary
                                }}
                              >
                                Manage
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Unassigned Drivers */}
                <Card>
                  <SubsectionHeader title="Drivers Without Vehicles" />
                  {(() => {
                    const assignedDriverIds = new Set<number>();
                    vehicles.forEach(v => (v.drivers || []).forEach(d => assignedDriverIds.add(d.user_id)));
                    const unassignedDrivers = drivers.filter(d => !assignedDriverIds.has(d.id));
                    const vehiclesNoDriver = vehicles.filter(v => !v.drivers || v.drivers.length === 0);
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <select 
                            className="flex-1 border rounded-lg px-3 py-2 text-sm"
                            style={{ borderColor: colors.border }}
                            value={unassignedDriverId} 
                            onChange={e => setUnassignedDriverId(e.target.value)}
                          >
                            <option value="">Select driver…</option>
                            {unassignedDrivers.map(d => <option key={d.id} value={d.id}>{d.username}</option>)}
                          </select>
                          <select 
                            className="flex-1 border rounded-lg px-3 py-2 text-sm"
                            style={{ borderColor: colors.border }}
                            value={vehicleForUnassignedDriver} 
                            onChange={e => setVehicleForUnassignedDriver(e.target.value)}
                          >
                            <option value="">Select vehicle…</option>
                            {vehiclesNoDriver.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                          </select>
                          <PrimaryButton
                            disabled={!unassignedDriverId || !vehicleForUnassignedDriver || !!actionLoading[`assignDriver-${Number(unassignedDriverId)}`]}
                            loading={!!actionLoading[`assignDriver-${Number(unassignedDriverId)}`]}
                            onClick={() => {
                              const dId = Number(unassignedDriverId); const vId = Number(vehicleForUnassignedDriver);
                              if (Number.isFinite(dId) && Number.isFinite(vId)) assignDriverVehicle(dId, vId);
                              setUnassignedDriverId(''); setVehicleForUnassignedDriver('');
                            }}
                            className="text-sm whitespace-nowrap"
                          >
                            Assign
                          </PrimaryButton>
                        </div>
                        {unassignedDrivers.length === 0 && (
                          <div className="text-sm text-center py-4" style={{ color: colors.textLight }}>
                            All drivers have vehicles assigned
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </Card>

                {/* Vehicles without Drivers */}
                <Card>
                  <SubsectionHeader title="Vehicles Without Drivers" />
                  {(() => {
                    const assignedDriverIds = new Set<number>();
                    vehicles.forEach(v => (v.drivers || []).forEach(d => assignedDriverIds.add(d.user_id)));
                    const unassignedDrivers = drivers.filter(d => !assignedDriverIds.has(d.id));
                    const vehiclesNoDriver = vehicles.filter(v => !v.drivers || v.drivers.length === 0);
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <select 
                            className="flex-1 border rounded-lg px-3 py-2 text-sm"
                            style={{ borderColor: colors.border }}
                            value={vehicleNoDriverId} 
                            onChange={e => setVehicleNoDriverId(e.target.value)}
                          >
                            <option value="">Select vehicle…</option>
                            {vehiclesNoDriver.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                          </select>
                          <select 
                            className="flex-1 border rounded-lg px-3 py-2 text-sm"
                            style={{ borderColor: colors.border }}
                            value={driverNoVehicleId} 
                            onChange={e => setDriverNoVehicleId(e.target.value)}
                          >
                            <option value="">Select driver…</option>
                            {unassignedDrivers.map(d => <option key={d.id} value={d.id}>{d.username}</option>)}
                          </select>
                          <PrimaryButton
                            disabled={!vehicleNoDriverId || !driverNoVehicleId || !!actionLoading[`assignDriver-${Number(driverNoVehicleId)}`]}
                            loading={!!actionLoading[`assignDriver-${Number(driverNoVehicleId)}`]}
                            onClick={() => {
                              const vId = Number(vehicleNoDriverId); const dId = Number(driverNoVehicleId);
                              if (Number.isFinite(dId) && Number.isFinite(vId)) assignDriverVehicle(dId, vId);
                              setVehicleNoDriverId(''); setDriverNoVehicleId('');
                            }}
                            className="text-sm whitespace-nowrap"
                          >
                            Assign
                          </PrimaryButton>
                        </div>
                        {vehiclesNoDriver.length === 0 && (
                          <div className="text-sm text-center py-4" style={{ color: colors.textLight }}>
                            All vehicles have drivers assigned
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </Card>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default ManageWorkers;