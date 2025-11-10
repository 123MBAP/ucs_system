import { ReactNode } from 'react';
import LoadingSpinner from '../../Components/LoadingSpinner';

type SupervisorRow = {
  id: number;
  username: string;
  vehicles: { id: number; plate: string }[];
  zones: { id: number; name: string }[];
};

type Vehicle = { id: number; plate: string };

type Zone = { id: number; name: string };

type TFunc = (key: string) => string;

type Colors = {
  primary: string;
  primaryHover: string;
  accent: string;
  accentHover: string;
  background: string;
  cardBg: string;
  border: string;
  text: string;
  textLight: string;
  error: string;
};

export default function SupervisorsSection(props: {
  t: TFunc;
  colors: Colors;
  supervisors: SupervisorRow[];
  vehicles: Vehicle[];
  zones: Zone[];
  // edit/manage state
  editingId: number | null;
  editVehicleId: string;
  addZoneId: string;
  moveSelection: Record<number, string>;
  assignVehicleNoSup: string;
  assignVehicleToSupervisorId: string;
  assignZoneNoSup: string;
  assignZoneToSupervisorId: string;
  actionLoading: Record<string, boolean>;
  // setters
  startEdit: (s: SupervisorRow) => void;
  cancelEdit: () => void;
  setEditVehicleId: (v: string) => void;
  setAddZoneId: (v: string) => void;
  setMoveSelection: (updater: (prev: Record<number, string>) => Record<number, string>) => void;
  setAssignVehicleNoSup: (v: string) => void;
  setAssignVehicleToSupervisorId: (v: string) => void;
  setAssignZoneNoSup: (v: string) => void;
  setAssignZoneToSupervisorId: (v: string) => void;
  // actions
  saveVehicle: (supervisorId: number) => void | Promise<void>;
  unassignVehicle: (supervisorId: number, vehicleId: number) => void | Promise<void>;
  addZone: (supervisorId: number) => void | Promise<void>;
  removeZone: (supervisorId: number, zoneId: number) => void | Promise<void>;
  moveZone: (zoneId: number, targetSupervisorIdStr: string) => void | Promise<void>;
  assignVehicleToSupervisor: (supervisorId: number, vehicleId: number) => void | Promise<void>;
  assignZoneToSupervisor: (supervisorId: number, zoneId: number) => void | Promise<void>;
}) {
  const { t, colors, supervisors, vehicles, zones, editingId, editVehicleId, moveSelection, assignVehicleNoSup,
    assignVehicleToSupervisorId, assignZoneNoSup, assignZoneToSupervisorId, actionLoading,
    startEdit, cancelEdit, setEditVehicleId, setMoveSelection, setAssignVehicleNoSup, setAssignVehicleToSupervisorId,
    setAssignZoneNoSup, setAssignZoneToSupervisorId, saveVehicle, unassignVehicle, removeZone, moveZone,
    assignVehicleToSupervisor, assignZoneToSupervisor } = props;

  const SectionHeader = ({ title, number }: { title: string; number: number }) => (
    <div className="flex items-center gap-3 mb-6 pb-3 border-b" style={{ borderColor: colors.border }}>
      <div className="flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm" style={{ backgroundColor: colors.primary }}>
        {number}
      </div>
      <h2 className="text-2xl font-bold" style={{ color: colors.text }}>{title}</h2>
    </div>
  );

  const SubsectionHeader = ({ title }: { title: string }) => (
    <h3 className="text-lg font-semibold mb-4 pb-2 border-b" style={{ color: colors.text, borderColor: colors.border }}>{title}</h3>
  );

  const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <div className={`rounded-lg shadow-sm border p-6 ${className}`} style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
      {children}
    </div>
  );

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
      style={{ backgroundColor: disabled ? colors.textLight : colors.primary, cursor: disabled ? 'not-allowed' : 'pointer' }}
      onMouseOver={(e) => { if (!disabled && !loading) e.currentTarget.style.backgroundColor = colors.primaryHover; }}
      onMouseOut={(e) => { if (!disabled && !loading) e.currentTarget.style.backgroundColor = colors.primary; }}
    >
      {loading && <LoadingSpinner size={14} className="border-white/40 border-t-white" />}
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
      style={{ color: colors.text, borderColor: colors.border, backgroundColor: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer' }}
      onMouseOver={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = colors.background; }}
      onMouseOut={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {children}
    </button>
  );

  return (
    <section>
      <SectionHeader title={t('manageWorkers.section.supervisors')} number={1} />

      <div className="space-y-6 mb-8">
        <Card>
          <SubsectionHeader title="Supervisors and Their Zones" />
          <div className="space-y-4">
            {supervisors.filter(s => (s.zones || []).length > 0).map(s => (
              <div key={s.id} className="border rounded-lg p-4" style={{ borderColor: colors.border }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold" style={{ color: colors.text }}>{s.username}</div>
                  {editingId === s.id ? (
                    <OutlineButton onClick={cancelEdit} className="text-sm px-3 py-1">{t('manageWorkers.close')}</OutlineButton>
                  ) : (
                    <button onClick={() => startEdit(s)} className="text-sm font-medium px-3 py-1 rounded border" style={{ color: colors.primary, borderColor: colors.primary }}>
                      {t('manageWorkers.manage')}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {(s.zones || []).map(z => (
                    <div key={z.id} className="flex items-center justify-between text-sm p-2 rounded border" style={{ borderColor: colors.border }}>
                      <span style={{ color: colors.text }}>{z.name}</span>
                      {editingId === s.id && (
                        <div className="flex items-center gap-2">
                          <button className="px-2 py-1 text-xs rounded border" style={{ borderColor: colors.border }} onClick={() => removeZone(s.id, z.id)}>
                            Unassign
                          </button>
                          <select className="border rounded px-2 py-1 text-xs" style={{ borderColor: colors.border }} value={moveSelection[z.id] || ''} onChange={e => setMoveSelection(prev => ({ ...prev, [z.id]: e.target.value }))}>
                            <option value="">Move to…</option>
                            {supervisors.filter(sv => sv.id !== s.id).map(sv => (
                              <option key={sv.id} value={sv.id}>{sv.username}</option>
                            ))}
                          </select>
                          <PrimaryButton loading={!!actionLoading[`moveZone-${z.id}`]} disabled={!moveSelection[z.id] || !!actionLoading[`moveZone-${z.id}`]} onClick={() => moveZone(z.id, moveSelection[z.id])} className="text-xs px-2 py-1">Move</PrimaryButton>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {supervisors.filter(s => (s.zones || []).length > 0).length === 0 && (
              <div className="text-center py-8" style={{ color: colors.textLight }}>No supervisors with zones</div>
            )}
          </div>
        </Card>

        <Card>
          <SubsectionHeader title="Supervisors and Their Vehicles" />
          <div className="space-y-4">
            {supervisors.filter(s => (s.vehicles || []).length > 0).map(s => (
              <div key={s.id} className="border rounded-lg p-4" style={{ borderColor: colors.border }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold" style={{ color: colors.text }}>{s.username}</div>
                  {editingId === s.id ? (
                    <OutlineButton onClick={cancelEdit} className="text-sm px-3 py-1">{t('manageWorkers.close')}</OutlineButton>
                  ) : (
                    <button onClick={() => startEdit(s)} className="text-sm font-medium px-3 py-1 rounded border" style={{ color: colors.primary, borderColor: colors.primary }}>
                      {t('manageWorkers.manage')}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {(s.vehicles || []).map(v => (
                    <div key={v.id} className="flex items-center justify-between text-sm p-2 rounded border" style={{ borderColor: colors.border }}>
                      <span style={{ color: colors.text }}>{v.plate}</span>
                      {editingId === s.id && (
                        <div className="flex items-center gap-2">
                          <button className="px-2 py-1 text-xs rounded border" style={{ borderColor: colors.border }} onClick={() => unassignVehicle(s.id, v.id)}>
                            Unassign
                          </button>
                          <select className="border rounded px-2 py-1 text-xs" style={{ borderColor: colors.border }} value={moveSelection[v.id] || ''} onChange={e => setMoveSelection(prev => ({ ...prev, [v.id]: e.target.value }))}>
                            <option value="">Move to…</option>
                            {supervisors.filter(sv => sv.id !== s.id).map(sv => (
                              <option key={sv.id} value={sv.id}>{sv.username}</option>
                            ))}
                          </select>
                          <PrimaryButton loading={!!actionLoading[`saveVehicle-${s.id}`]} disabled={!moveSelection[v.id] || !!actionLoading[`saveVehicle-${s.id}`]} onClick={() => {
                            const target = Number(moveSelection[v.id]);
                            if (Number.isFinite(target)) assignVehicleToSupervisor(target, v.id);
                          }} className="text-xs px-2 py-1">Move</PrimaryButton>
                        </div>
                      )}
                    </div>
                  ))}
                  {editingId === s.id && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select value={editVehicleId} onChange={e => setEditVehicleId(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }}>
                        <option value="">{t('manageWorkers.selectVehicle')}</option>
                        {vehicles.filter(v => !(s.vehicles || []).some(sv => sv.id === v.id)).map(v => (
                          <option key={v.id} value={v.id}>{v.plate}</option>
                        ))}
                      </select>
                      <PrimaryButton loading={!!actionLoading[`saveVehicle-${s.id}`]} onClick={() => saveVehicle(s.id)} disabled={!editVehicleId || !!actionLoading[`saveVehicle-${s.id}`]} className="text-sm px-3 py-1">
                        {t('manageWorkers.addVehicle')}
                      </PrimaryButton>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {supervisors.filter(s => (s.vehicles || []).length > 0).length === 0 && (
              <div className="text-center py-8" style={{ color: colors.textLight }}>No supervisors with vehicles</div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SubsectionHeader title="Supervisors Without Zones" />
          {(() => {
            const supervisorsNoZones = supervisors.filter(s => !s.zones || s.zones.length === 0);
            const assignedZoneIds = new Set<number>();
            supervisors.forEach(s => (s.zones || []).forEach(z => assignedZoneIds.add(z.id)));
            const zonesNoSupervisor = zones.filter(z => !assignedZoneIds.has(z.id));
            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={assignZoneToSupervisorId} onChange={e => setAssignZoneToSupervisorId(e.target.value)}>
                    <option value="">Select supervisor…</option>
                    {supervisorsNoZones.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
                  </select>
                  <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={assignZoneNoSup} onChange={e => setAssignZoneNoSup(e.target.value)}>
                    <option value="">Select zone…</option>
                    {zonesNoSupervisor.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                  <PrimaryButton loading={!!actionLoading.assignZoneNoSup} disabled={!assignZoneNoSup || !assignZoneToSupervisorId || !!actionLoading.assignZoneNoSup} onClick={() => {
                    const zId = Number(assignZoneNoSup); const sId = Number(assignZoneToSupervisorId);
                    if (Number.isFinite(zId) && Number.isFinite(sId)) assignZoneToSupervisor(sId, zId);
                  }} className="text-sm whitespace-nowrap">Assign</PrimaryButton>
                </div>
                {supervisorsNoZones.length === 0 && (
                  <div className="text-sm text-center py-4" style={{ color: colors.textLight }}>All supervisors have zones</div>
                )}
              </div>
            );
          })()}
        </Card>
        <Card>
          <SubsectionHeader title={t('manageWorkers.unassignedVehicles')} />
          {(() => {
            const assignedVehicleIds = new Set<number>();
            supervisors.forEach(s => (s.vehicles || []).forEach(v => assignedVehicleIds.add(v.id)));
            const vehiclesNoSupervisor = vehicles.filter(v => !assignedVehicleIds.has(v.id));
            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={assignVehicleNoSup} onChange={e => setAssignVehicleNoSup(e.target.value)}>
                    <option value="">Select vehicle…</option>
                    {vehiclesNoSupervisor.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                  </select>
                  <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={assignVehicleToSupervisorId} onChange={e => setAssignVehicleToSupervisorId(e.target.value)}>
                    <option value="">Select supervisor…</option>
                    {supervisors.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
                  </select>
                  <PrimaryButton loading={!!actionLoading.assignVehicleNoSup} disabled={!assignVehicleNoSup || !assignVehicleToSupervisorId || !!actionLoading.assignVehicleNoSup} onClick={() => {
                    const vId = Number(assignVehicleNoSup); const sId = Number(assignVehicleToSupervisorId);
                    if (Number.isFinite(vId) && Number.isFinite(sId)) assignVehicleToSupervisor(sId, vId);
                  }} className="text-sm whitespace-nowrap">Assign</PrimaryButton>
                </div>
                {vehiclesNoSupervisor.length === 0 && (
                  <div className="text-sm text-center py-4" style={{ color: colors.textLight }}>All vehicles are assigned to supervisors</div>
                )}
              </div>
            );
          })()}
        </Card>

        <Card>
          <SubsectionHeader title="Supervisors Without Vehicles" />
          {(() => {
            const supervisorsNoVehicles = supervisors.filter(s => !s.vehicles || s.vehicles.length === 0);
            const assignedVehicleIds = new Set<number>();
            supervisors.forEach(s => (s.vehicles || []).forEach(v => assignedVehicleIds.add(v.id)));
            const vehiclesNoSupervisor = vehicles.filter(v => !assignedVehicleIds.has(v.id));
            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={assignVehicleToSupervisorId} onChange={e => setAssignVehicleToSupervisorId(e.target.value)}>
                    <option value="">Select supervisor…</option>
                    {supervisorsNoVehicles.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
                  </select>
                  <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={assignVehicleNoSup} onChange={e => setAssignVehicleNoSup(e.target.value)}>
                    <option value="">Select vehicle…</option>
                    {vehiclesNoSupervisor.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                  </select>
                  <PrimaryButton disabled={!assignVehicleNoSup || !assignVehicleToSupervisorId || !!actionLoading.assignVehicleNoSup} onClick={() => {
                    const vId = Number(assignVehicleNoSup); const sId = Number(assignVehicleToSupervisorId);
                    if (Number.isFinite(vId) && Number.isFinite(sId)) assignVehicleToSupervisor(sId, vId);
                  }} className="text-sm whitespace-nowrap">Assign</PrimaryButton>
                </div>
                {supervisorsNoVehicles.length === 0 && (
                  <div className="text-sm text-center py-4" style={{ color: colors.textLight }}>All supervisors have vehicles</div>
                )}
              </div>
            );
          })()}
        </Card>

        <Card>
          <SubsectionHeader title="Unassigned Zones" />
          {(() => {
            const assignedZoneIds = new Set<number>();
            supervisors.forEach(s => (s.zones || []).forEach(z => assignedZoneIds.add(z.id)));
            const zonesNoSupervisor = zones.filter(z => !assignedZoneIds.has(z.id));
            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={assignZoneNoSup} onChange={e => setAssignZoneNoSup(e.target.value)}>
                    <option value="">Select zone…</option>
                    {zonesNoSupervisor.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                  <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={assignZoneToSupervisorId} onChange={e => setAssignZoneToSupervisorId(e.target.value)}>
                    <option value="">Select supervisor…</option>
                    {supervisors.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
                  </select>
                  <PrimaryButton disabled={!assignZoneNoSup || !assignZoneToSupervisorId || !!actionLoading.assignZoneNoSup} onClick={() => {
                    const zId = Number(assignZoneNoSup); const sId = Number(assignZoneToSupervisorId);
                    if (Number.isFinite(zId) && Number.isFinite(sId)) assignZoneToSupervisor(sId, zId);
                  }} className="text-sm whitespace-nowrap">Assign</PrimaryButton>
                </div>
                {zonesNoSupervisor.length === 0 && (
                  <div className="text-sm text-center py-4" style={{ color: colors.textLight }}>All zones are assigned to supervisors</div>
                )}
              </div>
            );
          })()}
        </Card>
      </div>
    </section>
  );
}
