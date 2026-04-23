import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PlusSquare, Clock, Link2, LogOut, Zap,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const nav = [
  { to: '/dashboard',        icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/create',           icon: PlusSquare,      label: 'Create Post'     },
  { to: '/scheduled',        icon: Clock,           label: 'Scheduled Posts' },
  { to: '/connect-accounts', icon: Link2,           label: 'Connect Accounts'},
];

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar ── */}
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-gray-100 bg-white">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">PostApp</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-semibold uppercase">
              {user?.name?.[0] || user?.email?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium text-gray-900">
                {user?.name || 'User'}
              </p>
              <p className="truncate text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
