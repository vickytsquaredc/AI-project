import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { membersApi, reservationsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge, Button, Spinner, EmptyState } from '../../components/ui';
import toast from 'react-hot-toast';

const statusConfig = {
  pending: { color: 'yellow', label: 'Waiting' },
  ready: { color: 'green', label: 'Ready for Pickup' },
  fulfilled: { color: 'blue', label: 'Fulfilled' },
  cancelled: { color: 'gray', label: 'Cancelled' },
  expired: { color: 'red', label: 'Expired' },
};

const MyReservations = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['my-reservations', user?.id],
    queryFn: () => membersApi.getReservations(user.id).then(r => r.data),
    enabled: !!user?.id,
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => reservationsApi.cancel(id),
    onSuccess: () => {
      toast.success('Reservation cancelled');
      qc.invalidateQueries(['my-reservations']);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Cancellation failed'),
  });

  const active = reservations?.filter(r => ['pending', 'ready'].includes(r.status)) || [];
  const past = reservations?.filter(r => ['fulfilled', 'cancelled', 'expired'].includes(r.status)) || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Reservations</h1>
        <p className="text-gray-500 text-sm mt-1">Books you have placed on hold</p>
      </div>

      {isLoading ? (
        <Spinner size="md" className="py-16" />
      ) : !reservations?.length ? (
        <Card>
          <EmptyState
            title="No reservations"
            description="You haven't placed any holds yet."
            action={<Link to="/catalog"><Button variant="secondary">Browse Catalog</Button></Link>}
          />
        </Card>
      ) : (
        <>
          {/* Active reservations */}
          {active.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Active Holds ({active.length})
              </h2>
              <div className="space-y-3">
                {active.map((res) => {
                  const cfg = statusConfig[res.status] || { color: 'gray', label: res.status };
                  const isReady = res.status === 'ready';
                  return (
                    <Card key={res.id} className={isReady ? 'border-green-300 bg-green-50' : ''}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/catalog/book/${res.book_id}`}
                            className="font-semibold text-blue-700 hover:underline text-lg leading-tight"
                          >
                            {res.book_title}
                          </Link>
                          <p className="text-gray-500 text-sm mt-0.5">{res.book_authors || 'Unknown author'}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge color={cfg.color}>{cfg.label}</Badge>
                            {res.queue_position > 0 && res.status === 'pending' && (
                              <Badge color="gray">Position #{res.queue_position} in queue</Badge>
                            )}
                          </div>
                          {isReady && res.expiry_date && (
                            <p className="text-green-700 text-sm mt-2 font-medium">
                              Ready for pickup! Hold expires: {new Date(res.expiry_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="sm:text-right shrink-0">
                          <div className="text-sm text-gray-500">
                            Placed: <span className="font-medium text-gray-700">
                              {new Date(res.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="danger"
                            className="mt-2"
                            loading={cancelMutation.isPending}
                            onClick={() => {
                              if (window.confirm('Cancel this reservation?')) {
                                cancelMutation.mutate(res.id);
                              }
                            }}
                          >
                            Cancel Hold
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past reservations */}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Past Reservations ({past.length})
              </h2>
              <div className="space-y-2">
                {past.map((res) => {
                  const cfg = statusConfig[res.status] || { color: 'gray', label: res.status };
                  return (
                    <Card key={res.id} className="opacity-75">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <Link
                            to={`/catalog/book/${res.book_id}`}
                            className="font-medium text-blue-700 hover:underline"
                          >
                            {res.book_title}
                          </Link>
                          <p className="text-gray-400 text-xs mt-0.5">
                            {new Date(res.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge color={cfg.color}>{cfg.label}</Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyReservations;
