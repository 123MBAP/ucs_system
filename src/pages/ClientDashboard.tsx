import { useMemo, useState } from 'react';

type Payments = {
  currentMonth: number;
};

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

  const payments: Payments = useMemo(
    () => ({
      currentMonth: 56890,
    }),
    []
  );

  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<
    | { type: 'idle' }
    | { type: 'pending'; message: string }
    | { type: 'success'; message: string }
    | { type: 'error'; message: string }
  >({ type: 'idle' });

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
          {/* Payment Stats Card */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Icons.Payment />
                  <span className="text-sm font-semibold text-slate-600">Current Month Payments</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">${payments.currentMonth.toLocaleString()}</p>
                <p className="text-slate-600 mt-2">Total amount paid this month</p>
                <div className="flex items-center space-x-2 mt-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600 font-medium">Payment up to date</span>
                </div>
              </div>
              <div className="text-4xl opacity-20">
                <Icons.Payment />
              </div>
            </div>
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
              { label: 'View Payment History', icon: '📊', action: () => {} },
              { label: 'Download Receipts', icon: '🧾', action: () => {} },
              { label: 'Update Profile', icon: '👤', action: () => {} },
              { label: 'Get Support', icon: '💬', action: () => {} },
            ].map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all duration-200 group"
              >
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">{action.icon}</span>
                <span className="text-sm font-medium text-slate-700 text-center group-hover:text-blue-600">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;