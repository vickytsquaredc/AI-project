import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../services/api';
import { Card, StatCard, Spinner, Badge } from '../../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

const BookIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
  </svg>
);
const UsersIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 4v6m3-3h-6" />
  </svg>
);
const RepeatIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);
const DollarIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => reportsApi.dashboard().then(r => r.data),
    refetchInterval: 60000,
  });

  if (isLoading) return <Spinner size="lg" className="py-20" />;
  if (!stats) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">
            Library overview · {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Link to="/admin/circulation">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Go to Circulation Desk →
          </button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Books"
          value={stats.books.total.toLocaleString()}
          sub={`${stats.copies.available} copies available`}
          color="blue"
          icon={<BookIcon />}
        />
        <StatCard
          label="Active Members"
          value={parseInt(stats.members.active).toLocaleString()}
          sub={`${stats.members.students} students · ${stats.members.staff} staff`}
          color="green"
          icon={<UsersIcon />}
        />
        <StatCard
          label="Active Loans"
          value={parseInt(stats.loans.active).toLocaleString()}
          sub={`${stats.loans.overdue} overdue`}
          color={stats.loans.overdue > 0 ? 'red' : 'blue'}
          icon={<RepeatIcon />}
        />
        <StatCard
          label="Unpaid Fines"
          value={`$${stats.fines.unpaidTotal.toFixed(2)}`}
          sub={`${stats.reservations.pending} holds pending`}
          color={stats.fines.unpaidTotal > 0 ? 'red' : 'green'}
          icon={<DollarIcon />}
        />
      </div>

      {/* Copy Status + Weekly Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <h3 className="font-semibold text-gray-700 mb-4">Copy Status</h3>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Available', value: parseInt(stats.copies.available), color: 'bg-green-400' },
              { label: 'Checked Out', value: parseInt(stats.copies.checked_out), color: 'bg-blue-400' },
              { label: 'Reserved', value: parseInt(stats.copies.reserved), color: 'bg-yellow-400' },
              { label: 'Lost/Damaged', value: parseInt(stats.copies.unavailable), color: 'bg-red-400' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-gray-600">{item.label}</span>
                </div>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 flex items-center justify-between font-semibold">
              <span>Total Copies</span>
              <span>{parseInt(stats.copies.total)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-700 mb-4">Quick Stats</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Checkouts (7 days)</span>
              <span className="font-semibold">{stats.recentActivity.checkoutsLast7Days}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Holds Pending</span>
              <span className="font-semibold">{stats.reservations.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Overdue Items</span>
              <span className={`font-semibold ${stats.loans.overdue > 0 ? 'text-red-600' : ''}`}>
                {stats.loans.overdue}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Collected This Month</span>
              <span className="font-semibold text-green-600">
                ${stats.fines.collectedThisMonth.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Students</span>
              <span className="font-semibold">{stats.members.students}</span>
            </div>
          </div>
        </Card>

        {/* Genres Pie */}
        <Card>
          <h3 className="font-semibold text-gray-700 mb-4">Loans by Genre</h3>
          {stats.popularGenres.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={stats.popularGenres}
                  dataKey="loan_count"
                  nameKey="genre"
                  cx="50%" cy="50%"
                  outerRadius={70}
                >
                  {stats.popularGenres.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
          )}
        </Card>
      </div>

      {/* Checkout Trend */}
      {stats.checkoutTrend.length > 0 && (
        <Card className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">Monthly Checkout Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.checkoutTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="checkouts" stroke="#3b82f6"
                strokeWidth={2} dot={{ fill: '#3b82f6' }} name="Checkouts" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Popular Books */}
      {stats.popularBooks.length > 0 && (
        <Card>
          <h3 className="font-semibold text-gray-700 mb-4">Most Popular Books (Last 90 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.popularBooks} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="title" width={180}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.length > 25 ? v.slice(0, 25) + '…' : v}
              />
              <Tooltip formatter={(v) => [v, 'Checkouts']} />
              <Bar dataKey="loan_count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
