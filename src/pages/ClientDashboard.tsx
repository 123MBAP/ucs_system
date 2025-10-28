import { useMemo, useState } from 'react';

type Payments = {
  currentMonth: number;
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
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Client</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{clientName}</p>
          </div>
          <div className="text-3xl">🧑</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Month Paid</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${payments.currentMonth.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">Total amount recorded this month</p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Make a Payment</h2>

          {status.type !== 'idle' && (
            <div
              className={
                `mb-4 p-3 rounded-lg text-sm ` +
                (status.type === 'pending'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : status.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : status.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : '')
              }
            >
              {status.message}
            </div>
          )}

          <form onSubmit={handlePay} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +2507XXXXXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full inline-flex items-center justify-center px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? 'Waiting for confirmation…' : 'Pay'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
