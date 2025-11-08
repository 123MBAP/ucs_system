import { useEffect, useState } from 'react';
import type { SVGProps } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_URL as string;

type Driver = { id: number; username: string; first_name?: string | null; last_name?: string | null; full_name?: string | null; vehicle_id?: number | null; vehicle_plate?: string | null; assigned_manpowers?: number[] };
type Manpower = { id: number; username: string; first_name?: string | null; last_name?: string | null; full_name?: string | null };
type Vehicle = { id: number; plate: string; assigned_manpower_users?: { id: number; username: string; first_name?: string | null; last_name?: string | null; full_name?: string | null }[] };

type Detail = {
  zone: { id: number; name: string };
  serviceDays: number[];
  driverAssignments: { weekday: number; driver_user_id: number }[];
  drivers: Driver[];
  manpower: Manpower[];
  vehicles: Vehicle[];
  supervisorVehicles?: Vehicle[];
  unassignedManpower?: Manpower[];
};

// Color constants
const colors = {
  primary: '#D97706',
  primaryHover: '#B45309',
  accent: '#15803D',
  accentHover: '#166534',
  background: '#F9FAFB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  text: '#1E1E1E',
  textLight: '#6B7280',
  error: '#DC2626',
  success: '#15803D'
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

// UI Components
const SectionHeader = ({ title, number }: { title: string; number: number }) => (
  <div className="flex items-center gap-3 mb-4 md:mb-6 pb-3 border-b" style={{ borderColor: colors.border }}>
    <div 
      className="flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm"
      style={{ backgroundColor: colors.primary }}
    >
      {number}
    </div>
    <h2 className="text-2xl font-bold" style={{ color: colors.text }}>{title}</h2>
  </div>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div 
    className={`rounded-lg shadow-sm border p-4 sm:p-5 md:p-6 ${className}`}
    style={{ 
      backgroundColor: colors.cardBg, 
      borderColor: colors.border 
    }}
  >
    {children}
  </div>
);

const PrimaryButton = ({ children, onClick, disabled = false, loading = false, className = '' }: { 
  children: React.ReactNode; 
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
    {children}
  </button>
);

const AccentButton = ({ children, onClick, disabled = false, loading = false, className = '' }: { 
  children: React.ReactNode; 
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
      backgroundColor: disabled ? colors.textLight : colors.accent,
      cursor: disabled ? 'not-allowed' : 'pointer'
    }}
    onMouseOver={(e) => {
      if (!disabled && !loading) {
        e.currentTarget.style.backgroundColor = colors.accentHover;
      }
    }}
    onMouseOut={(e) => {
      if (!disabled && !loading) {
        e.currentTarget.style.backgroundColor = colors.accent;
      }
    }}
  >
    {children}
  </button>
);

 

const ZoneSupervision = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editDays, setEditDays] = useState<number[]>([]);
  const [daysEditMode, setDaysEditMode] = useState(false);
  // Management interactions are handled in SupervisorServiceSchedule; keep supervision view informational only

  const displayName = (u: { username: string; first_name?: string | null; last_name?: string | null; full_name?: string | null }) => {
    const fn = `${u.first_name ? u.first_name : ''} ${u.last_name ? u.last_name : ''}`.trim();
    return fn || u.full_name || u.username;
  };

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
        // init edit values
        setDaysEditMode(false);
        // reset no-op
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

  // all direct management actions removed from this page

  if (loading) {
    return (
      <div className="min-h-screen p-0 sm:p-2 md:p-4" style={{ backgroundColor: colors.background }}>
        <div className="max-w-none md:max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 rounded w-48 mb-6" style={{ backgroundColor: colors.border }}></div>
            <div className="grid gap-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 rounded-lg" style={{ backgroundColor: colors.border }}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) return (
    <div className="min-h-screen p-0 sm:p-2 md:p-4" style={{ backgroundColor: colors.background }}>
      <div className="max-w-none md:max-w-6xl mx-auto">
        <Card>
          <div className="text-center p-6 rounded-lg" style={{ backgroundColor: '#FEF2F2', borderColor: colors.error }}>
            <div style={{ color: colors.error }} className="font-medium">{error}</div>
          </div>
        </Card>
      </div>
    </div>
  );

  if (!detail) return (
    <div className="min-h-screen p-0 sm:p-2 md:p-4" style={{ backgroundColor: colors.background }}>
      <div className="max-w-none md:max-w-6xl mx-auto">
        <Card>
          <div className="text-center">
            <div style={{ color: colors.textLight }}>Zone not found</div>
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-0 sm:p-2 md:p-4" style={{ backgroundColor: colors.background }}>
      <div className="max-w-none md:max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 transition-colors duration-200"
              style={{ color: colors.textLight }}
            >
              <Icons.Back />
              <span className="font-medium">Back to Zones</span>
            </button>
            <div className="w-px h-6" style={{ backgroundColor: colors.border }}></div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
                Zone Supervision
              </h1>
              <p className="mt-1" style={{ color: colors.textLight }}>Manage {detail.zone.name} operations and assignments</p>
            </div>
          </div>
          <AccentButton
            onClick={() => navigate(`/supervisor/zones/${detail.zone.id}/schedule`)}
            className="hidden md:flex px-6 py-3"
          >
            <Icons.Schedule />
            <span>Plan Service Schedule</span>
          </AccentButton>
        </div>
        {/* Mobile: Plan Schedule Button in its own card */}
        <div className="md:hidden">
          <Card>
            <AccentButton 
              onClick={() => navigate(`/supervisor/zones/${detail.zone.id}/schedule`)}
              className="w-full justify-center py-3"
            >
              <Icons.Schedule />
              <span>Plan Service Schedule</span>
            </AccentButton>
          </Card>
        </div>

        {/* SECTION 1: SUPERVISOR VEHICLES */}
        <section>
          <SectionHeader title="Supervisor Vehicles" number={1} />
          <Card>
            <div className="flex items-center space-x-2 mb-4">
              <Icons.Vehicle style={{ color: colors.primary }} />
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Your Assigned Vehicles</h3>
            </div>
            <div>
              {detail.supervisorVehicles && detail.supervisorVehicles.length ? (
                <div className="flex flex-wrap gap-3">
                  {detail.supervisorVehicles.map(v => (
                    <span 
                      key={v.id} 
                      className="px-4 py-2 rounded-lg font-medium border"
                      style={{ 
                        backgroundColor: '#FEF7ED',
                        borderColor: colors.primary,
                        color: colors.primary
                      }}
                    >
                      {v.plate}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ color: colors.textLight }} className="italic">
                  No vehicles assigned to you yet
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* SECTION 2: SERVICE DAYS */}
        <section>
          <SectionHeader title="Service Days Configuration" number={2} />
          <Card>
            <div className="flex items-center space-x-2 mb-6">
              <Icons.Calendar style={{ color: colors.primary }} />
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Active Service Days</h3>
            </div>

            {!daysEditMode ? (
              <div>
                <div className="flex flex-wrap gap-3 mb-6">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const d = i + 1;
                    const on = editDays.includes(d);
                    return (
                      <span
                        key={d}
                        className={`px-4 py-3 rounded-lg border font-medium ${on ? 'text-white' : ''}`}
                        style={on ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }}
                      >
                        {weekdayName(d)}
                      </span>
                    );
                  })}
                </div>
                <PrimaryButton onClick={() => setDaysEditMode(true)} className="px-6 py-3">
                  <span>Edit Service Days</span>
                </PrimaryButton>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap gap-3 mb-6">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const d = i + 1;
                    const on = editDays.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => toggleDay(d)}
                        className={`px-4 py-3 rounded-lg border font-medium transition-all duration-200 ${on ? 'text-white shadow-lg' : 'border hover:shadow-md'}`}
                        style={on ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }}
                      >
                        {weekdayName(d)}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  <AccentButton onClick={async () => { await saveDays(); setDaysEditMode(false); }} className="px-6 py-3">
                    <Icons.Save />
                    <span>Save</span>
                  </AccentButton>
                  <button
                    onClick={() => { setEditDays(detail.serviceDays || []); setDaysEditMode(false); }}
                    className="px-4 py-2 rounded-lg font-medium border"
                    style={{ backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* SECTION 3 removed per requirements */}

        {/* SECTION 3: VEHICLE AND DRIVER MANAGEMENT */}
        <section>
          <SectionHeader title="Vehicle & Driver Management" number={3} />
          <Card>
            <div className="flex items-center space-x-2 mb-6">
              <Icons.Vehicle style={{ color: colors.primary }} />
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Vehicles with Assignments</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {detail.vehicles.map(v => {
                const currentDriver = detail.drivers.find(dr => dr.vehicle_id === v.id) || null;
                return (
                  <div key={v.id} className="rounded-lg p-4 border" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                    <div className="flex items-center space-x-2 mb-3">
                      <Icons.Vehicle className="w-4 h-4" style={{ color: colors.primary }} />
                      <h4 className="font-semibold" style={{ color: colors.text }}>Vehicle {v.plate}</h4>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="text-sm">
                        <span className="font-medium" style={{ color: colors.text }}>Current driver:</span>{' '}
                        {currentDriver ? (
                          <span style={{ color: colors.text }}>{displayName(currentDriver)}</span>
                        ) : (
                          <span style={{ color: colors.error }}>None assigned</span>
                        )}
                      </div>
                      
                      {Array.isArray(v.assigned_manpower_users) && (
                        <div className="text-sm">
                          <div className="font-medium mb-1" style={{ color: colors.text }}>Assigned Manpower:</div>
                          {v.assigned_manpower_users.length ? (
                            <div className="space-y-1">
                              {v.assigned_manpower_users.map(u => (
                                <div key={u.id} className="px-2 py-1 rounded" style={{ backgroundColor: colors.cardBg, color: colors.text }}>
                                  <span>{displayName(u)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ color: colors.textLight }} className="italic">None assigned</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Interactive management removed per requirement; assignments are managed in schedule UI */}
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
        {/* SECTION 4 removed; manpower management handled per-vehicle */}
      </div>
    </div>
  );
};

export default ZoneSupervision;