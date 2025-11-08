import { ReactNode } from 'react';

type Vehicle = { id: number; plate: string; manpower?: { manpower_id: number; username: string }[]; drivers?: { user_id: number; username?: string }[] };

type UserRef = { id: number; username: string };

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

export default function DriversManpowerSection(props: {
  colors: Colors;
  vehicles: Vehicle[];
  drivers: UserRef[];
  manpower: UserRef[];
  actionLoading: Record<string, boolean>;
  // manpower state
  manageVehicle: Record<number, boolean>;
  moveManpowerTarget: Record<number, string>;
  unassignedSelected: Record<number, boolean>;
  assignVehicleForSelection: string;
  setManageVehicle: (updater: (prev: Record<number, boolean>) => Record<number, boolean>) => void;
  setMoveManpowerTarget: (updater: (prev: Record<number, string>) => Record<number, string>) => void;
  setUnassignedSelected: (updater: (prev: Record<number, boolean>) => Record<number, boolean>) => void;
  setAssignVehicleForSelection: (v: string) => void;
  assignManpowerVehicle: (manpowerId: number, vehicleId: number) => void | Promise<void>;
  unassignManpowerVehicle: (manpowerId: number) => void | Promise<void>;
  deleteManpower: (manpowerId: number) => void | Promise<void>;
  // drivers state
  manageDriver: Record<number, boolean>;
  moveDriverTargetVehicle: Record<number, string>;
  unassignedDriverId: string;
  vehicleForUnassignedDriver: string;
  vehicleNoDriverId: string;
  driverNoVehicleId: string;
  setManageDriver: (updater: (prev: Record<number, boolean>) => Record<number, boolean>) => void;
  setMoveDriverTargetVehicle: (updater: (prev: Record<number, string>) => Record<number, string>) => void;
  setUnassignedDriverId: (v: string) => void;
  setVehicleForUnassignedDriver: (v: string) => void;
  setVehicleNoDriverId: (v: string) => void;
  setDriverNoVehicleId: (v: string) => void;
  assignDriverVehicle: (driverUserId: number, vehicleId: number) => void | Promise<void>;
  unassignDriverVehicle: (driverUserId: number) => void | Promise<void>;
}) {
  const { colors, vehicles, drivers, manpower, actionLoading,
    manageVehicle, moveManpowerTarget, unassignedSelected, assignVehicleForSelection,
    setManageVehicle, setMoveManpowerTarget, setUnassignedSelected, setAssignVehicleForSelection,
    assignManpowerVehicle, unassignManpowerVehicle, deleteManpower,
    manageDriver, moveDriverTargetVehicle, unassignedDriverId, vehicleForUnassignedDriver, vehicleNoDriverId, driverNoVehicleId,
    setManageDriver, setMoveDriverTargetVehicle, setUnassignedDriverId, setVehicleForUnassignedDriver, setVehicleNoDriverId, setDriverNoVehicleId,
    assignDriverVehicle, unassignDriverVehicle } = props;

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
      {children}
    </button>
  );

  return (
    <>
      <section>
        <SectionHeader title="Manage Manpower" number={3} />
        <div className="space-y-6">
          <Card>
            <SubsectionHeader title="Vehicles and Their Manpower" />
            <div className="space-y-4">
              {vehicles.map(v => (
                <div key={v.id} className="border rounded-lg p-4" style={{ borderColor: colors.border }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold" style={{ color: colors.text }}>{v.plate}</div>
                    <button onClick={() => setManageVehicle(prev => ({ ...prev, [v.id]: !prev[v.id] }))} className="text-sm font-medium px-3 py-1 rounded border" style={{ color: colors.primary, borderColor: colors.primary }}>
                      {manageVehicle[v.id] ? 'Done' : 'Manage'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(v.manpower || []).length === 0 && (
                      <div className="text-sm" style={{ color: colors.textLight }}>No manpower assigned</div>
                    )}
                    {(v.manpower || []).map(m => (
                      <div key={m.manpower_id} className="flex flex-col sm:flex-row items-center gap-2 border rounded-lg px-3 py-2" style={{ borderColor: colors.border }}>
                        <span className="text-sm" style={{ color: colors.text }}>{m.username}</span>
                        {manageVehicle[v.id] && (
                          <div className="flex flex-col sm:flex-row items-center gap-2">
                            <button className="px-2 py-1 text-xs rounded border" style={{ borderColor: colors.border }} onClick={() => unassignManpowerVehicle(m.manpower_id)}>
                              Remove
                            </button>
                            <select className="border rounded px-2 py-1 text-xs" style={{ borderColor: colors.border }} value={moveManpowerTarget[m.manpower_id] || ''} onChange={e => setMoveManpowerTarget(prev => ({ ...prev, [m.manpower_id]: e.target.value }))}>
                              <option value="">Move to…</option>
                              {vehicles.filter(ov => ov.id !== v.id).map(ov => (
                                <option key={ov.id} value={ov.id}>{ov.plate}</option>
                              ))}
                            </select>
                            <PrimaryButton disabled={!moveManpowerTarget[m.manpower_id] || !!actionLoading[`assignManpower-${m.manpower_id}`]} onClick={() => {
                              const target = Number(moveManpowerTarget[m.manpower_id]);
                              if (Number.isFinite(target)) assignManpowerVehicle(m.manpower_id, target);
                            }} className="text-xs px-2 py-1">Move</PrimaryButton>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SubsectionHeader title="Unassigned Manpower" />
            {(() => {
              const assignedIds = new Set<number>();
              vehicles.forEach(v => (v.manpower || []).forEach(m => assignedIds.add(m.manpower_id)));
              const unassigned = manpower.filter(m => !assignedIds.has(m.id));
              return (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={assignVehicleForSelection} onChange={e => setAssignVehicleForSelection(e.target.value)}>
                      <option value="">Select vehicle…</option>
                      {vehicles.map(v => (<option key={v.id} value={v.id}>{v.plate}</option>))}
                    </select>
                    <PrimaryButton disabled={!assignVehicleForSelection || Object.keys(unassignedSelected).filter(id => unassignedSelected[Number(id)]).length === 0} onClick={async () => {
                      const selectedIds = Object.keys(unassignedSelected).map(Number).filter(id => unassignedSelected[id]);
                      const target = Number(assignVehicleForSelection);
                      for (const mid of selectedIds) { await assignManpowerVehicle(mid, target); }
                      setUnassignedSelected(() => ({}));
                      setAssignVehicleForSelection('');
                    }} className="text-sm whitespace-nowrap">Assign Selected</PrimaryButton>
                    <button className="px-4 py-2 rounded-lg font-medium border text-sm whitespace-nowrap" style={{ borderColor: colors.error, color: colors.error }} disabled={Object.keys(unassignedSelected).filter(id => unassignedSelected[Number(id)]).length === 0} onClick={async () => {
                      const selectedIds = Object.keys(unassignedSelected).map(Number).filter(id => unassignedSelected[id]);
                      if (!selectedIds.length) return;
                      const ok = window.confirm(`Delete ${selectedIds.length} manpower user(s)? This cannot be undone.`);
                      if (!ok) return;
                      for (const mid of selectedIds) { await deleteManpower(mid); }
                      setUnassignedSelected(() => ({}));
                    }}>Delete Selected</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {unassigned.map(u => (
                      <label key={u.id} className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors hover:bg-gray-50">
                        <input type="checkbox" checked={!!unassignedSelected[u.id]} onChange={e => setUnassignedSelected(prev => ({ ...prev, [u.id]: e.target.checked }))} className="rounded" style={{ accentColor: colors.primary }} />
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

      <section>
        <SectionHeader title="Manage Drivers" number={4} />
        <div className="space-y-6">
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
                    <div key={`${driver.id}-${vehicle.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border rounded-lg" style={{ borderColor: colors.border }}>
                      <div className="text-sm min-w-0 flex-1 break-words">
                        <span className="font-medium" style={{ color: colors.text }}>{driver.username}</span>
                        <span className="ml-2" style={{ color: colors.textLight }}>→ {vehicle.plate}</span>
                      </div>
                      <div className="flex items-center flex-wrap gap-2 sm:justify-end">
                        {manageDriver[driver.id] ? (
                          <>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                              <button className="px-3 py-1 text-xs rounded border" style={{ borderColor: colors.border }} disabled={!!actionLoading[`assignDriver-${driver.id}`]} onClick={() => unassignDriverVehicle(driver.id)}>
                                Remove
                              </button>
                              <select className="border rounded px-2 py-1 text-xs min-w-[8rem]" style={{ borderColor: colors.border }} value={moveDriverTargetVehicle[driver.id] || ''} onChange={e => setMoveDriverTargetVehicle(prev => ({ ...prev, [driver.id]: e.target.value }))}>
                                <option value="">Move to…</option>
                                {vehiclesNoDriver.filter(v => v.id !== vehicle.id).map(v => (
                                  <option key={v.id} value={v.id}>{v.plate}</option>
                                ))}
                              </select>
                              <PrimaryButton disabled={!moveDriverTargetVehicle[driver.id] || !!actionLoading[`assignDriver-${driver.id}`]} onClick={() => {
                                const target = Number(moveDriverTargetVehicle[driver.id]);
                                if (Number.isFinite(target)) assignDriverVehicle(driver.id, target);
                              }} className="text-xs px-2 py-1">Move</PrimaryButton>
                              <button className="px-3 py-1 text-xs rounded border" style={{ borderColor: colors.border }} onClick={() => setManageDriver(prev => ({ ...prev, [driver.id]: false }))}>Done</button>
                            </div>
                          </>
                        ) : (
                          <button onClick={() => setManageDriver(prev => ({ ...prev, [driver.id]: true }))} className="text-sm font-medium px-3 py-1 rounded border" style={{ color: colors.primary, borderColor: colors.primary }}>
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
            <Card>
              <SubsectionHeader title="Drivers Without Vehicles" />
              {(() => {
                const assignedDriverIds = new Set<number>();
                vehicles.forEach(v => (v.drivers || []).forEach(d => assignedDriverIds.add(d.user_id)));
                const unassignedDrivers = drivers.filter(d => !assignedDriverIds.has(d.id));
                const vehiclesNoDriver = vehicles.filter(v => !v.drivers || v.drivers.length === 0);
                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={unassignedDriverId} onChange={e => setUnassignedDriverId(e.target.value)}>
                        <option value="">Select driver…</option>
                        {unassignedDrivers.map(d => <option key={d.id} value={d.id}>{d.username}</option>)}
                      </select>
                      <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={vehicleForUnassignedDriver} onChange={e => setVehicleForUnassignedDriver(e.target.value)}>
                        <option value="">Select vehicle…</option>
                        {vehiclesNoDriver.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                      </select>
                      <PrimaryButton disabled={!unassignedDriverId || !vehicleForUnassignedDriver || !!actionLoading[`assignDriver-${Number(unassignedDriverId)}`]} onClick={() => {
                        const dId = Number(unassignedDriverId); const vId = Number(vehicleForUnassignedDriver);
                        if (Number.isFinite(dId) && Number.isFinite(vId)) assignDriverVehicle(dId, vId);
                        setUnassignedDriverId(''); setVehicleForUnassignedDriver('');
                      }} className="text-sm whitespace-nowrap">Assign</PrimaryButton>
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

            <Card>
              <SubsectionHeader title="Vehicles Without Drivers" />
              {(() => {
                const assignedDriverIds = new Set<number>();
                vehicles.forEach(v => (v.drivers || []).forEach(d => assignedDriverIds.add(d.user_id)));
                const unassignedDrivers = drivers.filter(d => !assignedDriverIds.has(d.id));
                const vehiclesNoDriver = vehicles.filter(v => !v.drivers || v.drivers.length === 0);
                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={vehicleNoDriverId} onChange={e => setVehicleNoDriverId(e.target.value)}>
                        <option value="">Select vehicle…</option>
                        {vehiclesNoDriver.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                      </select>
                      <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={driverNoVehicleId} onChange={e => setDriverNoVehicleId(e.target.value)}>
                        <option value="">Select driver…</option>
                        {unassignedDrivers.map(d => <option key={d.id} value={d.id}>{d.username}</option>)}
                      </select>
                      <PrimaryButton disabled={!vehicleNoDriverId || !driverNoVehicleId || !!actionLoading[`assignDriver-${Number(driverNoVehicleId)}`]} onClick={() => {
                        const vId = Number(vehicleNoDriverId); const dId = Number(driverNoVehicleId);
                        if (Number.isFinite(dId) && Number.isFinite(vId)) assignDriverVehicle(dId, vId);
                        setVehicleNoDriverId(''); setDriverNoVehicleId('');
                      }} className="text-sm whitespace-nowrap">Assign</PrimaryButton>
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
    </>
  );
}
