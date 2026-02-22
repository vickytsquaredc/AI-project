import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { membersApi, circulationApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Card, Badge, Button, Spinner, EmptyState, LoanStatusBadge, Pagination
} from '../../components/ui';
import toast from 'react-hot-toast';

const MyLoans = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('active');

  const { data, isLoading } = useQuery({
    queryKey: ['my-loans', user?.id, filter, page],
    queryFn: () => membersApi.getLoans(user.id, { status: filter, page, limit: 10 }).then(r => r.data),
    enabled: !!user?.id,
  });

  const renewMutation = useMutation({
    mutationFn: (loanId) => circulationApi.renew({ loanId }),
    onSuccess: (res) => {
      toast.success(`Renewed! New due date: ${new Date(res.data.loan.due_date).toLocaleDateString()}`);
      qc.invalidateQueries(['my-loans']);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Renewal failed'),
  });

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Loans</h1>
        <p className="text-gray-500 text-sm mt-1">Books you have checked out</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['active', 'overdue', 'returned', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
              ${filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner size="md" className="py-16" />
      ) : !data?.loans?.length ? (
        <Card>
          <EmptyState
            title="No loans found"
            description={filter === 'active' ? "You don't have any books checked out right now." : "No loans match this filter."}
            action={<Link to="/catalog"><Button variant="secondary">Browse Catalog</Button></Link>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {data.loans.map((loan) => {
            const overdue = loan.status === 'active' && isOverdue(loan.due_date);
            return (
              <Card key={loan.id} className={overdue ? 'border-red-300 bg-red-50' : ''}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/catalog/book/${loan.book_id}`}
                      className="font-semibold text-blue-700 hover:underline text-lg leading-tight"
                    >
                      {loan.book_title}
                    </Link>
                    <p className="text-gray-500 text-sm mt-0.5">{loan.book_authors || 'Unknown author'}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <LoanStatusBadge status={overdue ? 'overdue' : loan.status} />
                      {loan.renewals_count > 0 && (
                        <Badge color="purple">Renewed {loan.renewals_count}x</Badge>
                      )}
                      {loan.copy_barcode && (
                        <span className="text-xs text-gray-400 font-mono">#{loan.copy_barcode}</span>
                      )}
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <div className="text-sm text-gray-500">
                      Checked out: <span className="font-medium text-gray-700">
                        {new Date(loan.checkout_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={`text-sm mt-0.5 ${overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      Due: <span className="font-medium">
                        {new Date(loan.due_date).toLocaleDateString()}
                      </span>
                      {overdue && ' (OVERDUE)'}
                    </div>
                    {loan.return_date && (
                      <div className="text-sm text-green-600 mt-0.5">
                        Returned: {new Date(loan.return_date).toLocaleDateString()}
                      </div>
                    )}
                    {loan.status === 'active' && loan.renewals_count < 3 && (
                      <Button
                        size="sm"
                        variant={overdue ? 'warning' : 'outline'}
                        className="mt-2"
                        loading={renewMutation.isPending}
                        onClick={() => renewMutation.mutate(loan.id)}
                      >
                        Renew
                      </Button>
                    )}
                    {loan.status === 'active' && loan.renewals_count >= 3 && (
                      <p className="text-xs text-gray-400 mt-2">Max renewals reached</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination
        page={data?.pagination?.page || 1}
        pages={data?.pagination?.pages || 1}
        onPageChange={setPage}
      />
    </div>
  );
};

export default MyLoans;
