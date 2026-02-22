import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    if (user.role === 'admin' || user.role === 'librarian') {
      navigate('/admin/dashboard');
    } else {
      navigate('/catalog');
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter your username and password');
      return;
    }
    setLoading(true);
    try {
      const loggedInUser = await login(username, password);
      toast.success(`Welcome back, ${loggedInUser.firstName}!`);
      if (loggedInUser.role === 'admin' || loggedInUser.role === 'librarian') {
        navigate('/admin/dashboard');
      } else {
        navigate('/catalog');
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex flex-col">
      {/* Header */}
      <div className="p-6">
        <Link to="/catalog" className="text-white text-sm hover:underline flex items-center gap-1">
          <span>←</span> Browse Catalog
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo / Title */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">📚</div>
            <h1 className="text-3xl font-bold text-white">School Library</h1>
            <p className="text-blue-200 mt-2">Sign in to access your account</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Username or Email"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={loading}
              >
                Sign In
              </Button>
            </form>

            {/* Test credentials hint */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 mb-2">Demo Accounts:</p>
              <div className="space-y-1 text-xs text-gray-600">
                <p>Admin: <code className="bg-gray-200 px-1 rounded">admin</code> / <code className="bg-gray-200 px-1 rounded">admin123</code></p>
                <p>Librarian: <code className="bg-gray-200 px-1 rounded">librarian1</code> / <code className="bg-gray-200 px-1 rounded">librarian123</code></p>
                <p>Student: <code className="bg-gray-200 px-1 rounded">student1</code> / <code className="bg-gray-200 px-1 rounded">password123</code></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
