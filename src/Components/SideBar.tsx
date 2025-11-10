import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useI18n } from 'src/lib/i18n';
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
  Chat: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2.5 4.75A2.75 2.75 0 015.25 2h9.5A2.75 2.75 0 0117.5 4.75v6.5A2.75 2.75 0 0114.75 14h-6.8l-3.2 2.4a.75.75 0 01-1.2-.6V4.75z" />
      <path d="M8.5 16.5h5.75l3.2 2.4a.75.75 0 001.2-.6v-6.5A2.75 2.75 0 0015.9 9H15v2.25A2.75 2.75 0 0112.25 14H9v.75a1.75 1.75 0 001.75 1.75z" opacity=".3" />
    </svg>
  ),
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

  const { t } = useI18n();
  const menuItems: { name: string; icon: JSX.Element; to: string }[] = [
    { name: t('sidebar.dashboard'), icon: <Icons.Dashboard />, to: '/' },
    { name: t('sidebar.manageWorkers'), icon: <Icons.Workers />, to: '/manage-workers' },
    { name: t('sidebar.workers'), icon: <Icons.Workers />, to: '/workers' },
    { name: t('sidebar.supervisorDashboard'), icon: <Icons.Supervisor />, to: '/supervisor-dashboard' },
    { name: t('sidebar.servicesSupervision'), icon: <Icons.Supervisor />, to: '/supervisor/services' },
    { name: t('sidebar.chiefDashboard'), icon: <Icons.Chief />, to: '/chief-dashboard' },
    { name: t('sidebar.clients'), icon: <Icons.Client />, to: '/clients' },
    { name: t('sidebar.dayOfServicePlan'), icon: <Icons.Folder />, to: '/chief-service-plan' },
    { name: t('sidebar.clientDashboard'), icon: <Icons.Client />, to: '/client-dashboard' },
    { name: t('sidebar.manpowerDashboard'), icon: <Icons.Manpower />, to: '/manpower-dashboard' },
    { name: t('sidebar.driverDashboard'), icon: <Icons.Driver />, to: '/driver-dashboard' },
    { name: t('sidebar.registerClient'), icon: <Icons.AddUser />, to: '/register-client' },
    { name: t('sidebar.registerDriver'), icon: <Icons.Driver />, to: '/register-driver' },
    { name: t('sidebar.registerVehicle'), icon: <Icons.Vehicle />, to: '/register-vehicle' },
    { name: t('sidebar.registerManpower'), icon: <Icons.Manpower />, to: '/register-manpower' },
    { name: t('sidebar.addNewZone'), icon: <Icons.Zone />, to: '/add-zone' },
    { name: t('sidebar.registerSupervisor'), icon: <Icons.Supervisor />, to: '/register-supervisor' },
    { name: t('sidebar.registerChiefOfZone'), icon: <Icons.Chief />, to: '/register-chief' },
    { name: t('sidebar.myProfile'), icon: <Icons.Profile />, to: '/profile' },
    { name: t('sidebar.reports'), icon: <Icons.Reports />, to: '/reports' },
    { name: t('sidebar.payments'), icon: <Icons.Payments />, to: '/payments' },
    { name: t('sidebar.chat'), icon: <Icons.Chat />, to: '/chat' },
    { name: t('sidebar.superuser'), icon: <Icons.Dashboard />, to: '/superuser' },
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
      '/workers',
      '/register-supervisor',
      '/register-driver',
      '/register-vehicle',
      '/register-chief',
      '/add-zone',
      '/profile',
      '/reports',
      '/register-manpower',
      '/register-client',
      '/clients',
      '/payments',
      '/chat',
    ]),
    supervisor: new Set([
      '/supervisor-dashboard',
      '/supervisor/services',
      '/register-client',
      '/profile',
      '/reports',
      '/clients',
      '/payments',
      '/chat',
    ]),
    client: new Set([
      '/client-dashboard',
      '/profile',
      '/reports',
      '/payments',
      '/chat',
    ]),
    chief: new Set([
      '/chief-dashboard',
      '/chief-service-plan',
      '/profile',
      '/reports',
      '/clients',
      '/payments',
      '/chat',
    ]),
    manpower: new Set([
      '/manpower-dashboard',
      '/profile',
      '/chat',
    ]),
    driver: new Set([
      '/driver-dashboard',
      '/profile',
      '/chat',
    ]),
    superuser: new Set([
      '/superuser',
      '/profile',
    ]),
  };

  const allowed = userRole && roleAllowed[userRole] ? roleAllowed[userRole] : null;
  const isSupervisor = userRole === 'supervisor';
  const widthClass = isSupervisor ? 'w-72' : 'w-64';
  const widthValue = isSupervisor ? '18rem' : '16rem';

  useEffect(() => {
    try {
      document.documentElement.style.setProperty('--sidebar-w', widthValue);
    } catch {}
  }, [widthValue]);
  const visibleItems = allowed ? menuItems.filter(item => allowed.has(item.to)) : menuItems;

  // Chat unread count
  const API_BASE = (import.meta as any).env?.VITE_API_URL as string;
  const [unread, setUnread] = useState(0);
  function getUserId(): number | null {
    try {
      const u = localStorage.getItem('user');
      return u ? (JSON.parse(u)?.id ?? null) : null;
    } catch { return null; }
  }
  async function computeUnread() {
    try {
      const token = localStorage.getItem('token');
      if (!API_BASE || !token) { setUnread(0); return; }
      const role = userRole;
      const groups: Array<'general' | 'workers'> = role === 'client' ? ['general'] : ['general','workers'];

      // Compute from lists using local last_read timestamps
      const me = getUserId();
      let total = 0;
      for (const g of groups) {
        const lastReadRaw = localStorage.getItem(`chat_last_read_${g}`);
        const lastRead = lastReadRaw ? new Date(lastReadRaw).getTime() : 0;
        const res = await fetch(`${API_BASE}/api/chat/messages?group=${encodeURIComponent(g)}&limit=100`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        const list: any[] = Array.isArray(data?.messages) ? data.messages : [];
        const count = list.reduce((acc, m) => {
          const ts = new Date(m?.created_at || 0).getTime();
          const fromMe = me != null && Number(m?.user_id) === Number(me);
          return acc + ((ts > lastRead && !fromMe) ? 1 : 0);
        }, 0);
        total += count;
      }
      setUnread(total);
    } catch {
      setUnread(0);
    }
  }
  useEffect(() => {
    computeUnread();
    const id = setInterval(computeUnread, 30000);
    const onRead = () => computeUnread();
    window.addEventListener('chat-read', onRead);
    window.addEventListener('storage', onRead);
    // Subscribe to SSE for realtime updates (best effort)
    let es: EventSource | null = null;
    try {
      const token = localStorage.getItem('token');
      if (API_BASE && token) {
        es = new EventSource(`${API_BASE}/api/chat/stream?token=${encodeURIComponent(token)}`);
        es.onmessage = () => computeUnread();
      }
    } catch {}
    return () => {
      clearInterval(id);
      window.removeEventListener('chat-read', onRead);
      window.removeEventListener('storage', onRead);
      try { es && es.close(); } catch {}
    };
  }, []);

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
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      
      <div className={`
        fixed inset-y-0 left-0 z-30 lg:fixed lg:inset-y-0 lg:left-0 lg:h-screen
        ${widthClass} bg-gradient-to-b from-neutral-900 to-neutral-800 text-gray-200 transform lg:transform-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 transition-all duration-300 ease-in-out
        flex flex-col shadow-2xl border-r border-neutral-700
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-700 bg-neutral-900/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-600 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="font-bold text-white text-sm">UCS</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
                {t('sidebar.companyName')}
              </span>
              <span className="text-xs text-gray-400">{t('sidebar.managementSystem')}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-neutral-800 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-sm">
          {otherItems.map((item, index) => (
            <NavLink
              to={item.to}
              key={index}
              className={({ isActive }) =>
                `group flex items-center space-x-3 p-2.5 rounded-xl transition-all duration-200 font-medium ${
                  isActive 
                    ? 'bg-amber-500/10 text-amber-400 border-r-2 border-amber-400 shadow-lg' 
                    : 'text-gray-300 hover:bg-neutral-800/50 hover:text-white hover:translate-x-1'
                }`
              }
              onClick={onClose}
            >
              <div className="text-gray-400 group-hover:text-amber-400 transition-colors duration-200">
                {item.icon}
              </div>
              <span className="font-medium tracking-wide flex-1">{item.name}</span>
              {item.to === '/chat' && unread > 0 && (
                <span className="ml-auto text-xs bg-red-500 text-white rounded-full px-2 py-0.5 shadow">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </NavLink>
          ))}

          {registerItems.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setRegOpen(v => !v)}
                className="w-full group flex items-center justify-between p-2.5 rounded-xl text-gray-300 hover:bg-neutral-800/50 hover:text-white transition-all duration-200"
              >
                <span className="flex items-center space-x-3">
                  <div className="text-gray-400 group-hover:text-amber-400 transition-colors duration-200">
                    <Icons.Folder />
                  </div>
                  <span className="font-medium tracking-wide">{t('sidebar.manageRegistrations')}</span>
                </span>
                <span className="text-gray-400 group-hover:text-amber-400 transition-transform duration-200">
                  {regOpen ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                </span>
              </button>
              {regOpen && (
                <div className="mt-1 ml-4 space-y-1 border-l border-neutral-700 pl-2 text-[13px]">
                  {registerItems.map((item, index) => (
                    <NavLink
                      to={item.to}
                      key={`reg-${index}`}
                      className={({ isActive }) =>
                        `group flex items-center space-x-3 p-2 rounded-lg transition-all duration-200 ${
                          isActive 
                            ? 'bg-amber-500/10 text-amber-400 shadow-md' 
                            : 'text-gray-400 hover:bg-neutral-800/30 hover:text-white'
                        }`
                      }
                      onClick={onClose}
                    >
                      <div className="text-gray-500 group-hover:text-amber-400 transition-colors duration-200">
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

        {/* Profile / Logout */}
        <div className="p-3 border-t border-neutral-700 bg-neutral-900/40">
          <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-neutral-800/40">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-600 to-amber-400 rounded-full flex items-center justify-center shadow-lg">
              <span className="font-semibold text-white text-sm">AD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">Admin User</p>
              <p className="text-xs text-gray-400 truncate">admin@ucs.com</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full group flex items-center justify-center space-x-2 bg-neutral-800/50 hover:bg-red-600/20 text-gray-300 hover:text-red-400 border border-neutral-700 hover:border-red-500/30 text-sm font-medium py-2 px-3 rounded-xl transition-all duration-200"
          >
            <Icons.Logout />
            <span>{t('sidebar.logout')}</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;