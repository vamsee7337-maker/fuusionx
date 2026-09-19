import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
    { to: '/admin/officers', label: 'Officers', icon: '👤' },
    { to: '/admin/cases', label: 'Cases', icon: '📁' },
    { to: '/admin/audit', label: 'Audit Log', icon: '📋' },
  ];

  const officerLinks = [
    { to: '/officer', label: 'Dashboard', icon: '📊', end: true },
    { to: '/officer/cases', label: 'My Cases', icon: '📁' },
  ];

  const links = isAdmin ? adminLinks : officerLinks;

  return (
    <div className="flex h-screen bg-dark-950">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-900 border-r border-dark-700/50 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-dark-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-lg">
              D
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight">DigiProtect</h1>
              <p className="text-dark-400 text-xs">Evidence Management</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-dark-500 text-xs font-semibold uppercase tracking-wider mb-3 px-4">
            {isAdmin ? 'Administration' : 'Legal Officer'}
          </p>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-dark-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-600/30 flex items-center justify-center text-primary-400 text-sm font-semibold">
              {user?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-dark-400 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left sidebar-link text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
