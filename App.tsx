import React, { useState } from 'react';
import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Sidebar from '@/Components/SideBar';
import AddNewZone from '@/Pages/AddNewZone';
import Dashboard from '@/Pages/Dashboard';
import Login from '@/Pages/Login';
import RegisterChiefOfZone from '@/Pages/RegisterChiefOfZone';
import RegisterDriver from '@/Pages/RegisterDriver';
import RegisterSupervisor from '@/Pages/RegisterSupervisor';
import RegisterCar from '@/Pages/RegisterCar';
import Reports from '@/Pages/Reports';
import SupervisorDashboard from '@/Pages/SupervisorDashboard';
import ChiefDashboard from '@/Pages/ChiefDashboard';
import ClientDashboard from '@/Pages/ClientDashboard';
import Profile from '@/Pages/Profile';
import RegisterManpower from '@/Pages/RegisterManpower';
import RegisterClient from '@/Pages/RegisterClient';
import ManpowerDashboard from '@/Pages/ManpowerDashboard';
import DriverDashboard from '@/Pages/DriverDashboard';
import Zones from '@/Pages/Zones';
import ZoneDetail from '@/Pages/ZoneDetail';
import Clients from '@/Pages/Clients';
import ZoneClients from '@/Pages/ZoneClients';
import ZoneSupervision from '@/Pages/ZoneSupervision';
import ZoneManpower from '@/Pages/ZoneManpower';
import VehiclesDrivers from '@/Pages/VehiclesDrivers';
import RegisterVehicle from '@/Pages/RegisterVehicle';
import Payments from '@/Pages/Payments';
import ManageWorkers from '@/Pages/ManageWorkers';
import SupervisorServiceSchedule from '@/Pages/SupervisorServiceSchedule';

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem('token')));
  const location = useLocation();
  const onLoginPage = location.pathname === '/login';
  const shellBg = onLoginPage ? '' : 'bg-gradient-to-br from-slate-50 to-blue-50';

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
        {/* Enhanced Header */}
        {isLoggedIn && !onLoginPage && (
          <header className="bg-white/80 backdrop-blur-md shadow-sm z-10 border-b border-slate-200">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors duration-200"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">
                    UCS Management System
                  </h1>
                  <p className="text-sm text-slate-500">Streamlined operations management</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors duration-200 group">
                  <svg className="w-6 h-6 text-slate-600 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.24 8.56a5.97 5.97 0 01-4.66-7.4 1 1 0 00-.68-1.2A1 1 0 004 1a6 6 0 006.24 7.56z" />
                  </svg>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User Profile */}
                <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-100 transition-colors duration-200 cursor-pointer">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="font-semibold text-white text-sm">AD</span>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-semibold text-slate-800">Admin User</p>
                    <p className="text-xs text-slate-500">Administrator</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Main Content Area */}
        <main className={onLoginPage ? "flex-1 overflow-y-auto" : "flex-1 overflow-y-auto p-6 bg-gradient-to-b from-white to-slate-50/30"}>
          {onLoginPage ? (
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<RoleHome />} />
              <Route path="/register-driver" element={<RegisterDriver />} />
              <Route path="/register-car" element={<RegisterCar />} />
              <Route path="/add-zone" element={<AddNewZone />} />
              <Route path="/register-supervisor" element={<RegisterSupervisor />} />
              <Route path="/register-chief" element={<RegisterChiefOfZone />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/supervisor" element={<SupervisorDashboard />} />
              <Route path="/chief-dashboard" element={<ChiefDashboard />} />
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
              <Route path="/register-car" element={<RegisterVehicle />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/manage-workers" element={<ManageWorkers />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/register-manpower" element={<RegisterManpower />} />
              <Route path="/register-client" element={<RegisterClient />} />
            </Routes>
          ) : (
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<RoleHome />} />
                <Route path="/register-driver" element={<RegisterDriver />} />
                <Route path="/register-car" element={<RegisterCar />} />
                <Route path="/add-zone" element={<AddNewZone />} />
                <Route path="/register-supervisor" element={<RegisterSupervisor />} />
                <Route path="/register-chief" element={<RegisterChiefOfZone />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/supervisor" element={<SupervisorDashboard />} />
                <Route path="/chief-dashboard" element={<ChiefDashboard />} />
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
                <Route path="/register-car" element={<RegisterVehicle />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/manage-workers" element={<ManageWorkers />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/register-manpower" element={<RegisterManpower />} />
                <Route path="/register-client" element={<RegisterClient />} />
              </Routes>
            </div>
          )}
        </main>

        {/* Enhanced Footer */}
        {isLoggedIn && !onLoginPage && (
          <footer className="bg-white/60 backdrop-blur-sm border-t border-slate-200 py-3 px-6">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center space-x-4">
                <span>© 2024 UCS Company. All rights reserved.</span>
                <div className="hidden md:flex items-center space-x-4">
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span>v2.1.0</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>System Online</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button className="hover:text-blue-600 transition-colors duration-200">Help</button>
                <button className="hover:text-blue-600 transition-colors duration-200">Privacy</button>
                <button className="hover:text-blue-600 transition-colors duration-200">Terms</button>
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
      return <Navigate to="/supervisor" replace />;
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