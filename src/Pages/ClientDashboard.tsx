import { useEffect, useMemo, useState } from 'react';
import type { SVGProps } from 'react';
import { BarChart3, Receipt, User, MessageSquare } from 'lucide-react';
import { useI18n } from 'src/lib/i18n';
const apiBase = import.meta.env.VITE_API_URL as string;

// Icon components
const Icons = {
  Client: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      className={`w-6 h-6 ${props.className || ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Payment: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      className={`w-6 h-6 ${props.className || ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  ),
  Phone: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      className={`w-5 h-5 ${props.className || ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  Check: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      className={`w-5 h-5 ${props.className || ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Loading: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      className={`w-5 h-5 animate-spin ${props.className || ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m8-10h-4M6 12H2" />
    </svg>
  ),
  Alert: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      className={`w-5 h-5 ${props.className || ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const ClientDashboard = () => {
  const { t } = useI18n();
  const clientName = 'John Client';

  // zoneId not needed in component state
  const [clientId, setClientId] = useState<number | null>(null);
  const [zoneServiceDays, setZoneServiceDays] = useState<number[]>([]);
  const [zoneSchedule, setZoneSchedule] = useState<Array<{
    id: number;
    service_day: number;
    service_start: string;
    service_end: string;
    supervisor_status: string | null;
    supervisor_reason?: string | null;
    vehicle_plate?: string | null;
    driver_username?: string | null;
    supervisor_decided_at?: string | null;
    complained_client_ids?: number[];
  }>>([]);
  const [_complaining, setComplaining] = useState<Record<number, boolean>>({});
  const weekdayNames = useMemo(() => [
    t('weekday.mon'),
    t('weekday.tue'),
    t('weekday.wed'),
    t('weekday.thu'),
    t('weekday.fri'),
    t('weekday.sat'),
    t('weekday.sun')
  ], [t]);
  const zoneServiceDayNames = useMemo(() => zoneServiceDays
    .map(d => weekdayNames[(Number(d) || 1) - 1])
    .filter(Boolean), [zoneServiceDays]);

  const [monthlyAmount, setMonthlyAmount] = useState<number | null>(null);
  const [paidThisMonth, setPaidThisMonth] = useState<number>(0);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<
    | { type: 'idle' }
    | { type: 'pending'; message: string }
    | { type: 'success'; message: string }
    | { type: 'error'; message: string }
  >({ type: 'idle' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !apiBase) return;
    (async () => {
      try {
        const meRes = await fetch(`${apiBase}/api/clients/me`, { headers: { Authorization: `Bearer ${token}` } });
        const me = await meRes.json();
        if (meRes.ok && me?.client?.zone_id) {
          // zoneId not stored in state
          setClientId(me.client.id);
          if (me?.client?.monthly_amount != null) setMonthlyAmount(Number(me.client.monthly_amount));
          const sdRes = await fetch(`${apiBase}/api/zones/${me.client.zone_id}/service-days`, { headers: { Authorization: `Bearer ${token}` } });
          const sd = await sdRes.json();
          if (sdRes.ok && Array.isArray(sd?.serviceDays)) {
            setZoneServiceDays(sd.serviceDays.map((x: any) => Number(x)).filter((x: any) => x >= 1 && x <= 7));
          }
          const schRes = await fetch(`${apiBase}/api/zones/${me.client.zone_id}/schedule`, { headers: { Authorization: `Bearer ${token}` } });
          const sch = await schRes.json();
          if (schRes.ok && Array.isArray(sch?.schedule)) {
            setZoneSchedule(sch.schedule);
          }

          // Fetch payments statements for this client and compute this month's total
          const stmRes = await fetch(`${apiBase}/api/payments/statements`, { headers: { Authorization: `Bearer ${token}` } });
          const stm = await stmRes.json();
          if (stmRes.ok && Array.isArray(stm?.payments)) {
            const now = new Date();
            const y = now.getFullYear();
            const m = now.getMonth();
            const sum = stm.payments
              .filter((p: any) => p?.client_id === me.client.id && p?.completed_at)
              .map((p: any) => ({ amt: Number(p.amount) || 0, dt: new Date(p.completed_at) }))
              .filter(({ dt }: any) => dt.getFullYear() === y && dt.getMonth() === m)
              .reduce((acc: number, { amt }: any) => acc + amt, 0);
            setPaidThisMonth(sum);
          }
        }
      } catch {}
    })();
  }, []);

  const canComplain = (entry: { supervisor_status: string | null; supervisor_decided_at?: string | null; complained_client_ids?: number[] }) => {
    if (!entry || entry.supervisor_status !== 'complete') return false;
    if (!entry.supervisor_decided_at) return false;
    const decidedAt = new Date(entry.supervisor_decided_at);
    const cutoff = new Date(decidedAt.getTime() + 24 * 60 * 60 * 1000);
    const within = new Date() <= cutoff;
    const already = (entry.complained_client_ids || []).includes(clientId || -1);
    return within && !already;
  };

  const visibleSchedule = useMemo(() => {
    const now = new Date();
    return zoneSchedule.filter((e) => {
      if (e.supervisor_status !== 'complete') return true; // pending or not_complete stay visible
      if (!e.supervisor_decided_at) return true;
      const decidedAt = new Date(e.supervisor_decided_at);
      const cutoff = new Date(decidedAt.getTime() + 24 * 60 * 60 * 1000);
      const complained = (e.complained_client_ids || []).includes(clientId || -1);
      // hide only if older than 24h and no complaint
      return complained || now <= cutoff;
    });
  }, [zoneSchedule, clientId]);

  const submitComplaint = async (scheduleId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      setComplaining((p) => ({ ...p, [scheduleId]: true }));
      const res = await fetch(`${apiBase}/api/clients/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scheduleId })
      });
      const data = await res.json();
      if (res.ok && data?.schedule?.complained_client_ids) {
        setZoneSchedule((prev) => prev.map((x) => (x.id === scheduleId ? { ...x, complained_client_ids: data.schedule.complained_client_ids } : x)));
      }
    } finally {
      setComplaining((p) => ({ ...p, [scheduleId]: false }));
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\+?\d{9,15}$/.test(phoneNumber)) {
      setStatus({ type: 'error', message: t('clientDashboard.pay.phoneInvalid') });
      return;
    }

    setSubmitting(true);
    setStatus({ type: 'pending', message: t('clientDashboard.pay.initiated') });

    try {
      const token = localStorage.getItem('token');
      if (!token || monthlyAmount == null) {
        setStatus({ type: 'error', message: t('clientDashboard.pay.missing') });
        return;
      }
      const amountToPay = Number(monthlyAmount);

      const res = await fetch(`${apiBase}/api/payments/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amountToPay, phoneNumber }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to initiate payment');
      }
      setStatus({ type: 'pending', message: t('clientDashboard.pay.requestSent') });
    } catch (err) {
      setStatus({ type: 'error', message: (err as any)?.message || t('clientDashboard.pay.failed') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold ucs-gradient-text">
              {t('clientDashboard.title')}
            </h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">{t('clientDashboard.subtitle')}</p>
          </div>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <span>{t('clientDashboard.accountActive')}</span>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column - Profile and Info Cards */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Client Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 transition-all duration-300 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-sm font-semibold text-gray-600">{t('client.profile')}</span>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium border border-green-200">
                      {t('common.verified')}
                    </span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-charcoal">{clientName}</p>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">{t('clientDashboard.activeClient')}</p>
                </div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Icons.Client />
                </div>
              </div>
            </div>

            {/* Info Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Service Day Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-sm font-semibold text-gray-600">{t('clientDashboard.serviceDay')}</span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{t('clientDashboard.serviceDayDesc')}</p>
                <p className="text-lg sm:text-xl font-bold text-charcoal">
                  {zoneServiceDayNames.length ? zoneServiceDayNames.join(', ') : t('clientDashboard.notSet')}
                </p>
              </div>

              {/* Amount To Pay Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-sm font-semibold text-gray-600">{t('clientDashboard.amountToPay')}</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-charcoal">
                  {monthlyAmount != null ? `$${monthlyAmount.toLocaleString()}` : t('clientDashboard.amountToPayUnknown')}
                </p>
                <p className="text-gray-600 text-sm mt-1">{t('clientDashboard.monthlyAmountLabel')}</p>
                {monthlyAmount != null && (
                  <p className="text-gray-500 text-xs mt-2">
                    {t('clientDashboard.remainingThisMonth')} ${Math.max(0, monthlyAmount - paidThisMonth).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Amount Paid This Month Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center space-x-2 mb-3">
                  <Icons.Payment className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-gray-600">{t('clientDashboard.paidThisMonth')}</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-charcoal">${paidThisMonth.toLocaleString()}</p>
                <p className="text-gray-600 text-sm mt-1">{t('clientDashboard.totalPaidThisMonth')}</p>
                {monthlyAmount != null && (
                  <div className="flex items-center space-x-2 mt-3">
                    <div className={`w-2 h-2 rounded-full ${paidThisMonth >= monthlyAmount ? 'bg-green-600' : 'bg-amber-500'}`}></div>
                    <span className={`text-xs font-medium ${paidThisMonth >= monthlyAmount ? 'text-green-600' : 'text-amber-600'}`}>
                      {paidThisMonth >= monthlyAmount ? t('clientDashboard.paymentUpToDate') : t('clientDashboard.paymentPending')}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-charcoal mb-4">{t('clientDashboard.quickActions')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t('clientDashboard.qa.paymentHistory'), Icon: BarChart3, color: 'text-amber-600 bg-amber-50' },
                    { label: t('clientDashboard.qa.receipts'), Icon: Receipt, color: 'text-green-600 bg-green-50' },
                    { label: t('clientDashboard.qa.profile'), Icon: User, color: 'text-charcoal bg-gray-100' },
                    { label: t('clientDashboard.qa.support'), Icon: MessageSquare, color: 'text-gray-600 bg-gray-50' },
                  ].map(({ label, Icon, color }, index) => (
                    <button
                      key={index}
                      className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg hover:bg-amber-50 border border-gray-200 hover:border-amber-200 transition-all duration-200 group"
                    >
                      <span className={`mb-2 p-2 rounded-lg ${color}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-medium text-charcoal text-center group-hover:text-amber-700">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Service Schedule Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-charcoal">{t('clientDashboard.serviceSchedule')}</h2>
              </div>
              {visibleSchedule.length === 0 ? (
                <div className="text-gray-600 text-center py-8">{t('clientDashboard.noSchedule')}</div>
              ) : (
                <div className="space-y-3">
                  {visibleSchedule.map((e) => {
                    const dayName = weekdayNames[(Number(e.service_day) || 1) - 1] || '';
                    const status = e.supervisor_status;
                    const badge = status == null
                      ? { text: t('clientDashboard.badge.pending'), cls: 'bg-amber-50 text-amber-700 border-amber-200' }
                      : status === 'complete'
                      ? { text: t('clientDashboard.badge.completed'), cls: 'bg-green-50 text-green-700 border-green-200' }
                      : { text: t('clientDashboard.badge.notCompleted'), cls: 'bg-red-50 text-red-700 border-red-200' };
                    return (
                      <div key={e.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <div className="text-charcoal font-semibold text-sm sm:text-base">{dayName}</div>
                              <div className="text-gray-600 text-xs sm:text-sm">{e.service_start?.slice(0,5)} - {e.service_end?.slice(0,5)}</div>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-lg border ${badge.cls} self-start sm:self-auto`}>
                              {badge.text}
                            </span>
                          </div>
                          <div className="text-gray-500 text-xs mt-2">
                            {e.vehicle_plate ? `${t('clientDashboard.vehiclePrefix')} ${e.vehicle_plate}` : ''}
                            {e.vehicle_plate && e.driver_username ? ' • ' : ''}
                            {e.driver_username ? `${t('clientDashboard.driverPrefix')} ${e.driver_username}` : ''}
                          </div>
                          {status === 'not_complete' && e.supervisor_reason && (
                            <div className="text-red-600 text-xs mt-2">{t('clientDashboard.reasonPrefix')} {e.supervisor_reason}</div>
                          )}
                          {status === 'complete' && (e.complained_client_ids || []).includes(clientId || -1) && (
                            <div className="text-amber-700 text-xs mt-2">{t('clientDashboard.complaintSubmitted')}</div>
                          )}
                          {status === 'complete' && canComplain(e) && (
                            <button
                              className="text-xs text-amber-700 font-medium mt-2 hover:text-amber-800 transition-colors"
                              onClick={() => submitComplaint(e.id)}
                            >
                              {t('clientDashboard.complainCta')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Payment Form */}
          <div className="space-y-6 sm:space-y-8">
            {/* Payment Form Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <div className="flex items-center space-x-2 mb-6">
                <Icons.Payment className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg sm:text-xl font-bold text-charcoal">{t('payment.makePayment')}</h2>
              </div>

              {/* Status Messages */}
              {status.type !== 'idle' && (
                <div className={`mb-6 p-4 rounded-xl border transition-all duration-300 ${
                  status.type === 'pending'
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : status.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : status.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : ''
                }`}>
                  <div className="flex items-center space-x-2">
                    {status.type === 'pending' && <Icons.Loading />}
                    {status.type === 'success' && <Icons.Check />}
                    {status.type === 'error' && <Icons.Alert />}
                    <span className="font-medium text-sm">{status.message}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handlePay} className="space-y-6">
                {monthlyAmount != null && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="text-xs text-amber-700">{t('clientDashboard.amountToPay')}</div>
                    <div className="text-lg font-bold text-charcoal">
                      {`$${Number(monthlyAmount).toLocaleString()}`}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-3">
                    <div className="flex items-center space-x-2">
                      <Icons.Phone className="w-4 h-4 text-amber-600" />
                      <span>{t('payment.phoneNumber')}</span>
                    </div>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder={t('clientDashboard.pay.phonePlaceholder')}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 text-charcoal placeholder-gray-400"
                    disabled={submitting}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {t('clientDashboard.pay.phoneHelp')}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full flex items-center justify-center space-x-2 py-4 rounded-xl font-semibold shadow-sm transition-all duration-200 ${
                    submitting 
                      ? 'bg-amber-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 hover:shadow-md'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Icons.Loading />
                      <span className="text-white text-sm">{t('payment.processing')}</span>
                    </>
                  ) : (
                    <span className="text-white text-sm">{t('payment.payNow')}</span>
                  )}
                </button>
              </form>

              {/* Payment Info */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="text-sm font-semibold text-charcoal mb-2">{t('payment.infoTitle')}</h3>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• {t('clientDashboard.info.paymentsProcessed')}</li>
                  <li>• {t('clientDashboard.info.stkPush')}</li>
                  <li>• {t('clientDashboard.info.fees')}</li>
                  <li>• {t('clientDashboard.info.receipts')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .text-charcoal {
          color: #1E1E1E;
        }
        .bg-amber-50 {
          background-color: #FFFBEB;
        }
        .bg-amber-500 {
          background-color: #D97706;
        }
        .bg-amber-600 {
          background-color: #B45309;
        }
        .text-amber-600 {
          color: #D97706;
        }
        .text-amber-700 {
          color: #B45309;
        }
        .border-amber-200 {
          border-color: #FCD34D;
        }
        .bg-green-50 {
          background-color: #F0FDF4;
        }
        .text-green-600 {
          color: #15803D;
        }
        .border-green-200 {
          border-color: #BBF7D0;
        }
      `}</style>
    </div>
  );
};

export default ClientDashboard;