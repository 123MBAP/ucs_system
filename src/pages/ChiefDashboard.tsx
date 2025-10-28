import { useMemo } from 'react';

type ChiefSummary = {
  chiefName: string;
  zoneName: string;
  clientsTotal: number;
  amountTotal: number;
  amountPaid: number;
  todayPayments: number;
};

const ChiefDashboard = () => {
  // Mocked data: replace with API integration later
  const summary: ChiefSummary = useMemo(() => ({
    chiefName: 'Jane Smith',
    zoneName: 'Zone 2',
    clientsTotal: 120,
    amountTotal: 96000,
    amountPaid: 68400,
    todayPayments: 5200,
  }), []);

  const amountRemaining = summary.amountTotal - summary.amountPaid;
  const clientsPaid = Math.round(summary.clientsTotal * 0.62);
  const clientsRemaining = summary.clientsTotal - clientsPaid;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chief of Zone Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Overview for chief and zone</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Chief</p>
          <p className="text-lg font-semibold text-gray-900">{summary.chiefName}</p>
          <p className="text-sm text-gray-500 mt-2">Zone</p>
          <p className="text-lg font-semibold text-gray-900">{summary.zoneName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Number of Clients</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{summary.clientsTotal.toLocaleString()}</p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Amount To Be Paid</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${summary.amountTotal.toLocaleString()}</p>
            </div>
            <div className="text-3xl">💼</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Amount Paid</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${summary.amountPaid.toLocaleString()}</p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Remaining Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${amountRemaining.toLocaleString()}</p>
            </div>
            <div className="text-3xl">🧮</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clients Paid</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{clientsPaid.toLocaleString()}</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clients Remaining</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{clientsRemaining.toLocaleString()}</p>
            </div>
            <div className="text-3xl">⏳</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Payments</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${summary.todayPayments.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">Payments received today</p>
            </div>
            <div className="text-3xl">📅</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChiefDashboard;
