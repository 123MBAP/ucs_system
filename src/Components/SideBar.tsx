import { NavLink } from 'react-router-dom';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
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
  const menuItems: { name: string; icon: string; to: string }[] = [
    { name: 'Dashboard', icon: '📊', to: '/' },
    { name: 'Supervisor Dashboard', icon: '🧭', to: '/supervisor' },
    { name: 'Chief Dashboard', icon: '🏷️', to: '/chief-dashboard' },
    { name: 'Client Dashboard', icon: '🧑', to: '/client-dashboard' },
    { name: 'Manpower Dashboard', icon: '🧱', to: '/manpower-dashboard' },
    { name: 'Driver Dashboard', icon: '🚘', to: '/driver-dashboard' },
    { name: 'Register Client', icon: '➕🧑', to: '/register-client' },
    { name: 'Register Driver', icon: '👨‍💼', to: '/register-driver' },
    { name: 'Register Vehicle', icon: '🚗', to: '/register-vehicle' },
    { name: 'Register Manpower', icon: '🧱', to: '/register-manpower' },
    { name: 'Add New Zone', icon: '🗺️', to: '/add-zone' },
    { name: 'Register Supervisor', icon: '👨‍💼', to: '/register-supervisor' },
    { name: 'Register Chief of Zone', icon: '👨‍💼', to: '/register-chief' },
    { name: 'My Profile', icon: '👤', to: '/profile' },
    { name: 'Reports', icon: '📈', to: '/reports' },
    { name: 'Payments', icon: '💳', to: '/payments' },
  ];

  const storedUser = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
  let userRole: string | null = null;
  try {
    userRole = storedUser ? (JSON.parse(storedUser)?.role ?? null) : null;
  } catch {}

  const roleAllowed: Record<string, Set<string>> = {
    // manager: register supervisor, register vehicle, dashboard, register chief of the zone,
    // add new zone, profile, reports, register manpower, register client, payments
    manager: new Set([
      '/',
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
    // supervisor: supervisor dashboard, register client, profile, reports
    supervisor: new Set([
      '/supervisor',
      '/register-client',
      '/profile',
      '/reports',
      '/payments',
    ]),
    // client: client dashboard, profile, reports
    client: new Set([
      '/client-dashboard',
      '/profile',
      '/reports',
      '/payments',
    ]),
    // chief: chief dashboard, profile, reports
    chief: new Set([
      '/chief-dashboard',
      '/profile',
      '/reports',
      '/payments',
    ]),
    // manpower: manpower dashboard, profile, reports
    manpower: new Set([
      '/manpower-dashboard',
      '/profile',
      '/reports',
    ]),
    // driver: driver dashboard, profile, reports
    driver: new Set([
      '/driver-dashboard',
      '/profile',
      '/reports',
    ]),
  };

  const allowed = userRole && roleAllowed[userRole] ? roleAllowed[userRole] : null;
  const visibleItems = allowed
    ? menuItems.filter(item => allowed.has(item.to))
    : menuItems;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-gray-900 text-white transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 transition duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">UCS</span>
            </div>
            <span className="text-xl font-bold">UCS Company</span>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {visibleItems.map((item, index) => (
            <NavLink
              to={item.to}
              key={index}
              className={({ isActive }) =>
                `w-full flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200 ${
                  isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'
                }`
              }
              onClick={onClose}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="font-semibold">AD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Admin User</p>
              <p className="text-xs text-gray-400 truncate">admin@ucs.com</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded-lg"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;