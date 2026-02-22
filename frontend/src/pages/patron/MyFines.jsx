import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membersApi, finesApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge, Button, Spinner, EmptyState, StatCard } from '../../components/ui';
import toast from 'react-hot-toast';

const fineStatusConfig = {
  outstanding: { color: 'red', label: 'Outstanding' },
  paid: { color: 'green', label: 'Paid' },
  waived: { color: 'gray', label: 'Waived' },
};

const MyFines = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: fines, isLoading } = useQuery({
    queryKey: ['my-fines', user?.id],
    queryFn: () => membersApi.getFines(user.id).then(r => r.data),
    enabled: !!user?.id,
  });

  const payAllMutation = useMutation({
    mutationFn: () => finesApi.payAll(user.id, { paymentMethod: 'cash' }),
    onSuccess: () => {
      toast.success('All outstanding fines paid!');
      qc.invalidateQueries(['my-fines']);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Payment failed'),
  });

  const outstanding = fines?.filter(f => f.status === 'outstanding') || [];
  const paid = fines?.filter(f => f.status !== 'outstanding') || [];
  const totalOwed = outstanding.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Fines</h1>
        <p className="text-gray-500 text-sm mt-1">Outstanding and paid library fines</p>
      </div>

      {isLoading ? (
        <Spinner size="md" className="py-16" />
      ) : (
        <>
          {/* Summary */}
          {totalOwed > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <StatCard
                label="Total Outstanding"
                value={`$${totalOwed.toFixed(2)}`}
                color="red"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                }
              />
              <div className="flex items-center">
                <Button
                  variant="primary"
                  loading={payAllMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`Pay all outstanding fines ($${totalOwed.toFixed(2)})?`)) {
                      payAllMutation.mutate();
                    }
                  }}
                >
                  Pay All Fines (${totalOwed.toFixed(2)})
                </Button>
              </div>
            </div>
          )}

          {!fines?.length ? (
            <Card>
              <EmptyState
                title="No fines"
                description="You have no library fines. Keep returning books on time!"
              />
            </Card>
          ) : (
            <>
              {/* Outstanding */}
              {outstanding.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Outstanding ({outstanding.length})
                  </h2>
                  <div className="space-y-3">
                    {outstanding.map((fine) => (
                      <Card key={fine.id} className="border-red-200 bg-red-50">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">{fine.book_title || 'Library Fine'}</p>
                            <p className="text-sm text-gray-500 mt-0.5 capitalize">
                              {fine.fine_type?.replace('_', ' ')} fine
                              {fine.days_overdue > 0 && ` — ${fine.days_overdue} days overdue`}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Issued: {new Date(fine.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="sm:text-right shrink-0">
                            <p className="text-xl font-bold text-red-600">${parseFloat(fine.amount).toFixed(2)}</p>
                            <Badge color="red" className="mt-1">Outstanding</Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Paid / Waived */}
              {paid.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Paid / Waived ({paid.length})
                  </h2>
                  <div className="space-y-2">
                    {paid.map((fine) => {
                      const cfg = fineStatusConfig[fine.status] || { color: 'gray', label: fine.status };
                      return (
                        <Card key={fine.id} className="opacity-75">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-700">{fine.book_title || 'Library Fine'}</p>
                              <p className="text-xs text-gray-400 mt-0.5 capitalize">
                                {fine.fine_type?.replace('_', ' ')} · {new Date(fine.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold text-gray-700">${parseFloat(fine.amount).toFixed(2)}</p>
                              <Badge color={cfg.color} className="mt-1">{cfg.label}</Badge>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MyFines;
