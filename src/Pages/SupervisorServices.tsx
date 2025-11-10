import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';

const apiBase = import.meta.env.VITE_API_URL as string;

type ScheduleEntry = {
  id: number;
  zone_id: number;
  supervisor_id: number;
  vehicle_id: number | null;
  vehicle_plate: string | null;
  driver_id: number | null;
  driver_username: string | null;
  service_day: number;
  service_start: string;
  service_end: string;
  created_at: string;
  zone_name?: string | null;
  chief_report_status?: 'complete' | 'not_complete' | null;
  chief_report_reason?: string | null;
  chief_reported_at?: string | null;
  supervisor_status?: 'complete' | 'not_complete' | null;
  supervisor_reason?: string | null;
  supervisor_decided_at?: string | null;
};

// Color constants
const colors = {
  primary: '#D97706',
  primaryLight: '#FBBF24',
  primaryHover: '#B45309',
  accent: '#15803D',
  accentLight: '#22C55E',
  accentHover: '#166534',
  background: '#F9FAFB',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  text: '#1E1E1E',
  textLight: '#64748B',
  textLighter: '#94A3B8',
  error: '#DC2626',
  errorLight: '#FEF2F2',
  success: '#15803D',
  successLight: '#F0FDF4',
  warning: '#D97706',
  warningLight: '#FFFBEB'
};

// Enhanced Icon components
const Icons = {
  Refresh: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Check: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Close: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Clock: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Calendar: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Vehicle: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Driver: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Filter: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
    </svg>
  ),
  Info: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

// UI Components
const PrimaryButton = ({ children, onClick, disabled = false, loading = false, size = 'md', className = '' }: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-95 ${sizes[size]} ${className}`}
      style={{ 
        backgroundColor: disabled ? colors.textLighter : colors.primary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1
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
      {loading && (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      )}
      {children}
    </button>
  );
};

const AccentButton = ({ children, onClick, disabled = false, size = 'md', className = '' }: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-95 ${sizes[size]} ${className}`}
      style={{ 
        backgroundColor: disabled ? colors.textLighter : colors.accent,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1
      }}
      onMouseOver={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = colors.accentHover;
        }
      }}
      onMouseOut={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = colors.accent;
        }
      }}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', padding = 'p-6' }: { children: React.ReactNode; className?: string; padding?: string }) => (
  <div className={`rounded-2xl shadow-sm border transition-all duration-300 hover:shadow-md ${padding} ${className}`} style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
    {children}
  </div>
);

