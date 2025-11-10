import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from 'src/Components/SideBar';
import { useI18n } from 'src/lib/i18n';

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
const Chat = lazy(() => import('src/Pages/Chat'));
const VerifyEmail = lazy(() => import('src/Pages/VerifyEmail'));
const Superuser = lazy(() => import('src/Pages/Superuser'));

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem('token')));
  const [user, setUser] = useState<any>(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const location = useLocation();
  const onLoginPage = location.pathname === '/login';
  const publicRoutes = new Set(['/login', '/verify-email']);
  const shellBg = onLoginPage ? 'bg-neutral-900' : 'bg-gradient-to-br from-zinc-50 to-amber-50';
  const { t, lang, setLang } = useI18n();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = React.useRef<HTMLDivElement | null>(null);
  const initials = (name?: string, email?: string) => {
    const src = (name && name.trim()) || (email && email.split('@')[0]) || '';
    if (!src) return 'U';
    const parts = src.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || '';
    const second = parts[1]?.[0] || '';
    return (first + second || first || 'U').toUpperCase();
  };

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!langRef.current) return;
      if (!langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  React.useEffect(() => {
    const sync = () => {
      setIsLoggedIn(Boolean(localStorage.getItem('token')));
      try {
        const u = localStorage.getItem('user');
        setUser(u ? JSON.parse(u) : null);
      } catch {
        setUser(null);
      }
    };
    window.addEventListener('storage', sync);
    window.addEventListener('auth-changed', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('auth-changed', sync as EventListener);
    };
  }, []);

  function autoLogout() {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {}
    window.dispatchEvent(new Event('auth-changed'));
    if (location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  // Route guard: redirect to /login if visiting protected routes without token
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const isPublic = publicRoutes.has(location.pathname);
    if (!token && !isPublic) {
      autoLogout();
    }
  }, [location.pathname]);

  // Install global fetch wrapper once to inject Authorization and auto-logout on 401
  React.useEffect(() => {
    const w = window as any;
    if (w.__fetch_patched__) return;
    const origFetch: typeof window.fetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const token = localStorage.getItem('token');
        const headers = new Headers(init?.headers || {});
        if (token && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        const resp = await origFetch(input, { ...init, headers });
        if (resp.status === 401) {
          // Attempt to read body for consistency, but don't block logout
          try { await resp.clone().json(); } catch {}
          autoLogout();
        }
        return resp;
      } catch (e) {
        // Network or other error — fall through
        throw e;
      }
    };
    w.__fetch_patched__ = true;
  }, []);

  return (
    <div className={`flex min-h-screen w-full overflow-x-hidden lg:pl-[var(--sidebar-w)] ${shellBg}`}>
      {isLoggedIn && !onLoginPage && (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        {isLoggedIn && !onLoginPage && (
          <header className="bg-gradient-to-r from-neutral-900 to-neutral-800 backdrop-blur shadow-sm z-10 border-b border-neutral-700">
            <div className="flex items-center justify-between p-3 sm:p-4 gap-2 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-xl hover:bg-neutral-800 transition-colors duration-200"
                >
                  <svg className="w-6 h-6 text-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="flex flex-col min-w-0 max-w-[60vw] sm:max-w-none">
                  <h1 className="text-sm sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent whitespace-nowrap truncate">
                    {t('app.title')}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">{t('app.subtitle')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                {/* Language Switcher (compact) */}
                <div ref={langRef} className="relative">
                  <button
                    onClick={() => setLangOpen(v => !v)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm border border-neutral-700 text-gray-200 hover:bg-neutral-800 min-w-[36px] sm:min-w-[56px] justify-center"
                    aria-haspopup="listbox"
                    aria-expanded={langOpen}
                    aria-label="Change language"
                  >
                    <span className="text-base leading-none">{lang === 'rw' ? '🇷🇼' : '🇬🇧'}</span>
                    <span className="font-semibold hidden sm:inline">{lang === 'rw' ? 'RW' : 'EN'}</span>
                    <svg className="w-4 h-4 text-gray-300 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {langOpen && (
                    <div className="absolute right-0 mt-1 w-28 bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg overflow-hidden z-20">
                      <button
                        onClick={() => { setLang('en'); setLangOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-neutral-800 ${lang === 'en' ? 'bg-neutral-800 text-white' : 'text-gray-200'}`}
                        role="option"
                        aria-selected={lang === 'en'}
                      >
                        <span>🇬🇧</span>
                        <span>English</span>
                      </button>
                      <button
                        onClick={() => { setLang('rw'); setLangOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-neutral-800 ${lang === 'rw' ? 'bg-neutral-800 text-white' : 'text-gray-200'}`}
                        role="option"
                        aria-selected={lang === 'rw'}
                      >
                        <span>🇷🇼</span>
                        <span>Kinyarwanda</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile User Avatar */}
                <div className="md:hidden">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-400 rounded-full flex items-center justify-center shadow">
                    <span className="font-semibold text-white text-xs">{initials(user?.name || user?.fullName, user?.email)}</span>
                  </div>
                </div>

                {/* User Profile */}
                <div className="hidden md:flex items-center space-x-3 p-2 rounded-xl hover:bg-neutral-800 transition-colors duration-200 cursor-pointer">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-400 rounded-full flex items-center justify-center shadow-lg">
                    <span className="font-semibold text-white text-sm">{initials(user?.name || user?.fullName, user?.email)}</span>
                  </div>
                  <div className="hidden md:block min-w-0">
                    <p className="text-sm font-semibold text-gray-100 truncate max-w-[160px]">{user?.name || user?.fullName || user?.username || 'User'}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[160px]">{user?.role || user?.email || ''}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              ? 'flex-1'
              : 'flex-1 p-0 sm:p-2 md:p-4 bg-gradient-to-b from-white to-amber-50/30'
          }
        >
          <div className={onLoginPage ? 'w-full min-w-0' : 'max-w-none md:max-w-7xl mx-auto w-full min-w-0'}>
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
                <Route path="/chat" element={<Chat />} />
                <Route path="/superuser" element={<Superuser />} />
                <Route path="/manage-workers" element={<ManageWorkers />} />
                <Route path="/workers" element={<Workers />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/register-manpower" element={<RegisterManpower />} />
                <Route path="/register-client" element={<RegisterClient />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
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
                    <span>{t('app.systemOnline')}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button className="hover:text-amber-700 transition-colors duration-200">{t('nav.help')}</button>
                <button className="hover:text-amber-700 transition-colors duration-200">{t('nav.privacy')}</button>
                <button className="hover:text-amber-700 transition-colors duration-200">{t('nav.terms')}</button>
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
    case 'superuser':
      return <Navigate to="/superuser" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default App;
