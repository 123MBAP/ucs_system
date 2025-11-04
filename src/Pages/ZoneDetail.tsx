import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const apiBase = import.meta.env.VITE_API_URL as string;

type Zone = {
  id: number;
  zone_name: string;
  cell: string;
  village: string;
  description: string;
  chief_username: string | null;
  client_count: number;
};

type Payments = {
  amountToBePaid: number | null;
  currentMonthPaid: number | null;
  todayPaid: number | null;
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

// Icon components
const Icons = {
  Back: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Users: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  Money: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  ),
  Calendar: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Today: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Crown: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Settings: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  UserPlus: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  Refresh: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
};

// UI Components
const Card = ({ children, className = '', padding = 'p-6' }: { children: React.ReactNode; className?: string; padding?: string }) => (
  <div className={`rounded-2xl shadow-sm border transition-all duration-300 hover:shadow-md ${padding} ${className}`} style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
    {children}
  </div>
);

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

const ZoneDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [zone, setZone] = useState<Zone | null>(null);
  const [payments, setPayments] = useState<Payments>({
    amountToBePaid: null,
    currentMonthPaid: null,
    todayPaid: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadZoneData = async () => {
    const token = localStorage.getItem("token");
    if (!token || !id) return;
    
    setRefreshing(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiBase}/api/zones/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data?.error || "Failed to load zone");
      
      setZone(data.zone);
      setPayments(
        data.payments || {
          amountToBePaid: null,
          currentMonthPaid: null,
          todayPaid: null,
        }
      );
    } catch (e: any) {
      setError(e?.message || "Failed to load zone");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadZoneData();
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: colors.primary }}></div>
          <div className="text-lg" style={{ color: colors.textLight }}>Loading zone details…</div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Card className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: colors.errorLight }}>
            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: colors.error }}></div>
          </div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: colors.error }}>Error Loading Zone</h3>
          <p className="mb-4" style={{ color: colors.textLight }}>{error}</p>
          <PrimaryButton onClick={loadZoneData} loading={refreshing}>
            <Icons.Refresh className="w-4 h-4" />
            Try Again
          </PrimaryButton>
        </Card>
      </div>
    );

  if (!zone)
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Card className="text-center max-w-md">
          <Icons.Users className="w-16 h-16 mx-auto mb-4" style={{ color: colors.textLighter }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: colors.textLight }}>Zone Not Found</h3>
          <p style={{ color: colors.textLighter }}>The requested zone could not be found.</p>
        </Card>
      </div>
    );

  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ backgroundColor: colors.background }}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 p-3 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
              style={{ backgroundColor: colors.cardBg, color: colors.textLight }}
            >
              <Icons.Back className="w-5 h-5" />
              <span className="font-semibold">Back to Zones</span>
            </button>
            <div className="w-px h-8" style={{ backgroundColor: colors.border }}></div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold" style={{ color: colors.text }}>Zone Details</h1>
              <p className="text-lg mt-2" style={{ color: colors.textLight }}>Comprehensive overview and management</p>
            </div>
          </div>
          
          <PrimaryButton 
            onClick={loadZoneData}
            loading={refreshing}
            size="md"
            className="flex items-center gap-2"
          >
            <Icons.Refresh className="w-4 h-4" />
            <span>Refresh Data</span>
          </PrimaryButton>
        </div>

        {/* Zone Overview Card */}
        <Card padding="p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: colors.primary }}></div>
                <h2 className="text-2xl lg:text-3xl font-bold" style={{ color: colors.text }}>
                  {zone.zone_name}
                </h2>
                <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: colors.primaryLight, color: colors.text }}>
                  Zone #{zone.id}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Icons.Users className="w-5 h-5" style={{ color: colors.primary }} />
                  <div>
                    <div className="font-semibold" style={{ color: colors.text }}>{zone.cell}, {zone.village}</div>
                    <div className="text-sm" style={{ color: colors.textLight }}>Location</div>
                  </div>
                </div>
                
                {zone.description && (
                  <div className="p-4 rounded-xl" style={{ backgroundColor: colors.background }}>
                    <div className="text-sm font-semibold mb-1" style={{ color: colors.text }}>Description</div>
                    <div className="text-sm" style={{ color: colors.textLight }}>{zone.description}</div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="lg:text-right">
              <div className="text-2xl font-bold mb-2" style={{ color: colors.primary }}>{zone.client_count}</div>
              <div className="text-sm font-semibold" style={{ color: colors.textLight }}>Total Clients</div>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <InfoCard
            icon={<Icons.Crown className="w-6 h-6" />}
            title="Zone Chief"
            value={zone.chief_username ?? "Unassigned"}
            color={colors.primary}
          />
          <InfoCard
            icon={<Icons.Users className="w-6 h-6" />}
            title="Total Clients"
            value={zone.client_count.toString()}
            color={colors.accent}
          />
          <InfoCard
            icon={<Icons.Money className="w-6 h-6" />}
            title="Amount To Be Paid"
            value={
              payments.amountToBePaid != null
                ? `$${payments.amountToBePaid.toLocaleString()}`
                : "N/A"
            }
            color={colors.warning}
          />
          <InfoCard
            icon={<Icons.Calendar className="w-6 h-6" />}
            title="Current Month Paid"
            value={
              payments.currentMonthPaid != null
                ? `$${payments.currentMonthPaid.toLocaleString()}`
                : "N/A"
            }
            color={colors.success}
          />
        </div>

        {/* Today's Payments Card */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Icons.Today className="w-6 h-6" style={{ color: colors.primary }} />
            <h3 className="text-xl font-semibold" style={{ color: colors.text }}>Today's Payments</h3>
          </div>
          <div className="text-3xl font-bold" style={{ color: colors.primary }}>
            {payments.todayPaid != null ? `$${payments.todayPaid.toLocaleString()}` : "N/A"}
          </div>
          <div className="text-sm mt-2" style={{ color: colors.textLight }}>
            Total payments collected today
          </div>
        </Card>

        {/* Management Section */}
        <Card padding="p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Icons.Settings className="w-6 h-6" style={{ color: colors.primary }} />
              <h3 className="text-xl font-semibold" style={{ color: colors.text }}>Zone Management</h3>
            </div>
            
            <button
              onClick={() => setManageOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
              style={{ 
                backgroundColor: manageOpen ? colors.primary : colors.background,
                color: manageOpen ? 'white' : colors.text
              }}
            >
              <Icons.Settings className="w-4 h-4" />
              <span>{manageOpen ? "Hide Options" : "Manage Zone"}</span>
            </button>
          </div>

          {manageOpen && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ManagementCard
                icon={<Icons.Users className="w-8 h-8" />}
                title="Reassign Supervisor"
                description="Assign a new supervisor to manage this zone"
                onClick={() => navigate(`/register-supervisor?zoneId=${id}&reassign=1`)}
                buttonText="Reassign"
                color={colors.primary}
              />
              <ManagementCard
                icon={<Icons.Crown className="w-8 h-8" />}
                title="Reassign Zone Chief"
                description="Assign a new chief to oversee daily operations"
                onClick={() => navigate(`/register-chief?zoneId=${id}&reassign=1`)}
                buttonText="Reassign"
                color={colors.accent}
              />
              <ManagementCard
                icon={<Icons.UserPlus className="w-8 h-8" />}
                title="Add New Client"
                description="Register a new client in this zone"
                onClick={() => navigate(`/register-client?zoneId=${id}`)}
                buttonText="Add Client"
                color={colors.success}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

function InfoCard({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card padding="p-6" className="group hover:scale-[1.02] transition-all duration-300">
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${color}15` }}
        >
          <div style={{ color }}>
            {icon}
          </div>
        </div>
        
        <div className="flex-1">
          <div className="text-sm font-semibold mb-1" style={{ color: colors.textLight }}>{title}</div>
          <div className="text-xl font-bold" style={{ color: colors.text }}>{value}</div>
        </div>
      </div>
    </Card>
  );
}

function ManagementCard({
  icon,
  title,
  description,
  onClick,
  buttonText,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  buttonText: string;
  color: string;
}) {
  return (
    <Card padding="p-6" className="group hover:scale-[1.02] transition-all duration-300">
      <div className="text-center">
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${color}15` }}
        >
          <div style={{ color }}>
            {icon}
          </div>
        </div>
        
        <h4 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>{title}</h4>
        <p className="text-sm mb-4" style={{ color: colors.textLight }}>{description}</p>
        
        <button
          onClick={onClick}
          className="w-full px-4 py-3 rounded-xl font-semibold text-white transition-all duration-300 hover:shadow-lg active:scale-95"
          style={{ backgroundColor: color }}
        >
          {buttonText}
        </button>
      </div>
    </Card>
  );
}

export default ZoneDetail;