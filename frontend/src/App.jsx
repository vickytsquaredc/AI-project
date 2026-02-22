import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import { Spinner } from './components/ui';

// Public pages
import LoginPage from './pages/public/LoginPage';
import PublicCatalog from './pages/public/PublicCatalog';
import PublicBookDetail from './pages/public/PublicBookDetail';

// Admin/Librarian pages
import Dashboard from './pages/admin/Dashboard';
import BooksAdmin from './pages/admin/BooksAdmin';
import MembersAdmin from './pages/admin/MembersAdmin';
import MemberDetail from './pages/admin/MemberDetail';
import CirculationDesk from './pages/admin/CirculationDesk';
import ReservationsAdmin from './pages/admin/ReservationsAdmin';
import FinesAdmin from './pages/admin/FinesAdmin';
import ReportsPage from './pages/admin/ReportsPage';
import SettingsPage from './pages/admin/SettingsPage';

// Patron pages
import MyLoans from './pages/patron/MyLoans';
import MyReservations from './pages/patron/MyReservations';
import MyFines from './pages/patron/MyFines';
import AccountPage from './pages/patron/AccountPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Route guard
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

const LibrarianRoute = ({ children }) => (
  <ProtectedRoute roles={['librarian', 'admin']}>{children}</ProtectedRoute>
);
const AdminRoute = ({ children }) => (
  <ProtectedRoute roles={['admin']}>{children}</ProtectedRoute>
);
const AuthenticatedRoute = ({ children }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

// Redirect authenticated users to their home
const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner size="lg" className="mt-20" />;
  if (!user) return <Navigate to="/catalog" replace />;
  if (user.role === 'admin' || user.role === 'librarian') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/catalog" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: '14px' },
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/catalog" element={<PublicCatalog />} />
          <Route path="/catalog/book/:id" element={<PublicBookDetail />} />

          {/* Admin/Librarian routes */}
          <Route path="/admin/dashboard" element={<LibrarianRoute><Dashboard /></LibrarianRoute>} />
          <Route path="/admin/books" element={<LibrarianRoute><BooksAdmin /></LibrarianRoute>} />
          <Route path="/admin/members" element={<LibrarianRoute><MembersAdmin /></LibrarianRoute>} />
          <Route path="/admin/members/:id" element={<LibrarianRoute><MemberDetail /></LibrarianRoute>} />
          <Route path="/admin/circulation" element={<LibrarianRoute><CirculationDesk /></LibrarianRoute>} />
          <Route path="/admin/reservations" element={<LibrarianRoute><ReservationsAdmin /></LibrarianRoute>} />
          <Route path="/admin/fines" element={<LibrarianRoute><FinesAdmin /></LibrarianRoute>} />
          <Route path="/admin/reports" element={<LibrarianRoute><ReportsPage /></LibrarianRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />

          {/* Patron routes */}
          <Route path="/my-loans" element={<AuthenticatedRoute><MyLoans /></AuthenticatedRoute>} />
          <Route path="/my-reservations" element={<AuthenticatedRoute><MyReservations /></AuthenticatedRoute>} />
          <Route path="/my-fines" element={<AuthenticatedRoute><MyFines /></AuthenticatedRoute>} />
          <Route path="/account" element={<AuthenticatedRoute><AccountPage /></AuthenticatedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
