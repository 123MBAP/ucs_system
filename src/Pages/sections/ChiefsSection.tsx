import { ReactNode } from 'react';
import LoadingSpinner from '../../Components/LoadingSpinner';

type Zone = { id: number; name: string; assigned_chief?: number | null };

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

export default function ChiefsSection(props: {
  colors: Colors;
  chiefs: UserRef[];
  zones: Zone[];
  actionLoading: Record<string, boolean>;
  // local state
  manageChief: Record<number, boolean>;
  moveZoneChiefTarget: Record<number, string>;
  noChiefSelectedZone: string;
  noChiefAssignChiefId: string;
  noZoneSelectedChief: string;
  noZoneAssignZoneId: string;
  // setters
  setManageChief: (updater: (prev: Record<number, boolean>) => Record<number, boolean>) => void;
  setMoveZoneChiefTarget: (updater: (prev: Record<number, string>) => Record<number, string>) => void;
  setNoChiefSelectedZone: (v: string) => void;
  setNoChiefAssignChiefId: (v: string) => void;
  setNoZoneSelectedChief: (v: string) => void;
  setNoZoneAssignZoneId: (v: string) => void;
  // actions
  setZoneChief: (zoneId: number, chiefUserId: number) => void | Promise<void>;
  removeZoneChief: (zoneId: number) => void | Promise<void>;
}) {
  const { colors, chiefs, zones, actionLoading, manageChief, moveZoneChiefTarget, noChiefSelectedZone, noChiefAssignChiefId,
    noZoneSelectedChief, noZoneAssignZoneId, setManageChief, setMoveZoneChiefTarget, setNoChiefSelectedZone,
    setNoChiefAssignChiefId, setNoZoneSelectedChief, setNoZoneAssignZoneId, setZoneChief, removeZoneChief } = props;

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

  return (
    <section>
      <SectionHeader title="Manage Chiefs" number={2} />
      <div className="space-y-6">
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
                    <button onClick={() => setManageChief(prev => ({ ...prev, [ch.id]: !prev[ch.id] }))} className="text-sm font-medium px-3 py-1 rounded border" style={{ color: colors.primary, borderColor: colors.primary }}>
                      {manageChief[ch.id] ? 'Done' : 'Manage'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {chZones.map(z => (
                      <div key={z.id} className="flex items-center justify-between text-sm p-2 rounded border" style={{ borderColor: colors.border }}>
                        <span style={{ color: colors.text }}>{z.name}</span>
                        {manageChief[ch.id] && (
                          <div className="flex items-center gap-2">
                            <button className="px-2 py-1 text-xs rounded border" style={{ borderColor: colors.border }} disabled={!!actionLoading[`removeChief-${z.id}`]} onClick={() => removeZoneChief(z.id)}>
                              Unassign
                            </button>
                            <select className="border rounded px-2 py-1 text-xs" style={{ borderColor: colors.border }} value={moveZoneChiefTarget[z.id] || ''} onChange={e => setMoveZoneChiefTarget(prev => ({ ...prev, [z.id]: e.target.value }))}>
                              <option value="">Move to…</option>
                              {chiefs.filter(c => c.id !== ch.id).map(c => (
                                <option key={c.id} value={c.id}>{c.username}</option>
                              ))}
                            </select>
                            <PrimaryButton loading={!!actionLoading[`setChief-${z.id}`]} disabled={!moveZoneChiefTarget[z.id] || !!actionLoading[`setChief-${z.id}`]} onClick={() => {
                              const target = Number(moveZoneChiefTarget[z.id]);
                              if (Number.isFinite(target)) setZoneChief(z.id, target);
                            }} className="text-xs px-2 py-1">Move</PrimaryButton>
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
          <Card>
            <SubsectionHeader title="Zones Needing Chiefs" />
            {(() => {
              const zonesNoChief = zones.filter(z => !z.assigned_chief);
              const chiefsNoZones = chiefs.filter(c => zones.every(z => z.assigned_chief !== c.id));
              return (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={noChiefSelectedZone} onChange={e => setNoChiefSelectedZone(e.target.value)}>
                      <option value="">Select zone…</option>
                      {zonesNoChief.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                    <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={noChiefAssignChiefId} onChange={e => setNoChiefAssignChiefId(e.target.value)}>
                      <option value="">Select chief…</option>
                      {chiefsNoZones.map(c => <option key={c.id} value={c.id}>{c.username}</option>)}
                    </select>
                    <PrimaryButton loading={!!actionLoading[`setChief-${Number(noChiefSelectedZone)}`]} disabled={!noChiefSelectedZone || !noChiefAssignChiefId || !!actionLoading[`setChief-${Number(noChiefSelectedZone)}`]} onClick={() => {
                      const zId = Number(noChiefSelectedZone); const cId = Number(noChiefAssignChiefId);
                      if (Number.isFinite(zId) && Number.isFinite(cId)) setZoneChief(zId, cId);
                      setNoChiefSelectedZone(''); setNoChiefAssignChiefId('');
                    }} className="text-sm whitespace-nowrap">Assign</PrimaryButton>
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

          <Card>
            <SubsectionHeader title="Chiefs Without Zones" />
            {(() => {
              const chiefsNoZones = chiefs.filter(c => zones.every(z => z.assigned_chief !== c.id));
              const zonesNoChief = zones.filter(z => !z.assigned_chief);
              return (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={noZoneSelectedChief} onChange={e => setNoZoneSelectedChief(e.target.value)}>
                      <option value="">Select chief…</option>
                      {chiefsNoZones.map(c => <option key={c.id} value={c.id}>{c.username}</option>)}
                    </select>
                    <select className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ borderColor: colors.border }} value={noZoneAssignZoneId} onChange={e => setNoZoneAssignZoneId(e.target.value)}>
                      <option value="">Select zone…</option>
                      {zonesNoChief.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                    <PrimaryButton loading={!!actionLoading[`setChief-${Number(noZoneAssignZoneId)}`]} disabled={!noZoneSelectedChief || !noZoneAssignZoneId || !!actionLoading[`setChief-${Number(noZoneAssignZoneId)}`]} onClick={() => {
                      const cId = Number(noZoneSelectedChief); const zId = Number(noZoneAssignZoneId);
                      if (Number.isFinite(zId) && Number.isFinite(cId)) setZoneChief(zId, cId);
                      setNoZoneSelectedChief(''); setNoZoneAssignZoneId('');
                    }} className="text-sm whitespace-nowrap">Assign</PrimaryButton>
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
  );
}
