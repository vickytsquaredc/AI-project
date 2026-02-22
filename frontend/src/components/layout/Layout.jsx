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

const Icon = ({ name }) => {
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
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[name] || ''} />
    </svg>
  );
};

export { Icon };

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
  const roleBadgeColors = {
    admin: 'bg-red-100 text-red-800',
    librarian: 'bg-blue-100 text-blue-800',
    staff: 'bg-green-100 text-green-800',
    student: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-64 bg-blue-900 text-white
        transform transition-transform duration-200 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-blue-800 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">School Library</h1>
            <p className="text-xs text-blue-300">Management System</p>
          </div>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <Icon name="x" />
          </button>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-blue-800">
          <p className="font-semibold text-sm">{user?.firstName} {user?.lastName}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${roleBadgeColors[user?.role] || ''}`}>
            {user?.role}
          </span>
          {user?.totalUnpaidFines > 0 && (
            <p className="text-xs text-red-300 mt-1">
              Outstanding: ${user.totalUnpaidFines.toFixed(2)}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    location.pathname.startsWith(item.to)
                      ? 'bg-blue-700 text-white'
                      : 'text-blue-100 hover:bg-blue-800'
                  }`}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            ))}
            {/* Public catalog link for librarians */}
            {isLibrarian && (
              <li className="pt-2 border-t border-blue-800">
                <Link
                  to="/catalog"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blue-100 hover:bg-blue-800"
                >
                  <Icon name="search" />
                  Public Catalog
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-blue-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blue-100 hover:bg-blue-800 w-full"
          >
            <Icon name="log-out" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
          <button
            className="md:hidden p-1 rounded hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <div className="flex-1" />
          {/* Public OPAC link */}
          <Link
            to="/catalog"
            className="text-sm text-blue-600 hover:text-blue-800 hidden sm:block"
          >
            Public Catalog
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
