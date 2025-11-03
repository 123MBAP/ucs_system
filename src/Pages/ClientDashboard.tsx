import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Receipt, User, MessageSquare } from 'lucide-react';
const apiBase = import.meta.env.VITE_API_URL as string;

// Icon components
const Icons = {
  Client: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Payment: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>,
  Phone: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Loading: () => <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m8-10h-4M6 12H2" /></svg>,
  Alert: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

const ClientDashboard = () => {
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
  const weekdayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
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
      setStatus({ type: 'error', message: 'Enter a valid phone number (9-15 digits, optionally starting with +).' });
      return;
    }

    setSubmitting(true);
    setStatus({ type: 'pending', message: 'Payment initiated. Please confirm on your phone…' });

    try {
      // Simulate a payment initiation API and waiting for STK push confirmation
      await new Promise((resolve) => setTimeout(resolve, 1500)); // initiate
      await new Promise((resolve) => setTimeout(resolve, 3000)); // wait for confirmation

      setStatus({ type: 'success', message: 'Payment confirmed on your phone. Thank you!' });
    } catch (err) {
      setStatus({ type: 'error', message: 'Payment failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">
              Client Dashboard
            </h1>
            <p className="text-slate-600 mt-2">Welcome back! Manage your payments and account</p>
          </div>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Account Active</span>
            </div>
          </div>
        </div>

        {/* Client Profile Card */}
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-semibold text-slate-600">Client Profile</span>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full font-medium">
                  Verified
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{clientName}</p>
              <p className="text-slate-600 mt-1">Active client since 2024</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Icons.Client />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-semibold text-slate-600">Service Day</span>
                </div>
                <p className="text-slate-600">The day of service in your zone is:</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {zoneServiceDayNames.length ? zoneServiceDayNames.join(', ') : 'Not set'}
                </p>
              </div>
            </div>
          </div>
          {/* Amount To Pay (Monthly) */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-semibold text-slate-600">Amount To Pay</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{monthlyAmount != null ? `$${monthlyAmount.toLocaleString()}` : '—'}</p>
                <p className="text-slate-600 mt-2">Your monthly amount</p>
                {monthlyAmount != null && (
                  <p className="text-slate-500 text-sm mt-1">Remaining this month: ${Math.max(0, monthlyAmount - paidThisMonth).toLocaleString()}</p>
                )}
              </div>
              <div className="text-4xl opacity-20">
                <Icons.Payment />
              </div>
            </div>
          </div>
          {/* Amount Paid This Month */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Icons.Payment />
                  <span className="text-sm font-semibold text-slate-600">Amount Paid This Month</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">${paidThisMonth.toLocaleString()}</p>
                <p className="text-slate-600 mt-2">Total paid this month</p>
                {monthlyAmount != null && (
                  <div className="flex items-center space-x-2 mt-3">
                    <div className={`w-2 h-2 rounded-full ${paidThisMonth >= monthlyAmount ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                    <span className={`text-sm font-medium ${paidThisMonth >= monthlyAmount ? 'text-green-600' : 'text-amber-600'}`}>
                      {paidThisMonth >= monthlyAmount ? 'Payment up to date' : 'Payment pending'}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-4xl opacity-20">
                <Icons.Payment />
              </div>
            </div>
          </div>

          {/* Service Schedule Card */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-2 mb-4">
              <h2 className="text-xl font-bold text-slate-800">Service Schedule</h2>
            </div>
            {visibleSchedule.length === 0 ? (
              <div className="text-slate-600">No scheduled services yet.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {visibleSchedule.map((e) => {
                  const dayName = weekdayNames[(Number(e.service_day) || 1) - 1] || '';
                  const status = e.supervisor_status;
                  const badge = status == null
                    ? { text: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
                    : status === 'complete'
                    ? { text: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                    : { text: 'Not Completed', cls: 'bg-red-50 text-red-700 border-red-200' };
                  return (
                    <div key={e.id} className="py-4 flex items-start justify-between">
                      <div>
                        <div className="text-slate-900 font-semibold">{dayName}</div>
                        <div className="text-slate-600 text-sm">{e.service_start?.slice(0,5)} - {e.service_end?.slice(0,5)}</div>
                        <div className="text-slate-500 text-xs mt-1">
                          {e.vehicle_plate ? `Vehicle: ${e.vehicle_plate}` : ''}
                          {e.vehicle_plate && e.driver_username ? ' • ' : ''}
                          {e.driver_username ? `Driver: ${e.driver_username}` : ''}
                        </div>
                        {status === 'not_complete' && e.supervisor_reason && (
                          <div className="text-red-600 text-xs mt-1">Reason: {e.supervisor_reason}</div>
                        )}
                        {status === 'complete' && (e.complained_client_ids || []).includes(clientId || -1) && (
                          <div className="text-amber-700 text-xs mt-1">Complaint submitted. Awaiting review.</div>
                        )}
                        {status === 'complete' && canComplain(e) && (
                          <button
                            className="text-xs text-red-600 font-medium mt-2"
                            onClick={() => submitComplaint(e.id)}
                          >
                            My home not yet
                          </button>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg border ${badge.cls}`}>{badge.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Form Card */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-2 mb-6">
              <Icons.Payment />
              <h2 className="text-xl font-bold text-slate-800">Make a Payment</h2>
            </div>

            {/* Status Messages */}
            {status.type !== 'idle' && (
              <div className={`mb-6 p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 ${
                status.type === 'pending'
                  ? 'bg-blue-50/80 border-blue-200 text-blue-700'
                  : status.type === 'success'
                  ? 'bg-green-50/80 border-green-200 text-green-700'
                  : status.type === 'error'
                  ? 'bg-red-50/80 border-red-200 text-red-700'
                  : ''
              }`}>
                <div className="flex items-center space-x-2">
                  {status.type === 'pending' && <Icons.Loading />}
                  {status.type === 'success' && <Icons.Check />}
                  {status.type === 'error' && <Icons.Alert />}
                  <span className="font-medium">{status.message}</span>
                </div>
              </div>
            )}

            <form onSubmit={handlePay} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  <div className="flex items-center space-x-2">
                    <Icons.Phone />
                    <span>Phone Number</span>
                  </div>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +2507XXXXXXXX"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  disabled={submitting}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Enter your mobile money phone number
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full flex items-center justify-center space-x-2 py-4 rounded-xl font-semibold shadow-lg transition-all duration-200 ${
                  submitting 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl'
                }`}
              >
                {submitting ? (
                  <>
                    <Icons.Loading />
                    <span className="text-white">Processing Payment...</span>
                  </>
                ) : (
                  <span className="text-white">Pay Now</span>
                )}
              </button>
            </form>

            {/* Payment Info */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Payment Information</h3>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Payments are processed via mobile money</li>
                <li>• You will receive an STK push notification</li>
                <li>• Standard transaction fees apply</li>
                <li>• Receipts are generated automatically</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'View Payment History', Icon: BarChart3, onClick: () => {} , color: 'text-indigo-600 bg-indigo-50'},
              { label: 'Download Receipts', Icon: Receipt, onClick: () => {} , color: 'text-emerald-600 bg-emerald-50'},
              { label: 'Update Profile', Icon: User, onClick: () => {} , color: 'text-blue-600 bg-blue-50'},
              { label: 'Get Support', Icon: MessageSquare, onClick: () => {} , color: 'text-orange-600 bg-orange-50'},
            ].map(({ label, Icon, onClick, color }, index) => (
              <button
                key={index}
                onClick={onClick}
                className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl hover:bg-white border border-slate-200 hover:border-blue-200 transition-all duration-200 group hover:shadow-md"
              >
                <span className={`mb-2 p-2 rounded-lg ${color}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-medium text-slate-700 text-center group-hover:text-blue-600">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;