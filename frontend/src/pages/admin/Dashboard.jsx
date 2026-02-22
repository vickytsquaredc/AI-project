import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../services/api';
import { Spinner } from '../../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

// ---- Stat Card (gradient) ----
const GradientStatCard = ({ label, value, sub, gradient, icon, alert }) => (
  <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${gradient}`}>
    {/* Background decoration */}
    <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
    <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white/10" />

    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
          {icon}
        </div>
        {alert && (
          <span className="text-xs bg-white/25 px-2 py-0.5 rounded-full font-medium">
            {alert}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className="text-sm font-medium text-white/80 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
    </div>
  </div>
);

// ---- Quick stat row item ----
const QuickStat = ({ label, value, valueClass = '' }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span className={`text-sm font-semibold text-slate-800 ${valueClass}`}>{value}</span>
  </div>
);

// ---- Copy status bar ----
const CopyStatusBar = ({ label, value, total, color }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-700">{value} <span className="text-slate-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ---- Custom Tooltip ----
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 shadow-xl rounded-xl px-3 py-2 text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => reportsApi.dashboard().then(r => r.data),
    refetchInterval: 60000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="text-slate-400 text-sm mt-3">Loading dashboard...</p>
      </div>
    </div>
  );
  if (!stats) return null;

  const totalCopies = parseInt(stats.copies.total) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back!</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · Library Overview
          </p>
        </div>
        <Link
          to="/admin/circulation"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all hover:shadow-blue-600/40 hover:-translate-y-0.5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          Circulation Desk
        </Link>
      </div>

      {/* Gradient Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientStatCard
          label="Total Books"
          value={stats.books.total.toLocaleString()}
          sub={`${stats.copies.available} copies available`}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
            </svg>
          }
        />
        <GradientStatCard
          label="Active Members"
          value={parseInt(stats.members.active).toLocaleString()}
          sub={`${stats.members.students} students · ${stats.members.staff} staff`}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 4v6m3-3h-6" />
            </svg>
          }
        />
        <GradientStatCard
          label="Active Loans"
          value={parseInt(stats.loans.active).toLocaleString()}
          sub="Books currently checked out"
          gradient={stats.loans.overdue > 0 ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-gradient-to-br from-violet-500 to-purple-600'}
          alert={stats.loans.overdue > 0 ? `${stats.loans.overdue} overdue` : null}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          }
        />
        <GradientStatCard
          label="Outstanding Fines"
          value={`$${stats.fines.unpaidTotal.toFixed(2)}`}
          sub={`${stats.reservations.pending} holds pending`}
          gradient={stats.fines.unpaidTotal > 0 ? 'bg-gradient-to-br from-rose-500 to-pink-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
      </div>

      {/* Row 2: Copy Status + Quick Stats + Pie */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Copy Status */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Inventory Status</h3>
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
              {parseInt(stats.copies.total)} total
            </span>
          </div>
          <CopyStatusBar label="Available" value={parseInt(stats.copies.available)} total={totalCopies} color="bg-emerald-400" />
          <CopyStatusBar label="Checked Out" value={parseInt(stats.copies.checked_out)} total={totalCopies} color="bg-blue-400" />
          <CopyStatusBar label="Reserved" value={parseInt(stats.copies.reserved)} total={totalCopies} color="bg-amber-400" />
          <CopyStatusBar label="Lost / Damaged" value={parseInt(stats.copies.unavailable)} total={totalCopies} color="bg-red-400" />
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-1">Quick Stats</h3>
          <p className="text-xs text-slate-400 mb-4">Current snapshot</p>
          <QuickStat label="Checkouts (7 days)" value={stats.recentActivity.checkoutsLast7Days} />
          <QuickStat label="Holds Pending" value={stats.reservations.pending} />
          <QuickStat
            label="Overdue Items"
            value={stats.loans.overdue}
            valueClass={stats.loans.overdue > 0 ? 'text-red-600' : ''}
          />
          <QuickStat
            label="Fines Collected (Month)"
            value={`$${stats.fines.collectedThisMonth.toFixed(2)}`}
            valueClass="text-emerald-600"
          />
          <QuickStat label="Total Students" value={stats.members.students} />
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-1">Loans by Genre</h3>
          <p className="text-xs text-slate-400 mb-2">Distribution of checkouts</p>
          {stats.popularGenres.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={stats.popularGenres} dataKey="loan_count" nameKey="genre"
                    cx="50%" cy="50%" outerRadius={65} innerRadius={30}>
                    {stats.popularGenres.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {stats.popularGenres.slice(0, 5).map((g, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-slate-500 truncate max-w-16">{g.genre}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-300 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Checkout Trend */}
      {stats.checkoutTrend.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">Monthly Checkout Trend</h3>
              <p className="text-xs text-slate-400">Borrowing activity over time</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.checkoutTrend}>
              <defs>
                <linearGradient id="checkoutGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="checkouts" stroke="#6366f1" strokeWidth={2.5}
                fill="url(#checkoutGrad)" dot={{ fill: '#6366f1', r: 4 }} name="Checkouts" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Popular Books */}
      {stats.popularBooks.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800">Most Popular Books</h3>
            <p className="text-xs text-slate-400">Last 90 days</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.popularBooks} layout="vertical" margin={{ left: 8 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="title" width={170}
                tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v.length > 22 ? v.slice(0, 22) + '…' : v}
              />
              <Tooltip content={<CustomTooltip />} formatter={(v) => [v, 'Checkouts']} />
              <Bar dataKey="loan_count" fill="url(#barGrad)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
