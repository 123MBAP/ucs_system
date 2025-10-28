import { useMemo } from 'react';

type Zone = {
  id: string;
  name: string;
  chief: string;
  clients: number;
};

type Payments = {
  currentMonth: number;
  today: number;
};

const SupervisorDashboard = () => {
  const payments: Payments = useMemo(() => ({
    currentMonth: 156780,
    today: 8420,
  }), []);

  const zones: Zone[] = useMemo(() => ([
    { id: 'z1', name: 'Zone 1', chief: 'John Doe', clients: 128 },
    { id: 'z2', name: 'Zone 2', chief: 'Jane Smith', clients: 96 },
    { id: 'z3', name: 'Zone 3', chief: 'Samuel Lee', clients: 152 },
    { id: 'z4', name: 'Zone 4', chief: 'Amira Khan', clients: 87 },
  ]), []);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Month Payments</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${payments.currentMonth.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">Total payments this month</p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Payments</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${payments.today.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">Payments received today</p>
            </div>
            <div className="text-3xl">💳</div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Your Zones</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {zones.map(z => (
            <div key={z.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Zone</p>
                  <p className="text-lg font-semibold text-gray-900">{z.name}</p>
                </div>
                <div className="text-2xl">🗺️</div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Chief</span>
                  <span className="text-sm font-medium text-gray-900">{z.chief}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Clients</span>
                  <span className="text-sm font-medium text-gray-900">{z.clients}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
