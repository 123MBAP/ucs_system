import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from 'src/Components/SideBar';

// Lazy-loaded route components (code-splitting)
const AddNewZone = lazy(() => import('src/Pages/AddNewZone'));
const ChiefDashboard = lazy(() => import('src/Pages/ChiefDashboard'));
const ChiefServicePlan = lazy(() => import('src/Pages/ChiefServicePlan'));
const ClientDashboard = lazy(() => import('src/Pages/ClientDashboard'));
const Clients = lazy(() => import('src/Pages/Clients'));
const Dashboard = lazy(() => import('src/Pages/Dashboard'));
const DriverDashboard = lazy(() => import('src/Pages/DriverDashboard'));
const Login = lazy(() => import('src/Pages/Login'));
const ManageWorkers = lazy(() => import('src/Pages/ManageWorkers'));
const ManpowerDashboard = lazy(() => import('src/Pages/ManpowerDashboard'));
const Payments = lazy(() => import('src/Pages/Payments'));
const Profile = lazy(() => import('src/Pages/Profile'));
const RegisterCar = lazy(() => import('src/Pages/RegisterCar'));
const RegisterChiefOfZone = lazy(() => import('src/Pages/RegisterChiefOfZone'));
const RegisterClient = lazy(() => import('src/Pages/RegisterClient'));
const RegisterDriver = lazy(() => import('src/Pages/RegisterDriver'));
const RegisterManpower = lazy(() => import('src/Pages/RegisterManpower'));
const RegisterSupervisor = lazy(() => import('src/Pages/RegisterSupervisor'));
const RegisterVehicle = lazy(() => import('src/Pages/RegisterVehicle'));
const Reports = lazy(() => import('src/Pages/Reports'));
const SupervisorDashboard = lazy(() => import('src/Pages/SupervisorDashboard'));
const SupervisorServiceSchedule = lazy(() => import('src/Pages/SupervisorServiceSchedule'));
const SupervisorServices = lazy(() => import('src/Pages/SupervisorServices'));
const VehiclesDrivers = lazy(() => import('src/Pages/VehiclesDrivers'));
const Workers = lazy(() => import('src/Pages/Workers'));
const ZoneClients = lazy(() => import('src/Pages/ZoneClients'));
const ZoneDetail = lazy(() => import('src/Pages/ZoneDetail'));
const ZoneManpower = lazy(() => import('src/Pages/ZoneManpower'));
const Zones = lazy(() => import('src/Pages/Zones'));
const ZoneSupervision = lazy(() => import('src/Pages/ZoneSupervision'));

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem('token')));
  const location = useLocation();
  const onLoginPage = location.pathname === '/login';
  const shellBg = onLoginPage ? '' : 'bg-gradient-to-br from-zinc-50 to-amber-50';

  React.useEffect(() => {
    const syncAuth = () => setIsLoggedIn(Boolean(localStorage.getItem('token')));
    window.addEventListener('storage', syncAuth);
    window.addEventListener('auth-changed', syncAuth as EventListener);
    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('auth-changed', syncAuth as EventListener);
    };
  }, []);

  return (
    <div className={`flex h-screen ${shellBg}`}>
      {isLoggedIn && !onLoginPage && (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        {isLoggedIn && !onLoginPage && (
          <header className="bg-white/90 backdrop-blur-md shadow-sm z-10 border-b border-amber-200">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-xl hover:bg-amber-50 transition-colors duration-200"
                >
                  <svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-amber-500 bg-clip-text text-transparent">
                    UCS Management System
                  </h1>
                  <p className="text-sm text-amber-700/70">Streamlined operations management</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button className="relative p-2 rounded-xl hover:bg-amber-50 transition-colors duration-200 group">
                  <svg className="w-6 h-6 text-amber-700 group-hover:text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.24 8.56a5.97 5.97 0 01-4.66-7.4 1 1 0 00-.68-1.2A1 1 0 004 1a6 6 0 006.24 7.56z" />
                  </svg>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User Profile */}
                <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-amber-50 transition-colors duration-200 cursor-pointer">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-400 rounded-full flex items-center justify-center shadow-lg">
                    <span className="font-semibold text-white text-sm">AD</span>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-semibold text-amber-900">Admin User</p>
                    <p className="text-xs text-amber-700/70">Administrator</p>
                  </div>
                  <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Main Content */}
        <main
          className={
            onLoginPage
              ? 'flex-1 overflow-y-auto'
              : 'flex-1 overflow-y-auto p-6 bg-gradient-to-b from-white to-amber-50/30'
          }
        >
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<div className="p-6">Loading...</div>}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<RoleHome />} />
                <Route path="/register-driver" element={<RegisterDriver />} />
                <Route path="/register-car" element={<RegisterCar />} />
                <Route path="/add-zone" element={<AddNewZone />} />
                <Route path="/register-supervisor" element={<RegisterSupervisor />} />
                <Route path="/register-chief" element={<RegisterChiefOfZone />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/supervisor-dashboard" element={<SupervisorDashboard />} />
                <Route path="/supervisor/services" element={<SupervisorServices />} />
                <Route path="/chief-dashboard" element={<ChiefDashboard />} />
                <Route path="/chief-service-plan" element={<ChiefServicePlan />} />
                <Route path="/client-dashboard" element={<ClientDashboard />} />
                <Route path="/manpower-dashboard" element={<ManpowerDashboard />} />
                <Route path="/driver-dashboard" element={<DriverDashboard />} />
                <Route path="/zones" element={<Zones />} />
                <Route path="/zones/:id" element={<ZoneDetail />} />
                <Route path="/zones/:id/clients" element={<ZoneClients />} />
                <Route path="/zones/:id/manpower" element={<ZoneManpower />} />
                <Route path="/supervisor/zones/:id/supervision" element={<ZoneSupervision />} />
                <Route path="/supervisor/zones/:id/schedule" element={<SupervisorServiceSchedule />} />
                <Route path="/vehicles" element={<VehiclesDrivers />} />
                <Route path="/register-vehicle" element={<RegisterVehicle />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/manage-workers" element={<ManageWorkers />} />
                <Route path="/workers" element={<Workers />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/register-manpower" element={<RegisterManpower />} />
                <Route path="/register-client" element={<RegisterClient />} />
              </Routes>
            </Suspense>
          </div>
        </main>

        {/* Footer */}
        {isLoggedIn && !onLoginPage && (
          <footer className="bg-white/80 backdrop-blur-sm border-t border-amber-200 py-3 px-6">
            <div className="flex items-center justify-between text-sm text-amber-800/80">
              <div className="flex items-center space-x-4">
                <span>© 2024 UCS Company. All rights reserved.</span>
                <div className="hidden md:flex items-center space-x-4">
                  <span className="w-1 h-1 bg-amber-300 rounded-full"></span>
                  <span>v2.1.0</span>
                  <span className="w-1 h-1 bg-amber-300 rounded-full"></span>
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>System Online</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button className="hover:text-amber-700 transition-colors duration-200">Help</button>
                <button className="hover:text-amber-700 transition-colors duration-200">Privacy</button>
                <button className="hover:text-amber-700 transition-colors duration-200">Terms</button>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

function RoleHome() {
  let role: string | null = null;
  try {
    const stored = localStorage.getItem('user');
    role = stored ? (JSON.parse(stored)?.role ?? null) : null;
  } catch {}
  
  switch (role) {
    case 'manager':
      return <Dashboard />;
    case 'supervisor':
      return <Navigate to="/supervisor-dashboard" replace />;
    case 'chief':
      return <Navigate to="/chief-dashboard" replace />;
    case 'client':
      return <Navigate to="/client-dashboard" replace />;
    case 'manpower':
      return <Navigate to="/manpower-dashboard" replace />;
    case 'driver':
      return <Navigate to="/driver-dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default App;
