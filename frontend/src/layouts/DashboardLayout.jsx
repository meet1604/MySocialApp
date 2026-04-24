import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PlusSquare, Clock, Link2, LogOut, Zap, Send, Menu, X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const nav = [
  { to: '/dashboard',        icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/create',           icon: PlusSquare,      label: 'Create Post'     },
  { to: '/scheduled',        icon: Clock,           label: 'Scheduled Posts' },
  { to: '/connect-accounts', icon: Link2,           label: 'Connect Accounts'},
];

const SidebarContent = ({ user, onLogout, onNavClick }) => (
  <div className="flex h-full flex-col">
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
          onClick={onNavClick}
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

    {/* Telegram Bot CTA */}
    <div className="px-3 pb-2">
      <a
        href="https://t.me/Meet_social_bot"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-[#229ED9] text-white hover:bg-[#1a8bbf] transition-colors"
      >
        <Send className="h-4 w-4 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">Use Telegram Bot</p>
          <p className="text-[10px] opacity-80">@Meet_social_bot</p>
        </div>
      </a>
    </div>

    {/* User + Logout */}
    <div className="border-t border-gray-100 p-3">
      <div className="flex items-center gap-3 rounded-lg px-3 py-2">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-semibold uppercase">
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
        onClick={onLogout}
        className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </div>
  </div>
);

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col border-r border-gray-100 bg-white">
        <SidebarContent user={user} onLogout={handleLogout} onNavClick={() => {}} />
      </aside>

      {/* ── Mobile Drawer Overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute right-3 top-4">
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent
          user={user}
          onLogout={handleLogout}
          onNavClick={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">PostApp</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
