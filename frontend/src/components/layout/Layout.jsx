import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = {
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'grid' },
    { to: '/admin/books', label: 'Catalog', icon: 'book' },
    { to: '/admin/members', label: 'Members', icon: 'users' },
    { to: '/admin/circulation', label: 'Circulation', icon: 'repeat' },
    { to: '/admin/reservations', label: 'Reservations', icon: 'bookmark' },
    { to: '/admin/fines', label: 'Fines', icon: 'dollar-sign' },
    { to: '/admin/reports', label: 'Reports', icon: 'bar-chart' },
    { to: '/admin/settings', label: 'Settings', icon: 'settings' },
  ],
  librarian: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'grid' },
    { to: '/admin/books', label: 'Catalog', icon: 'book' },
    { to: '/admin/members', label: 'Members', icon: 'users' },
    { to: '/admin/circulation', label: 'Circulation', icon: 'repeat' },
    { to: '/admin/reservations', label: 'Reservations', icon: 'bookmark' },
    { to: '/admin/fines', label: 'Fines', icon: 'dollar-sign' },
    { to: '/admin/reports', label: 'Reports', icon: 'bar-chart' },
  ],
  student: [
    { to: '/catalog', label: 'Search Books', icon: 'search' },
    { to: '/my-loans', label: 'My Loans', icon: 'book-open' },
    { to: '/my-reservations', label: 'My Holds', icon: 'bookmark' },
    { to: '/my-fines', label: 'My Fines', icon: 'dollar-sign' },
    { to: '/account', label: 'My Account', icon: 'user' },
  ],
  staff: [
    { to: '/catalog', label: 'Search Books', icon: 'search' },
    { to: '/my-loans', label: 'My Loans', icon: 'book-open' },
    { to: '/my-reservations', label: 'My Holds', icon: 'bookmark' },
    { to: '/my-fines', label: 'My Fines', icon: 'dollar-sign' },
    { to: '/account', label: 'My Account', icon: 'user' },
  ],
};

const Icon = ({ name, size = 18 }) => {
  const icons = {
    grid: 'M3 3h7v7H3zM13 3h7v7h-7zM3 13h7v7H3zM13 13h7v7h-7z',
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 4v6m3-3h-6',
    repeat: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
    bookmark: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
    'dollar-sign': 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    'bar-chart': 'M18 20V10M12 20V4M6 20v-6',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    search: 'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
    'book-open': 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    menu: 'M3 12h18M3 6h18M3 18h18',
    x: 'M18 6L6 18M6 6l12 12',
    bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[name] || ''} />
    </svg>
  );
};

export { Icon };

const pageTitles = {
  '/admin/dashboard': 'Dashboard',
  '/admin/books': 'Book Catalog',
  '/admin/members': 'Members',
  '/admin/circulation': 'Circulation Desk',
  '/admin/reservations': 'Reservations',
  '/admin/fines': 'Fines',
  '/admin/reports': 'Reports',
  '/admin/settings': 'Settings',
  '/catalog': 'Book Catalog',
  '/my-loans': 'My Loans',
  '/my-reservations': 'My Holds',
  '/my-fines': 'My Fines',
  '/account': 'My Account',
};

const roleConfig = {
  admin: { label: 'Administrator', color: 'from-red-500 to-pink-500' },
  librarian: { label: 'Librarian', color: 'from-blue-500 to-indigo-500' },
  staff: { label: 'Staff', color: 'from-emerald-500 to-teal-500' },
  student: { label: 'Student', color: 'from-amber-500 to-orange-500' },
};

const Layout = ({ children }) => {
  const { user, logout, isLibrarian } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const items = navItems[user?.role] || navItems.student;
  const role = roleConfig[user?.role] || { label: user?.role, color: 'from-gray-500 to-gray-600' };
  const pageTitle = pageTitles[location.pathname] || 'Library';
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || '?';

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-64 flex flex-col
        bg-gradient-to-b from-slate-900 to-slate-800
        transform transition-transform duration-300 ease-in-out shadow-2xl
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Icon name="book" size={16} />
              </div>
              <div>
                <h1 className="text-white font-bold text-sm leading-tight">School Library</h1>
                <p className="text-slate-400 text-xs">Management System</p>
              </div>
            </div>
            <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <Icon name="x" />
            </button>
          </div>
        </div>

        {/* User profile */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${role.color} flex items-center justify-center text-white text-sm font-bold shadow-lg shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <span className="text-slate-400 text-xs">{role.label}</span>
            </div>
          </div>
          {user?.totalUnpaidFines > 0 && (
            <div className="mt-2 px-3 py-1.5 bg-red-500/20 rounded-lg border border-red-500/30">
              <p className="text-red-300 text-xs font-medium">
                Outstanding: ${parseFloat(user.totalUnpaidFines).toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
            Navigation
          </p>
          <ul className="space-y-0.5">
            {items.map((item) => {
              const isActive = location.pathname === item.to ||
                (item.to !== '/catalog' && location.pathname.startsWith(item.to));
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>
                      <Icon name={item.icon} />
                    </span>
                    {item.label}
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
                    )}
                  </Link>
                </li>
              );
            })}
            {isLibrarian && (
              <li className="pt-3 mt-2 border-t border-slate-700/50">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
                  Public
                </p>
                <Link
                  to="/catalog"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all"
                >
                  <Icon name="search" />
                  Public Catalog
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 w-full transition-all"
          >
            <Icon name="log-out" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-5 py-3.5 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Icon name="menu" />
          </button>

          <div className="flex-1">
            <h2 className="text-slate-800 font-semibold text-base">{pageTitle}</h2>
          </div>

          <Link
            to="/catalog"
            className="hidden sm:flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Icon name="search" size={14} />
            Public Catalog
          </Link>

          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${role.color} flex items-center justify-center text-white text-xs font-bold shadow`}>
            {initials}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