export default function SupervisorServices() {
  const { t, lang, setLang } = useI18n();
  const [zones, setZones] = useState<Array<{id:number; name:string}>>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [zoneFilter, setZoneFilter] = useState<string>('');
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedError, setCompletedError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<any[]>([]);
  const [selectedCompletedId, setSelectedCompletedId] = useState<number | null>(null);

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyReason, setVerifyReason] = useState('');
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyEntryId, setVerifyEntryId] = useState<number | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'complete' | 'not_complete'>('complete');
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  // Centralized loaders
  async function loadUnconfirmed() {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${apiBase}/api/supervisor/schedule`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load schedule');
      const data = await res.json();
      setSchedule(Array.isArray(data?.schedule) ? data.schedule : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }

  async function loadCompleted() {
    try {
      setCompletedError(null);
      setCompletedLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const params = new URLSearchParams();
      if (zoneFilter) params.set('zone_id', zoneFilter);
      if (year) params.set('year', year);
      if (month) params.set('month', month);
      const res = await fetch(`${apiBase}/api/supervisor/completed-services?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load completed services');
      const data = await res.json();
      setCompleted(Array.isArray(data?.services) ? data.services : []);
    } catch (e: any) {
      setCompletedError(e?.message || 'Failed to load');
    } finally {
      setCompletedLoading(false);
    }
  }

  function refreshAll() {
    loadUnconfirmed();
    loadCompleted();
  }

  // Load unconfirmed on mount
  useEffect(() => {
    loadUnconfirmed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load supervisor completed services with filters
  useEffect(() => {
    loadCompleted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, zoneFilter]);

  // Load zones for filter
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(`${apiBase}/api/supervisor/zones`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to load zones');
        const data = await res.json();
        if (!active) return;
        const zs = (data?.zones || []).map((z: any) => ({ id: z.id, name: z.zone_name || z.name }));
        setZones(zs);
      } catch {
        /* ignore filter zones load errors */
      }
    })();
    return () => { active = false; };
  }, []);

  async function verifyCompleteImmediately(entryId: number) {
    try {
      setVerifyingId(entryId);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${apiBase}/api/supervisor/service/${entryId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'complete', reason: null }),
      });
      if (!res.ok) throw new Error('Failed to confirm');
      // Refresh both lists
      await Promise.all([loadUnconfirmed(), loadCompleted()]);
    } catch (e) {
      console.error(e);
    } finally {
      setVerifyingId(null);
    }
  }

  function openVerifyNotComplete(entryId: number) {
    setVerifyEntryId(entryId);
    setVerifyStatus('not_complete');
    setVerifyReason('');
    setVerifyOpen(true);
  }

  async function submitVerify() {
    if (!verifyEntryId) return;
    try {
      setVerifySubmitting(true);
      setVerifyingId(verifyEntryId);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${apiBase}/api/supervisor/service/${verifyEntryId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ status: verifyStatus, reason: verifyReason.trim() || null }),
      });
      if (!res.ok) throw new Error('Failed to submit verification');
      // Refresh both lists
      await Promise.all([loadUnconfirmed(), loadCompleted()]);
      setVerifyOpen(false);
      setVerifyEntryId(null);
      setVerifyReason('');
    } catch (e) {
      console.error(e);
    } finally {
      setVerifySubmitting(false);
      setVerifyingId(null);
    }
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'complete':
        return (
          <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: colors.successLight, color: colors.success }}>
            Completed
          </span>
        );
      case 'not_complete':
        return (
          <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: colors.errorLight, color: colors.error }}>
            Not Completed
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: colors.warningLight, color: colors.warning }}>
            Pending
          </span>
        );
    }
  };

  function driverDisplay(row: any) {
    const fn = `${row?.driver_first_name ? row.driver_first_name : ''} ${row?.driver_last_name ? row.driver_last_name : ''}`.trim();
    const full = fn || row?.driver_full_name || '';
    const username = row?.driver_username || '';
    const name = full || username || '—';
    const usedUsernameOnly = !full && !!username;
    return { name, usedUsernameOnly };
  }

  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ backgroundColor: colors.background }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold" style={{ color: colors.text }}>
              {t('supSvc.title')}
            </h1>
            <p className="text-lg mt-2" style={{ color: colors.textLight }}>
              {t('supSvc.subtitle')}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: colors.primary }}>{schedule.length}</div>
              <div className="text-sm" style={{ color: colors.textLight }}>{t('supSvc.pendingCount')}</div>
            </div>
            <PrimaryButton 
              onClick={refreshAll}
              size="md"
              className="flex items-center gap-2"
            >
              <Icons.Refresh className="w-4 h-4" />
              <span>{t('supSvc.refreshAll')}</span>
            </PrimaryButton>
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: colors.textLight }}>{t('common.language')}</label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as any)}
                className="rounded-xl px-3 py-2 border text-sm"
                style={{ backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }}
              >
                <option value="en">{t('lang.english')}</option>
                <option value="rw">{t('lang.kinyarwanda')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Pending Services - Left Column */}
          <div className="xl:col-span-2 space-y-6">
            <Card padding="p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
                  {t('supSvc.pendingVerification')}
                </h2>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: colors.primaryLight }}>
                  <Icons.Info className="w-4 h-4" style={{ color: colors.primary }} />
                  <span className="text-sm font-semibold" style={{ color: colors.text }}>
                    {t('supSvc.awaitingYourConfirmation')}
                  </span>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl p-4 mb-6 border animate-fadeIn" style={{ backgroundColor: colors.errorLight, borderColor: colors.error }}>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: colors.error }}></div>
                    <span className="font-semibold" style={{ color: colors.error }}>{error}</span>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12 rounded-2xl" style={{ backgroundColor: colors.background }}>
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-32 rounded-2xl" style={{ backgroundColor: colors.border }}></div>
                    ))}
                  </div>
                </div>
              ) : schedule.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border-2 border-dashed" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                  <Icons.Check className="w-16 h-16 mx-auto mb-4" style={{ color: colors.textLighter }} />
                  <h3 className="text-xl font-semibold mb-2" style={{ color: colors.textLight }}>{t('supSvc.caughtUpTitle')}</h3>
                  <p className="text-lg" style={{ color: colors.textLighter }}>{t('supSvc.caughtUpDesc')}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {schedule.map((row) => (
                    <Card key={row.id} padding="p-6" className="group hover:scale-[1.02] transition-all duration-300">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1 space-y-4">
                          {/* Header with status and time */}
                          <div className="flex flex-wrap items-center gap-4">
                            {getStatusBadge(row.chief_report_status ?? null)}
                            <div className="flex items-center gap-2 text-sm" style={{ color: colors.textLight }}>
                              <Icons.Calendar className="w-4 h-4" />
                              <span>{new Date(row.created_at).toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Service Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: colors.background }}>
                              <Icons.Vehicle className="w-5 h-5 flex-shrink-0" style={{ color: colors.primary }} />
                              <div>
                                <div className="font-semibold" style={{ color: colors.text }}>
                                  {row.vehicle_plate ?? t('supSvc.noVehicle')}
                                </div>
                                <div className="text-sm" style={{ color: colors.textLight }}>{t('supSvc.vehicle')}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: colors.background }}>
                              <Icons.Driver className="w-5 h-5 flex-shrink-0" style={{ color: colors.primary }} />
                              <div>
                                <div className="font-semibold" style={{ color: colors.text }}>
                                  {(() => { const dd = driverDisplay(row); return dd.name || t('supSvc.noDriver'); })()}
                                </div>
                                <div className="text-sm" style={{ color: colors.textLight }}>{t('supSvc.driver')}</div>
                              </div>
                            </div>
                          </div>

                          {/* Time Schedule */}
                          <div className="flex items-center gap-4 p-3 rounded-xl" style={{ backgroundColor: colors.background }}>
                            <Icons.Clock className="w-5 h-5 flex-shrink-0" style={{ color: colors.primary }} />
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="font-semibold" style={{ color: colors.text }}>
                                  {row.service_start?.slice(0, 5)}
                                </div>
                                <div className="text-sm" style={{ color: colors.textLight }}>{t('supSvc.startTime')}</div>
                              </div>
                              <div className="w-px h-8" style={{ backgroundColor: colors.border }}></div>
                              <div>
                                <div className="font-semibold" style={{ color: colors.text }}>
                                  {row.service_end?.slice(0, 5)}
                                </div>
                                <div className="text-sm" style={{ color: colors.textLight }}>{t('supSvc.endTime')}</div>
                              </div>
                            </div>
                          </div>

                          {/* Chief Note if exists */}
                          {row.chief_report_reason && (
                            <div className="p-3 rounded-xl border" style={{ backgroundColor: colors.warningLight, borderColor: colors.warning }}>
                              <div className="text-sm font-semibold mb-1" style={{ color: colors.warning }}>{t('supSvc.chiefNote')}</div>
                              <div className="text-sm" style={{ color: colors.text }}>{row.chief_report_reason}</div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 min-w-[200px]">
                          {row.chief_report_status ? (
                            <>
                              <AccentButton 
                                onClick={() => verifyCompleteImmediately(row.id)}
                                disabled={verifyingId === row.id}
                                size="sm"
                                className="w-full"
                              >
                                <Icons.Check className="w-4 h-4" />
                                <span>{t('supSvc.confirmComplete')}</span>
                              </AccentButton>
                              <button
                                onClick={() => openVerifyNotComplete(row.id)}
                                disabled={verifyingId === row.id}
                                className="w-full px-4 py-2 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-60"
                                style={{ backgroundColor: colors.error }}
                              >
                                <Icons.Close className="w-4 h-4" />
                                <span>{t('supSvc.markIncomplete')}</span>
                              </button>
                            </>
                          ) : (
                            <div className="p-4 rounded-xl text-center border" style={{ backgroundColor: colors.warningLight, borderColor: colors.warning }}>
                              <Icons.Clock className="w-6 h-6 mx-auto mb-2" style={{ color: colors.warning }} />
                              <div className="text-sm font-semibold" style={{ color: colors.warning }}>{t('supSvc.waitingChief')}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Confirmed Services - Right Column */}
          <div className="space-y-6">
            <Card padding="p-6 lg:p-8" className="sticky top-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold" style={{ color: colors.text }}>{t('supSvc.confirmedServices')}</h3>
                <Icons.Filter className="w-5 h-5" style={{ color: colors.primary }} />
              </div>

              {/* Filter Controls */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>{t('supSvc.filter.zone')}</label>
                  <select
                    className="w-full rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 transition-all duration-300"
                    style={{ 
                      backgroundColor: colors.cardBg,
                      borderColor: colors.border,
                      color: colors.text
                    }}
                    value={zoneFilter}
                    onChange={(e) => setZoneFilter(e.target.value)}
                  >
                    <option value="">{t('supSvc.allZones')}</option>
                    {zones.map(z => (
                      <option key={z.id} value={String(z.id)}>{z.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>{t('supSvc.filter.year')}</label>
                    <select
                      className="w-full rounded-xl px-3 py-3 border focus:outline-none focus:ring-2 transition-all duration-300"
                      style={{ 
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                    >
                      <option value="">{t('supSvc.allYears')}</option>
                      {Array.from({ length: 7 }).map((_, i) => {
                        const y = new Date().getFullYear() - i;
                        return <option key={y} value={String(y)}>{y}</option>;
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>{t('supSvc.filter.month')}</label>
                    <select
                      className="w-full rounded-xl px-3 py-3 border focus:outline-none focus:ring-2 transition-all duration-300"
                      style={{ 
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                    >
                      <option value="">{t('supSvc.allMonths')}</option>
                      {Array.from({ length: 12 }).map((_, i) => {
                        const m = i + 1;
                        return <option key={m} value={String(m)}>{m.toString().padStart(2, '0')}</option>;
                      })}
                    </select>
                  </div>
                </div>
              </div>

              {completedError && (
                <div className="rounded-xl p-3 mb-4 border" style={{ backgroundColor: colors.errorLight, borderColor: colors.error }}>
                  <div className="text-sm font-semibold" style={{ color: colors.error }}>{completedError}</div>
                </div>
              )}

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {completedLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 rounded-xl" style={{ backgroundColor: colors.border }}></div>
                      ))}
                    </div>
                  </div>
                ) : completed.length === 0 ? (
                  <div className="text-center py-8 rounded-xl border-2 border-dashed" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                    <Icons.Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: colors.textLighter }} />
                    <div className="text-sm" style={{ color: colors.textLight }}>{t('supSvc.noConfirmed')}</div>
                  </div>
                ) : (
                  completed.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCompletedId(prev => prev === c.id ? null : c.id)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all duration-300 hover:shadow-md ${
                        selectedCompletedId === c.id ? 'ring-2 ring-[#D97706]' : ''
                      }`}
                      style={{ 
                        backgroundColor: colors.cardBg, 
                        borderColor: selectedCompletedId === c.id ? colors.primary : colors.border
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold" style={{ color: colors.text }}>
                          {c.vehicle_plate ?? '—'} • {(() => { const dd = driverDisplay(c); return dd.name || '—'; })()}
                        </div>
                        {getStatusBadge(c.supervisor_status ?? null)}
                      </div>
                      <div className="text-sm" style={{ color: colors.textLight }}>
                        {new Date(c.supervisor_decided_at || c.created_at).toLocaleString()}
                      </div>
                      
                      {selectedCompletedId === c.id && (
                        <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: colors.border }}>
                          <div className="text-sm" style={{ color: colors.text }}>
                            <span className="font-semibold">{t('supSvc.time')}</span> {String(c.service_start).slice(0,5)} - {String(c.service_end).slice(0,5)}
                          </div>
                          {c.supervisor_reason && (
                            <div className="text-sm" style={{ color: colors.text }}>
                              <span className="font-semibold">{t('supSvc.note')}</span> {c.supervisor_reason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Verification Modal */}
        {verifyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 animate-fadeIn" onClick={() => (!verifySubmitting ? setVerifyOpen(false) : null)} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl animate-scaleIn" style={{ borderColor: colors.border }}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${verifyStatus === 'complete' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <h3 className="text-xl font-bold" style={{ color: colors.text }}>
                  {verifyStatus === 'complete' ? t('supSvc.confirmComplete') : t('supSvc.markIncomplete')}
                </h3>
              </div>
              
              <p className="text-sm mb-4" style={{ color: colors.textLight }}>
                {verifyStatus === 'complete' 
                  ? t('supSvc.note')
                  : t('supSvc.note')}
              </p>
              
              <textarea
                value={verifyReason}
                onChange={(e) => setVerifyReason(e.target.value)}
                className="w-full h-32 rounded-xl border p-4 text-sm focus:outline-none focus:ring-2 focus:border-[#D97706] focus:ring-[#D97706] transition-all duration-300 resize-none"
                style={{ 
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                  color: colors.text,
                }}
                placeholder={verifyStatus === 'complete' ? t('supSvc.note') : t('supSvc.note')}
                disabled={verifySubmitting}
              />
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => (!verifySubmitting ? setVerifyOpen(false) : null)}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold border transition-all duration-300 hover:shadow-md active:scale-95 disabled:opacity-60"
                  style={{ 
                    backgroundColor: colors.cardBg,
                    borderColor: colors.border,
                    color: colors.text
                  }}
                  disabled={verifySubmitting}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={submitVerify}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all duration-300 hover:shadow-lg active:scale-95 disabled:opacity-60 ${
                    verifyStatus === 'complete' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                  disabled={verifySubmitting}
                >
                  {verifySubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Icons.Check className="w-4 h-4" />
                  )}
                  <span>{t('common.submit')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}