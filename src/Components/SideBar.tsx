import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import type { JSX } from 'react';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

// Icon components to replace emojis
const Icons = {
  Dashboard: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  Workers: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>,
  Supervisor: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Chief: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Client: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Manpower: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  Driver: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  AddUser: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>,
  Vehicle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Zone: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.447-.894L15 4m0 13V4m0 0L9 7" /></svg>,
  Profile: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Reports: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  Payments: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>,
  Folder: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
  ChevronDown: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
  ChevronRight: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
  Logout: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
};

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  function handleLogout() {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {}
    window.dispatchEvent(new Event('auth-changed'));
    window.location.href = '/login';
  }

  const menuItems: { name: string; icon: JSX.Element; to: string }[] = [
    { name: 'Dashboard', icon: <Icons.Dashboard />, to: '/' },
    { name: 'Manage Workers', icon: <Icons.Workers />, to: '/manage-workers' },
    { name: 'Supervisor Dashboard', icon: <Icons.Supervisor />, to: '/supervisor' },
    { name: 'Services Supervision', icon: <Icons.Supervisor />, to: '/supervisor/services' },
    { name: 'Chief Dashboard', icon: <Icons.Chief />, to: '/chief-dashboard' },
    { name: 'Day of Service Plan', icon: <Icons.Folder />, to: '/chief-service-plan' },
    { name: 'Client Dashboard', icon: <Icons.Client />, to: '/client-dashboard' },
    { name: 'Manpower Dashboard', icon: <Icons.Manpower />, to: '/manpower-dashboard' },
    { name: 'Driver Dashboard', icon: <Icons.Driver />, to: '/driver-dashboard' },
    { name: 'Register Client', icon: <Icons.AddUser />, to: '/register-client' },
    { name: 'Register Driver', icon: <Icons.Driver />, to: '/register-driver' },
    { name: 'Register Vehicle', icon: <Icons.Vehicle />, to: '/register-vehicle' },
    { name: 'Register Manpower', icon: <Icons.Manpower />, to: '/register-manpower' },
    { name: 'Add New Zone', icon: <Icons.Zone />, to: '/add-zone' },
    { name: 'Register Supervisor', icon: <Icons.Supervisor />, to: '/register-supervisor' },
    { name: 'Register Chief of Zone', icon: <Icons.Chief />, to: '/register-chief' },
    { name: 'My Profile', icon: <Icons.Profile />, to: '/profile' },
    { name: 'Reports', icon: <Icons.Reports />, to: '/reports' },
    { name: 'Payments', icon: <Icons.Payments />, to: '/payments' },
  ];

  const storedUser = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
  let userRole: string | null = null;
  try {
    userRole = storedUser ? (JSON.parse(storedUser)?.role ?? null) : null;
  } catch {}

  const roleAllowed: Record<string, Set<string>> = {
    manager: new Set([
      '/',
      '/manage-workers',
      '/register-supervisor',
      '/register-driver',
      '/register-vehicle',
      '/register-chief',
      '/add-zone',
      '/profile',
      '/reports',
      '/register-manpower',
      '/register-client',
      '/payments',
    ]),
    supervisor: new Set([
      '/supervisor',
      '/supervisor/services',
      '/register-client',
      '/profile',
      '/reports',
      '/payments',
    ]),
    client: new Set([
      '/client-dashboard',
      '/profile',
      '/reports',
      '/payments',
    ]),
    chief: new Set([
      '/chief-dashboard',
      '/chief-service-plan',
      '/profile',
      '/reports',
      '/payments',
    ]),
    manpower: new Set([
      '/manpower-dashboard',
      '/profile',
      '/reports',
    ]),
    driver: new Set([
      '/driver-dashboard',
      '/profile',
      '/reports',
    ]),
  };

  const allowed = userRole && roleAllowed[userRole] ? roleAllowed[userRole] : null;
  const visibleItems = allowed ? menuItems.filter(item => allowed.has(item.to)) : menuItems;

  // Register routes to group under a dropdown
  const registerPaths = new Set([
    '/register-client',
    '/register-driver',
    '/register-vehicle',
    '/register-manpower',
    '/register-supervisor',
    '/register-chief',
    '/add-zone',
  ]);
  const registerItems = visibleItems.filter(i => registerPaths.has(i.to));
  const otherItems = visibleItems.filter(i => !registerPaths.has(i.to));
  const [regOpen, setRegOpen] = useState(false);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 z-20 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-72 bg-gradient-to-b from-slate-900 to-slate-800 text-white transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 transition-all duration-300 ease-in-out
        flex flex-col shadow-2xl border-r border-slate-700
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="font-bold text-white text-sm">UCS</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                UCS Company
              </span>
              <span className="text-xs text-slate-400">Management System</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {otherItems.map((item, index) => (
            <NavLink
              to={item.to}
              key={index}
              className={({ isActive }) =>
                `group flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 font-medium ${
                  isActive 
                    ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400 shadow-lg' 
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white hover:translate-x-1'
                }`
              }
              onClick={onClose}
            >
              <div className={`transition-colors duration-200 ${
                ({ isActive }: { isActive: boolean }) => isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'
              }`}>
                {item.icon}
              </div>
              <span className="font-medium tracking-wide">{item.name}</span>
            </NavLink>
          ))}

          {registerItems.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setRegOpen(v => !v)}
                className="w-full group flex items-center justify-between p-3 rounded-xl text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all duration-200"
              >
                <span className="flex items-center space-x-3">
                  <div className="text-slate-400 group-hover:text-white transition-colors duration-200">
                    <Icons.Folder />
                  </div>
                  <span className="font-medium tracking-wide">Manage Registrations</span>
                </span>
                <span className="text-slate-400 group-hover:text-white transition-transform duration-200">
                  {regOpen ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                </span>
              </button>
              {regOpen && (
                <div className="mt-1 ml-4 space-y-1 border-l border-slate-700 pl-2">
                  {registerItems.map((item, index) => (
                    <NavLink
                      to={item.to}
                      key={`reg-${index}`}
                      className={({ isActive }) =>
                        `group flex items-center space-x-3 p-2 rounded-lg transition-all duration-200 ${
                          isActive 
                            ? 'bg-blue-600/20 text-blue-400 shadow-md' 
                            : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
                        }`
                      }
                      onClick={onClose}
                    >
                      <div className={`transition-colors duration-200 ${
                        ({ isActive }: { isActive: boolean }) => isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-white'
                      }`}>
                        {item.icon}
                      </div>
                      <span className="text-sm font-medium">{item.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/30">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-800/30">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="font-semibold text-white text-sm">AD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Admin User</p>
              <p className="text-xs text-slate-400 truncate">admin@ucs.com</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full group flex items-center justify-center space-x-2 bg-slate-800/50 hover:bg-red-600/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/30 text-sm font-medium py-2.5 px-3 rounded-xl transition-all duration-200"
          >
            <Icons.Logout />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;