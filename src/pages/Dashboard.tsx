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
  gradient?: string;
};

const apiBase = import.meta.env.VITE_API_URL as string;

// Icon components
const Icons = {
  Zones: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.447-.894L15 4m0 13V4m0 0L9 7" /></svg>,
  Clients: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Manpower: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  Vehicles: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  Payments: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>,
  Today: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  TrendUp: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  TrendDown: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>,
};

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

  const StatCard = ({ title, value, subtitle, icon, trend, trendValue, actionLabel, actionTo, gradient = "from-blue-500 to-blue-600" }: StatCardProps) => (
    <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mb-2">{loading ? '...' : value}</p>
          {subtitle && (
            <p className="text-sm text-slate-500 mb-3">{subtitle}</p>
          )}
          {trend && typeof trendValue === 'number' && (
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              trendValue > 0 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {trendValue > 0 ? <Icons.TrendUp /> : <Icons.TrendDown />}
              <span className="ml-1">{Math.abs(trendValue)}%</span>
            </div>
          )}
          {actionLabel && actionTo && (
            <div className="mt-4">
              <Link 
                to={actionTo} 
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200 group-hover:underline"
              >
                {actionLabel}
                <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-slate-600 mt-2">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>System Online</span>
          </div>
        </div>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatCard
          title="Zones Management"
          value={dashboardData.zones.total}
          subtitle={`${dashboardData.zones.supervisors} Supervisors • ${dashboardData.zones.chiefs} Chiefs`}
          icon={<Icons.Zones />}
          actionLabel="Manage zones"
          actionTo="/zones"
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          title="Total Clients"
          value={dashboardData.clients.total.toLocaleString()}
          subtitle="Active clients"
          icon={<Icons.Clients />}
          trend={true}
          trendValue={12.5}
          actionLabel="Manage clients"
          actionTo="/clients"
          gradient="from-green-500 to-emerald-500"
        />
        <StatCard
          title="Manpower"
          value={dashboardData.manpower.total.toLocaleString()}
          subtitle="Total workforce"
          icon={<Icons.Manpower />}
          trend={true}
          trendValue={8.2}
          actionLabel="Manage manpower"
          actionTo="/zones"
          gradient="from-purple-500 to-pink-500"
        />
        <StatCard
          title="Vehicles & Drivers"
          value={dashboardData.vehicles.total}
          subtitle={`${dashboardData.vehicles.drivers} Drivers`}
          icon={<Icons.Vehicles />}
          actionLabel="Manage vehicles & drivers"
          actionTo="/vehicles"
          gradient="from-orange-500 to-red-500"
        />
        <StatCard
          title="Current Month Payments"
          value={`$${dashboardData.payments.currentMonth.toLocaleString()}`}
          subtitle="Total payments this month"
          icon={<Icons.Payments />}
          trend={true}
          trendValue={15.3}
          gradient="from-teal-500 to-blue-500"
        />
        <StatCard
          title="Today's Payments"
          value={`$${dashboardData.payments.today.toLocaleString()}`}
          subtitle="Payments received today"
          icon={<Icons.Today />}
          gradient="from-indigo-500 to-purple-500"
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Payment Trends</h2>
            <p className="text-slate-600 mt-1">Visual overview of payment performance</p>
          </div>
          <div className="flex space-x-2 mt-4 md:mt-0">
            <button
              onClick={() => setChartType('monthly')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                chartType === 'monthly'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setChartType('weekly')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                chartType === 'weekly'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-80 relative">
          <div className="flex items-end justify-between h-64 mt-4 space-x-3">
            {chartData.map((item: ChartPoint, index) => {
              const amounts = chartData.map(d => d.amount);
              const maxAmount = Math.max(...amounts, 1);
              const height = (item.amount / maxAmount) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center group">
                  <div className="text-center mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-slate-800 text-white text-xs font-medium px-2 py-1 rounded-lg shadow-lg">
                      ${item.amount.toLocaleString()}
                    </div>
                  </div>
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-xl transition-all duration-300 hover:from-blue-400 hover:to-blue-500 group-hover:shadow-lg group-hover:shadow-blue-500/25 cursor-pointer relative overflow-hidden"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent"></div>
                  </div>
                  <p className="text-sm font-medium text-slate-700 mt-3">
                    {('month' in item ? item.month : item.week)}
                  </p>
                </div>
              );
            })}
          </div>
          
          {/* Grid Lines */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="h-px bg-slate-200/50 top-1/4 w-full"></div>
            <div className="h-px bg-slate-200/50 top-1/2 w-full"></div>
            <div className="h-px bg-slate-200/50 top-3/4 w-full"></div>
          </div>
          
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-64 flex flex-col justify-between text-xs text-slate-500 font-medium py-2">
            <span>${Math.max(...chartData.map(d => d.amount)).toLocaleString()}</span>
            <span>${(Math.max(...chartData.map(d => d.amount)) * 0.75).toLocaleString()}</span>
            <span>${(Math.max(...chartData.map(d => d.amount)) * 0.5).toLocaleString()}</span>
            <span>${(Math.max(...chartData.map(d => d.amount)) * 0.25).toLocaleString()}</span>
            <span>$0</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Add New Zone', to: '/add-zone', icon: '🗺️' },
            { label: 'Register Client', to: '/register-client', icon: '👥' },
            { label: 'View Reports', to: '/reports', icon: '📊' },
            { label: 'Manage Workers', to: '/manage-workers', icon: '👨‍💼' },
          ].map((action, index) => (
            <Link
              key={index}
              to={action.to}
              className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all duration-200 group"
            >
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">{action.icon}</span>
              <span className="text-sm font-medium text-slate-700 text-center group-hover:text-blue-600">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;