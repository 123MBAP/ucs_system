import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type MonthlyPoint = { month: string; amount: number };
type WeeklyPoint = { week: string; amount: number };
type ChartPoint = MonthlyPoint | WeeklyPoint;

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: boolean;
  trendValue?: number;
  actionLabel?: string;
  actionTo?: string;
};

const apiBase = import.meta.env.VITE_API_URL as string;

const Dashboard = () => {
  const [chartType, setChartType] = useState<'monthly' | 'weekly'>('monthly');
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const [dashboardData, setDashboardData] = useState({
    zones: {
      total: 15,
      supervisors: 45,
      chiefs: 15
    },
    clients: {
      total: 3247
    },
    manpower: {
      total: 15680
    },
    vehicles: {
      total: 892,
      drivers: 945
    },
    payments: {
      currentMonth: 245670,
      today: 12345
    }
  });

  const monthlyData = [
    { month: 'Jan', amount: 120000 },
    { month: 'Feb', amount: 180000 },
    { month: 'Mar', amount: 150000 },
    { month: 'Apr', amount: 220000 },
    { month: 'May', amount: 190000 },
    { month: 'Jun', amount: 245670 },
  ];

  const weeklyData = [
    { week: 'Week 1', amount: 45000 },
    { week: 'Week 2', amount: 62000 },
    { week: 'Week 3', amount: 78000 },
    { week: 'Week 4', amount: 60670 },
  ];

  useEffect(() => {
    setChartData(chartType === 'monthly' ? monthlyData : weeklyData);
  }, [chartType]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    fetch(`${apiBase}/api/manager/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load dashboard');
        setDashboardData(prev => ({
          ...prev,
          zones: {
            total: data?.zones?.total ?? prev.zones.total,
            supervisors: data?.zones?.supervisors ?? prev.zones.supervisors,
            chiefs: data?.zones?.chiefs ?? prev.zones.chiefs,
          },
          clients: {
            total: data?.clients?.total ?? prev.clients.total,
          },
          manpower: {
            total: data?.manpower?.total ?? prev.manpower.total,
          },
          vehicles: {
            total: data?.vehicles?.total ?? prev.vehicles.total,
            drivers: data?.vehicles?.drivers ?? prev.vehicles.drivers,
          },
          payments: {
            currentMonth: data?.payments?.currentMonth ?? prev.payments.currentMonth,
            today: data?.payments?.today ?? prev.payments.today,
          },
        }));
      })
      .catch((e: any) => console.error('Dashboard load error:', e))
      .finally(() => setLoading(false));
  }, []);

  const StatCard = ({ title, value, subtitle, icon, trend, trendValue, actionLabel, actionTo }: StatCardProps) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && typeof trendValue === 'number' && (
            <div className={`flex items-center mt-2 text-sm ${
              trendValue > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <span>{trendValue > 0 ? '↗' : '↘'}</span>
              <span className="ml-1">{Math.abs(trendValue)}%</span>
            </div>
          )}
          {actionLabel && actionTo && (
            <div className="mt-3">
              <Link to={actionTo} className="text-blue-600 underline text-sm">
                {actionLabel}
              </Link>
            </div>
          )}
        </div>
        <div className="text-3xl text-blue-600">
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Zones Management"
          value={loading ? '…' : dashboardData.zones.total}
          subtitle={`${dashboardData.zones.supervisors} Supervisors • ${dashboardData.zones.chiefs} Chiefs`}
          icon="🗺️"
          actionLabel="Manage zones"
          actionTo="/zones"
        />
        <StatCard
          title="Total Clients"
          value={loading ? '…' : dashboardData.clients.total.toLocaleString()}
          subtitle="Active clients"
          icon="👥"
          trend={true}
          trendValue={12.5}
          actionLabel="Manage clients"
          actionTo="/clients"
        />
        <StatCard
          title="Manpower"
          value={loading ? '…' : dashboardData.manpower.total.toLocaleString()}
          subtitle="Total workforce"
          icon="👨‍💼"
          trend={true}
          trendValue={8.2}
          actionLabel="Manage manpower"
          actionTo="/zones"
        />
        <StatCard
          title="Vehicles & Drivers"
          value={loading ? '…' : dashboardData.vehicles.total}
          subtitle={`${dashboardData.vehicles.drivers} Drivers`}
          icon="🚗"
          actionLabel="Manage vehicles & drivers"
          actionTo="/vehicles"
        />
        <StatCard
          title="Current Month Payments"
          value={loading ? '…' : `$${dashboardData.payments.currentMonth.toLocaleString()}`}
          subtitle="Total payments this month"
          icon="💰"
          trend={true}
          trendValue={15.3}
        />
        <StatCard
          title="Today's Payments"
          value={loading ? '…' : `$${dashboardData.payments.today.toLocaleString()}`}
          subtitle="Payments received today"
          icon="💳"
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 md:mb-0">
            Payment Trends
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setChartType('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                chartType === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setChartType('weekly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                chartType === 'weekly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-80">
          <div className="flex items-end justify-between h-64 mt-4 space-x-2">
            {chartData.map((item: ChartPoint, index) => {
              const amounts = chartData.map(d => d.amount);
              const maxAmount = Math.max(...amounts, 1);
              const height = (item.amount / maxAmount) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="text-center mb-2">
                    <p className="text-sm font-medium text-gray-600">
                      {item.amount.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </p>
                  </div>
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg transition-all duration-300 hover:from-blue-400 hover:to-blue-500"
                    style={{ height: `${height}%` }}
                  ></div>
                  <p className="text-sm font-medium text-gray-700 mt-2">
                    {('month' in item ? item.month : item.week)}
                  </p>
                </div>
              );
            })}
          </div>
          
          {/* X-axis label */}
          <div className="text-center mt-6">
            <p className="text-sm font-medium text-gray-600">
              {chartType === 'monthly' ? 'Months' : 'Weeks of Current Month'}
            </p>
          </div>
          
          {/* Y-axis label */}
          <div className="absolute left-6 top-1/2 transform -translate-y-1/2 -rotate-90 origin-center">
            <p className="text-sm font-medium text-gray-600">Amount ($)</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;