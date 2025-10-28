import React, { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Sidebar from './src/Components/SideBar';
import AddNewZone from './src/Pages/AddNewZone';
import Dashboard from './src/Pages/Dashboard';
import Login from './src/Pages/Login';
import RegisterChiefOfZone from './src/Pages/RegisterChiefOfZone';
import RegisterDriver from './src/Pages/RegisterDriver';
import RegisterSupervisor from './src/Pages/RegisterSupervisor';
import RegisterCar from './src/Pages/RegisterCar';
import Reports from './src/Pages/Reports';
import SupervisorDashboard from './src/Pages/SupervisorDashboard';
import ChiefDashboard from './src/Pages/ChiefDashboard';
import ClientDashboard from './src/Pages/ClientDashboard';
import Profile from './src/Pages/Profile';
import RegisterManpower from './src/Pages/RegisterManpower';
import RegisterClient from './src/Pages/RegisterClient';
import ManpowerDashboard from './src/Pages/ManpowerDashboard';
import DriverDashboard from './src/Pages/DriverDashboard';
import Zones from './src/Pages/Zones';
import ZoneDetail from './src/Pages/ZoneDetail';
import Clients from './src/Pages/Clients';
import ZoneClients from './src/Pages/ZoneClients';
import ZoneManpower from './src/Pages/ZoneManpower';
import VehiclesDrivers from './src/Pages/VehiclesDrivers';
import RegisterVehicle from './src/Pages/RegisterVehicle';
import Payments from './src/Pages/Payments';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem('token')));

  // Keep isLoggedIn in sync with localStorage without requiring a page refresh
  // Listens to both cross-tab storage changes and an in-tab custom event
  if (typeof window !== 'undefined') {
    // no-op, just ensure window exists for types
  }

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
    <BrowserRouter>
      <div className="flex h-screen bg-gray-100">
        {isLoggedIn && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white shadow-sm z-10">
            <div className="flex items-center justify-between p-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                ☰
              </button>
              <h1 className="text-2xl font-bold text-gray-800">UCS Management System</h1>
              <div className="flex items-center space-x-4">
                <button className="p-2 rounded-lg hover:bg-gray-100">🔔</button>
                <div className="w-8 h-8 bg-gray-300 rounded-full" />
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Dashboard />} />
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
              <Route path="/vehicles" element={<VehiclesDrivers />} />
              <Route path="/register-vehicle" element={<RegisterVehicle />} />
              <Route path="/register-car" element={<RegisterVehicle />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/register-manpower" element={<RegisterManpower />} />
              <Route path="/register-client" element={<RegisterClient />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;