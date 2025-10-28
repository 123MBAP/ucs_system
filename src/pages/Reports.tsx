import { useMemo } from 'react';

type ZoneReport = {
  id: string;
  name: string;
  totalAmount: number;
  totalClients: number;
  totalPaid: number;
  totalUnpaid: number;
  remaining: number;
  finishedCount: number;
  notFinishedCount: number;
  partialCount: number;
};

const mockZoneReports: ZoneReport[] = [
  { id: 'z1', name: 'Zone 1', totalAmount: 120000, totalClients: 200, totalPaid: 90000, totalUnpaid: 30000, remaining: 30000, finishedCount: 150, notFinishedCount: 40, partialCount: 10 },
  { id: 'z2', name: 'Zone 2', totalAmount: 180000, totalClients: 250, totalPaid: 120000, totalUnpaid: 60000, remaining: 60000, finishedCount: 160, notFinishedCount: 70, partialCount: 20 },
  { id: 'z3', name: 'Zone 3', totalAmount: 150000, totalClients: 180, totalPaid: 100000, totalUnpaid: 50000, remaining: 50000, finishedCount: 120, notFinishedCount: 50, partialCount: 10 },
];

const Reports = () => {
  const zones = useMemo(() => mockZoneReports, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Reports — Current Month</h2>

      {/* Zone summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {zones.map(z => (
          <div key={z.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{z.name}</h3>
                <p className="text-sm text-gray-500">Total clients: {z.totalClients}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">${z.totalAmount.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Paid: ${z.totalPaid.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Zone</th>
              <th className="px-4 py-3 text-right">Total Amount</th>
              <th className="px-4 py-3 text-right">Total Clients</th>
              <th className="px-4 py-3 text-right">Total Paid</th>
              <th className="px-4 py-3 text-right">Total Unpaid</th>
              <th className="px-4 py-3 text-right">Remaining</th>
              <th className="px-4 py-3 text-right">Finished</th>
              <th className="px-4 py-3 text-right">Not Finished</th>
              <th className="px-4 py-3 text-right">Partial</th>
            </tr>
          </thead>
          <tbody>
            {zones.map(z => (
              <tr key={z.id} className="border-t">
                <td className="px-4 py-3">{z.name}</td>
                <td className="px-4 py-3 text-right">${z.totalAmount.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{z.totalClients}</td>
                <td className="px-4 py-3 text-right">${z.totalPaid.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">${z.totalUnpaid.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">${z.remaining.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{z.finishedCount}</td>
                <td className="px-4 py-3 text-right">{z.notFinishedCount}</td>
                <td className="px-4 py-3 text-right">{z.partialCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
