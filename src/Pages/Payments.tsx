import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from 'src/lib/i18n';

const apiBase = import.meta.env.VITE_API_URL as string;

type PendingTxn = {
  id: number;
  client_id: number;
  amount: number;
  currency: string;
  provider: string;
  phone_number: string;
  purpose?: string | null;
  external_ref?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  client_username?: string;
};

type CompletedPayment = {
  id: number;
  client_id: number | null;
  amount: number;
  currency: string;
  provider: string;
  phone_number: string;
  purpose?: string | null;
  external_ref?: string | null;
  transaction_id?: string | null;
  status: string;
  created_at: string;
  completed_at: string;
  client_username?: string;
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
  Money: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  ),
  Phone: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  User: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Check: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Clock: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Refresh: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Edit: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
};

// UI Components
const Card = ({ children, className = '', padding = 'p-6', style }: { children: React.ReactNode; className?: string; padding?: string; style?: React.CSSProperties }) => (
  <div
    className={`rounded-2xl shadow-sm border transition-all duration-300 hover:shadow-md ${padding} ${className}`}
    style={{ backgroundColor: colors.cardBg, borderColor: colors.border, ...(style || {}) }}
  >
    {children}
  </div>
);

const PrimaryButton = ({ children, onClick, disabled = false, loading = false, size = 'md', className = '', type = 'button' }: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}) => {
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      type={type}
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

const Payments = () => {
  const { t } = useI18n();
  const location = useLocation();
  const monthYearLabel = new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const [pending, setPending] = useState<PendingTxn[]>([]);
  const [completed, setCompleted] = useState<CompletedPayment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // form
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [purposeEdit, setPurposeEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const paramsObj = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const selectedClientId = paramsObj.get('clientId');
  const selectedClientName = paramsObj.get('clientName');

  function loadAll() {
    const token = localStorage.getItem('token');
    if (!token) return;
    setRefreshing(true);
    setError(null);
    const params = new URLSearchParams(location.search);
    const scope = params.get('scope');
    const filter = params.get('filter');
    const parts: string[] = [];
    if (scope) parts.push(`scope=${encodeURIComponent(scope)}`);
    if (filter) parts.push(`filter=${encodeURIComponent(filter)}`);
    if (!scope) parts.push('mine=true');
    const qs = parts.length ? `?${parts.join('&')}` : '';
    
    Promise.all([
      fetch(`${apiBase}/api/payments/transactions${qs}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/payments/completed${qs}`, { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(async ([pr, rr]) => {
        const pdata = await pr.json();
        const rdata = await rr.json();
        if (!pr.ok) throw new Error(pdata?.error || 'Failed to load pending');
        if (!rr.ok) throw new Error(rdata?.error || 'Failed to load completed');
        setPending(pdata.transactions || []);
        setCompleted(rdata.payments || []);
      })
      .catch((e: any) => setError(e?.message || 'Failed to load payments'))
      .finally(() => {
        setRefreshing(false);
      });
  }

  useEffect(() => {
  const now = new Date();
  const month = now.toLocaleString(undefined, { month: 'long' });
    const base = t('payments.payForMonth', { month });
    const withClient = selectedClientName ? `${base} — ${selectedClientName}` : base;
    setPurpose(withClient);
    loadAll();
  }, [location.search, t]);

  const totalPendingThisMonth = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    return pending
      .filter(p => {
        const d = new Date(p.created_at);
        return d.getMonth() === m && d.getFullYear() === y;
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [pending]);

  const totalCompletedThisMonth = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    return completed
      .filter(c => {
        const d = new Date(c.completed_at);
        return d.getMonth() === m && d.getFullYear() === y;
      })
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [completed]);

  async function initiate(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const body: any = {
        amount: Number(amount),
        phoneNumber: phone,
        purpose: purpose,
      };
      if (selectedClientId) body.clientId = Number(selectedClientId);
      const res = await fetch(`${apiBase}/api/payments/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to initiate payment');
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate payment');
    } finally {
      setSubmitting(false);
    }
  }

  async function complete(id: number) {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      return;
    }
    try {
      setError(null);
      const res = await fetch(`${apiBase}/api/payments/transactions/${id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to complete transaction');
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Failed to complete transaction');
    }
  }

  // ...

  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ backgroundColor: colors.background }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2" style={{ color: colors.text }}>{t('payments.title')}</h1>
            <p className="text-lg" style={{ color: colors.textLight }}>{t('payments.subtitle')}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: colors.accent }}></div>
                <div className="text-2xl font-bold" style={{ color: colors.primary }}>{pending.length + completed.length}</div>
              </div>
              <div className="text-sm" style={{ color: colors.textLight }}>{t('payments.totalTransactions')}</div>
            </div>
            <PrimaryButton 
              onClick={loadAll}
              loading={refreshing}
              size="md"
              className="flex items-center gap-2"
            >
              <Icons.Refresh className="w-4 h-4" />
              <span>{t('common.refresh')}</span>
            </PrimaryButton>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-2xl p-4 border animate-fadeIn" style={{ backgroundColor: colors.errorLight, borderColor: colors.error }}>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: colors.error }}></div>
              <span className="font-semibold" style={{ color: colors.error }}>{error}</span>
            </div>
          </div>
        )}

        {/* Payment Initiation Card */}
        <Card padding="p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Icons.Money className="w-6 h-6" style={{ color: colors.primary }} />
              <h3 className="text-xl font-semibold" style={{ color: colors.text }}>{t('payments.initiatePayment')}</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl font-semibold text-white" style={{ backgroundColor: colors.primary }}>
                MTN MoMo
              </div>
              <span className="text-sm" style={{ color: colors.textLight }}>{t('payments.serviceName')}</span>
            </div>
          </div>

          <form onSubmit={initiate} className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                <Icons.Money className="w-4 h-4" style={{ color: colors.primary }} />
                {t('payments.amountRWF')}
              </label>
              <input 
                type="number" 
                min="0" 
                step="0.01" 
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all duration-300"
                style={{ 
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                  color: colors.text
                }}
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                required 
                placeholder={t('payments.amountPlaceholder')}
              />
            </div>
            
            <div>
              <label className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                <Icons.Phone className="w-4 h-4" style={{ color: colors.primary }} />
                {t('payments.phoneNumber')}
              </label>
              <input 
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all duration-300"
                style={{ 
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                  color: colors.text
                }}
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                required 
                placeholder={t('payments.phonePlaceholder')}
              />
            </div>
            
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                  <Icons.Edit className="w-4 h-4" style={{ color: colors.primary }} />
                  {t('payments.paymentPurpose')}
                </label>
                <button 
                  type="button" 
                  onClick={() => setPurposeEdit(v => !v)}
                  className="flex items-center gap-1 text-sm font-medium transition-all duration-300 hover:scale-105"
                  style={{ color: colors.primary }}
                >
                  <Icons.Edit className="w-3 h-3" />
                  {purposeEdit ? t('payments.doneEditing') : t('payments.editPurpose')}
                </button>
              </div>
              <input
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all duration-300"
                style={{ 
                  backgroundColor: purposeEdit ? colors.cardBg : colors.background,
                  borderColor: colors.border,
                  color: colors.text
                }}
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                readOnly={!purposeEdit}
                placeholder={t('payments.purposePlaceholder')}
              />
            </div>
            
            <div className="flex items-end">
              <PrimaryButton 
                type="submit"
                loading={submitting}
                disabled={!amount || !phone}
                className="w-full py-3"
              >
                <Icons.Money className="w-4 h-4" />
                <span>{t('payments.initiatePayment')}</span>
              </PrimaryButton>
            </div>
          </form>
        </Card>

        {/* Stats Overview (monthly amounts) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Icons.Clock className="w-6 h-6" style={{ color: colors.warning }} />
              <div className="text-2xl font-bold" style={{ color: colors.text }}>{pending.length}</div>
            </div>
            <div className="text-sm font-semibold" style={{ color: colors.textLight }}>{t('payments.pendingTransactions')} — {monthYearLabel}</div>
            <div className="text-lg font-bold mt-1" style={{ color: colors.warning }}>
              {totalPendingThisMonth.toLocaleString()} RWF
            </div>
          </Card>

          <Card className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Icons.Check className="w-6 h-6" style={{ color: colors.success }} />
              <div className="text-2xl font-bold" style={{ color: colors.text }}>{completed.length}</div>
            </div>
            <div className="text-sm font-semibold" style={{ color: colors.textLight }}>{t('payments.completedPayments')} — {monthYearLabel}</div>
            <div className="text-lg font-bold mt-1" style={{ color: colors.success }}>
              {totalCompletedThisMonth.toLocaleString()} RWF
            </div>
          </Card>
        </div>

        {/* Transactions Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Pending Transactions */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Icons.Clock className="w-5 h-5" style={{ color: colors.warning }} />
                <h3 className="text-lg font-semibold" style={{ color: colors.text }}>{t('payments.pendingTransactions')}</h3>
              </div>
              <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: colors.warningLight, color: colors.warning }}>
                {t('payments.waitingCount', { count: pending.length })}
              </span>
            </div>

            <div className="space-y-4">
              {pending.map(txn => (
                <div 
                  key={txn.id} 
                  className="p-4 rounded-xl border transition-all duration-300 hover:shadow-md group"
                  style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.warning }}></div>
                        <div className="font-semibold" style={{ color: colors.text }}>{t('payments.transaction', { id: txn.id })}</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div style={{ color: colors.textLight }}>{t('payments.client')}</div>
                          <div className="font-medium" style={{ color: colors.text }}>
                            {txn.client_username || `Client #${txn.client_id}`}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: colors.textLight }}>{t('payments.amount')}</div>
                          <div className="font-medium" style={{ color: colors.text }}>
                            {txn.amount.toLocaleString()} {txn.currency}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div style={{ color: colors.textLight }}>{t('payments.phone')}</div>
                          <div className="font-medium" style={{ color: colors.text }}>{txn.phone_number}</div>
                        </div>
                      </div>
                    </div>
                    
                    <AccentButton 
                      onClick={() => complete(txn.id)}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Icons.Check className="w-3 h-3" />
                      <span>{t('payments.complete')}</span>
                    </AccentButton>
                  </div>
                </div>
              ))}
              
              {!pending.length && (
                <div className="text-center py-8 rounded-xl border-2 border-dashed" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                  <Icons.Clock className="w-12 h-12 mx-auto mb-3" style={{ color: colors.textLighter }} />
                  <h4 className="text-lg font-semibold mb-2" style={{ color: colors.textLight }}>{t('payments.noPendingTitle')}</h4>
                  <p className="text-sm" style={{ color: colors.textLighter }}>{t('payments.noPendingDesc')}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Completed Payments */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Icons.Check className="w-5 h-5" style={{ color: colors.success }} />
                <h3 className="text-lg font-semibold" style={{ color: colors.text }}>{t('payments.completedPayments')}</h3>
              </div>
              <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: colors.successLight, color: colors.success }}>
                {t('payments.processedCount', { count: completed.length })}
              </span>
            </div>

            <div className="space-y-4">
              {completed.map(payment => (
                <div 
                  key={payment.id} 
                  className="p-4 rounded-xl border transition-all duration-300 hover:shadow-md"
                  style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.success }}></div>
                        <div className="font-semibold" style={{ color: colors.text }}>{t('payments.payment', { id: payment.id })}</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div style={{ color: colors.textLight }}>{t('payments.client')}</div>
                          <div className="font-medium" style={{ color: colors.text }}>
                            {payment.client_username || (payment.client_id ? `Client #${payment.client_id}` : 'N/A')}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: colors.textLight }}>{t('payments.amount')}</div>
                          <div className="font-medium" style={{ color: colors.text }}>
                            {payment.amount.toLocaleString()} {payment.currency}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: colors.textLight }}>{t('payments.status')}</div>
                          <div className="font-medium capitalize" style={{ color: colors.success }}>
                            {payment.status}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: colors.textLight }}>{t('payments.date')}</div>
                          <div className="font-medium" style={{ color: colors.text }}>
                            {new Date(payment.completed_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {!completed.length && (
                <div className="text-center py-8 rounded-xl border-2 border-dashed" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                  <Icons.Check className="w-12 h-12 mx-auto mb-3" style={{ color: colors.textLighter }} />
                  <h4 className="text-lg font-semibold mb-2" style={{ color: colors.textLight }}>{t('payments.noCompletedTitle')}</h4>
                  <p className="text-sm" style={{ color: colors.textLighter }}>{t('payments.noCompletedDesc')}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Payments;