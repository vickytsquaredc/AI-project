import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../services/api';
import { Card, Badge, Spinner, Button } from '../../components/ui';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';

const ReportsPage = () => {
  const [activeReport, setActiveReport] = useState('overdue');
  const [period, setPeriod] = useState('30');

  const { data: overdueReport, isLoading: overdueLoading } = useQuery({
    queryKey: ['report-overdue'],
    queryFn: () => reportsApi.overdue().then(r => r.data),
    enabled: activeReport === 'overdue',
  });

  const { data: circReport, isLoading: circLoading } = useQuery({
    queryKey: ['report-circulation', period],
    queryFn: () => reportsApi.circulation({ period }).then(r => r.data),
    enabled: activeReport === 'circulation',
  });

  const { data: finesReport, isLoading: finesLoading } = useQuery({
    queryKey: ['report-fines'],
    queryFn: () => reportsApi.fines().then(r => r.data),
    enabled: activeReport === 'fines',
  });

  const { data: inventoryReport, isLoading: invLoading } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => reportsApi.inventory().then(r => r.data),
    enabled: activeReport === 'inventory',
  });

  const fmt = (d) => d ? format(new Date(d), 'MMM d, yyyy') : '—';

  const tabs = [
    { id: 'overdue', label: 'Overdue' },
    { id: 'circulation', label: 'Circulation' },
    { id: 'fines', label: 'Fines' },
    { id: 'inventory', label: 'Inventory' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Library analytics and operational reports</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeReport === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overdue Report */}
      {activeReport === 'overdue' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Overdue Items</h2>
            {overdueReport && (
              <Badge color="red">{overdueReport.length} overdue</Badge>
            )}
          </div>
          {overdueLoading ? <Spinner size="md" className="py-10" /> : (
            <Card padding={false}>
              {!overdueReport?.length ? (
                <div className="text-center py-10">
                  <p className="text-4xl mb-2">✅</p>
                  <p className="text-gray-500">No overdue items!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Book</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Member</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Due Date</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Days Late</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Est. Fine</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {overdueReport.map(item => (
                        <tr key={item.loan_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium">{item.book_title}</p>
                            <p className="text-xs font-mono text-gray-400">{item.copy_barcode}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{item.first_name} {item.last_name}</p>
                            <p className="text-xs text-gray-400">{item.grade_class} · {item.email}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{fmt(item.due_date)}</td>
                          <td className="px-4 py-3">
                            <Badge color="red">{item.days_overdue} days</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600">
                            ${parseFloat(item.estimated_fine).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Circulation Report */}
      {activeReport === 'circulation' && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold">Circulation Statistics</h2>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          {circLoading ? <Spinner size="md" className="py-10" /> : (
            <div className="space-y-6">
              {/* Daily trend chart */}
              <Card>
                <h3 className="font-semibold text-gray-700 mb-4">Daily Activity</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={circReport?.dailyStats || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day"
                      tickFormatter={(d) => format(new Date(d), 'MMM d')}
                      tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(d) => format(new Date(d), 'MMM d, yyyy')} />
                    <Bar dataKey="checkouts" fill="#3b82f6" name="Checkouts" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="returns" fill="#10b981" name="Returns" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Borrowers */}
                <Card>
                  <h3 className="font-semibold text-gray-700 mb-4">Top Borrowers</h3>
                  <div className="space-y-2">
                    {circReport?.topBorrowers?.map((b, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{b.first_name} {b.last_name}</p>
                          <p className="text-xs text-gray-400">{b.grade_class || b.role}</p>
                        </div>
                        <Badge color="blue">{b.total_loans} loans</Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* By Category */}
                <Card>
                  <h3 className="font-semibold text-gray-700 mb-4">Loans by Genre</h3>
                  <div className="space-y-2">
                    {circReport?.byCategory?.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-700">{c.genre}</span>
                            <span className="font-semibold">{c.loan_count}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{
                                width: `${(c.loan_count / (circReport.byCategory[0]?.loan_count || 1)) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fines Report */}
      {activeReport === 'fines' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Fines Summary</h2>
          {finesLoading ? <Spinner size="md" className="py-10" /> : (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Fines Issued', value: finesReport?.summary.grand_total, prefix: '$', color: 'gray' },
                  { label: 'Unpaid', value: finesReport?.summary.unpaid_total, prefix: '$', color: 'red' },
                  { label: 'Collected', value: finesReport?.summary.paid_total, prefix: '$', color: 'green' },
                  { label: 'Waived', value: finesReport?.summary.waived_total, prefix: '$', color: 'yellow' },
                ].map(({ label, value, prefix, color }) => (
                  <Card key={label} className={`${color === 'red' ? 'border-red-200' : ''}`}>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`text-2xl font-bold mt-1 ${
                      color === 'red' ? 'text-red-600' :
                      color === 'green' ? 'text-green-600' : 'text-gray-800'
                    }`}>
                      {prefix}{parseFloat(value || 0).toFixed(2)}
                    </p>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By Type */}
                <Card>
                  <h3 className="font-semibold text-gray-700 mb-4">Fines by Type</h3>
                  <div className="space-y-3">
                    {finesReport?.byType?.map(t => (
                      <div key={t.fine_type} className="flex items-center justify-between text-sm">
                        <Badge color={t.fine_type === 'overdue' ? 'orange' : 'red'} className="capitalize">
                          {t.fine_type}
                        </Badge>
                        <div className="text-right">
                          <p className="font-semibold">${parseFloat(t.total_amount).toFixed(2)}</p>
                          <p className="text-xs text-gray-400">{t.count} fine(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Top Debtors */}
                <Card>
                  <h3 className="font-semibold text-gray-700 mb-4">Top Outstanding Fines</h3>
                  <div className="space-y-2">
                    {finesReport?.topDebtors?.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{d.first_name} {d.last_name}</p>
                          <p className="text-xs text-gray-400">{d.grade_class}</p>
                        </div>
                        <Badge color="red">${parseFloat(d.unpaid_total).toFixed(2)}</Badge>
                      </div>
                    ))}
                    {!finesReport?.topDebtors?.length && (
                      <p className="text-gray-400 text-sm">No outstanding fines</p>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inventory Report */}
      {activeReport === 'inventory' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Inventory Report</h2>
            {inventoryReport && (
              <p className="text-sm text-gray-500">{inventoryReport.length} titles</p>
            )}
          </div>
          {invLoading ? <Spinner size="md" className="py-10" /> : (
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Authors</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Genre</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500">Total</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500">Available</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500">On Loan</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500">On Hold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventoryReport?.map(book => (
                      <tr key={book.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 line-clamp-2">{book.title}</p>
                          <p className="text-xs font-mono text-gray-400">{book.call_number}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{book.authors}</td>
                        <td className="px-4 py-3">
                          {book.genre && <Badge color="blue">{book.genre}</Badge>}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">{book.total_copies}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${
                            parseInt(book.available_copies) === 0 ? 'text-red-600' : 'text-green-600'
                          }`}>{book.available_copies}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{book.on_loan || 0}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{book.on_hold || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
