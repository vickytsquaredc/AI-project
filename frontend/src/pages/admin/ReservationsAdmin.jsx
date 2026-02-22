import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsApi } from '../../services/api';
import { Button, Card, Badge, Spinner, EmptyState } from '../../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ReservationsAdmin = () => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['admin-reservations', statusFilter],
    queryFn: () => reservationsApi.list({ status: statusFilter }).then(r => r.data),
    refetchInterval: 30000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => reservationsApi.cancel(id),
    onSuccess: () => {
      toast.success('Reservation cancelled');
      qc.invalidateQueries(['admin-reservations']);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Cancel failed'),
  });

  const fmt = (d) => d ? format(new Date(d), 'MMM d, yyyy') : '—';

  const statusBadge = (status) => {
    const config = {
      pending: { color: 'blue', label: 'Pending' },
      ready: { color: 'green', label: 'Ready for Pickup' },
      fulfilled: { color: 'gray', label: 'Fulfilled' },
      cancelled: { color: 'red', label: 'Cancelled' },
      expired: { color: 'orange', label: 'Expired' },
    };
    const { color, label } = config[status] || { color: 'gray', label: status };
    return <Badge color={color}>{label}</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-gray-500 text-sm mt-1">Manage holds and reservation queue</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['pending', 'ready', 'fulfilled', 'cancelled', 'expired', ''].map(s => (
          <button key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <Card padding={false}>
        {isLoading ? (
          <Spinner size="md" className="py-10" />
        ) : !reservations?.length ? (
          <EmptyState title="No reservations found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Book</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Patron</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Queue #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Reserved</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Notified</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Expires</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reservations.map(r => (
                  <tr key={r.id} className={`hover:bg-gray-50 ${
                    r.status === 'ready' ? 'bg-green-50' : ''
                  }`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{r.title}</p>
                      <p className="text-xs text-gray-400">{r.authors}</p>
                      <p className="text-xs text-gray-400">
                        {r.available_copies} available
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.first_name} {r.last_name}</p>
                      <p className="text-xs text-gray-400">{r.grade_class}</p>
                      <p className="text-xs text-gray-400">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-lg font-bold text-gray-700">#{r.queue_position}</span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmt(r.reserved_at)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmt(r.notified_at)}</td>
                    <td className={`px-4 py-3 text-xs font-medium ${
                      r.expires_at && new Date(r.expires_at) < new Date()
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}>{fmt(r.expires_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {['pending', 'ready'].includes(r.status) && (
                        <Button variant="danger" size="sm"
                          onClick={() => {
                            if (window.confirm('Cancel this reservation?')) {
                              cancelMutation.mutate(r.id);
                            }
                          }}>
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ReservationsAdmin;
