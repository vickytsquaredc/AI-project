import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { finesApi } from '../../services/api';
import {
  Button, Card, Badge, Modal, Input, Select, Spinner, EmptyState
} from '../../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const FinesAdmin = () => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('unpaid');
  const [showWaiveModal, setShowWaiveModal] = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [waiveReason, setWaiveReason] = useState('');
  const [issueForm, setIssueForm] = useState({
    userId: '', bookId: '', fineType: 'overdue', amount: '', notes: ''
  });

  const { data: fines, isLoading } = useQuery({
    queryKey: ['admin-fines', statusFilter],
    queryFn: () => finesApi.list({ status: statusFilter }).then(r => r.data),
  });

  const payMutation = useMutation({
    mutationFn: (id) => finesApi.pay(id),
    onSuccess: () => {
      toast.success('Fine marked as paid');
      qc.invalidateQueries(['admin-fines']);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const waiveMutation = useMutation({
    mutationFn: ({ id, reason }) => finesApi.waive(id, { reason }),
    onSuccess: () => {
      toast.success('Fine waived');
      qc.invalidateQueries(['admin-fines']);
      setShowWaiveModal(null);
      setWaiveReason('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const issueMutation = useMutation({
    mutationFn: (data) => finesApi.issue(data),
    onSuccess: () => {
      toast.success('Fine issued');
      qc.invalidateQueries(['admin-fines']);
      setShowIssueModal(false);
      setIssueForm({ userId: '', bookId: '', fineType: 'overdue', amount: '', notes: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const fmt = (d) => d ? format(new Date(d), 'MMM d, yyyy') : '—';
  const totalUnpaid = fines?.filter(f => f.status === 'unpaid')
    .reduce((s, f) => s + parseFloat(f.amount), 0) || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fines & Fees</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage overdue fines and other library fees
          </p>
        </div>
        <Button onClick={() => setShowIssueModal(true)}>+ Issue Fine</Button>
      </div>

      {/* Summary */}
      {statusFilter === 'unpaid' && totalUnpaid > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-red-800 font-semibold">
            Total Outstanding: ${totalUnpaid.toFixed(2)}
          </p>
          <p className="text-red-600 text-sm">{fines?.length} unpaid fine(s)</p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['unpaid', 'paid', 'waived', ''].map(s => (
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
        ) : !fines?.length ? (
          <EmptyState title="No fines found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Member</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Book</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Issued</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fines.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{f.first_name} {f.last_name}</p>
                      <p className="text-xs text-gray-400">{f.grade_class}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{f.book_title || '—'}</p>
                      {f.days_overdue > 0 && (
                        <p className="text-xs text-gray-400">{f.days_overdue} days overdue</p>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      <Badge color={
                        f.fine_type === 'overdue' ? 'orange' :
                        f.fine_type === 'lost' ? 'red' : 'gray'
                      }>{f.fine_type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ${parseFloat(f.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={
                        f.status === 'paid' ? 'green' :
                        f.status === 'waived' ? 'gray' : 'red'
                      }>{f.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmt(f.issued_at)}</td>
                    <td className="px-4 py-3">
                      {f.status === 'unpaid' && (
                        <div className="flex justify-end gap-2">
                          <Button variant="success" size="sm"
                            onClick={() => payMutation.mutate(f.id)}
                            loading={payMutation.isPending}>
                            Paid
                          </Button>
                          <Button variant="secondary" size="sm"
                            onClick={() => setShowWaiveModal(f)}>
                            Waive
                          </Button>
                        </div>
                      )}
                      {f.status === 'waived' && f.waive_reason && (
                        <span className="text-xs text-gray-400">Reason: {f.waive_reason}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Waive Modal */}
      <Modal isOpen={!!showWaiveModal} onClose={() => setShowWaiveModal(null)}
        title="Waive Fine" size="sm">
        {showWaiveModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Waiving ${parseFloat(showWaiveModal.amount).toFixed(2)} fine for{' '}
              <strong>{showWaiveModal.first_name} {showWaiveModal.last_name}</strong>
            </p>
            <Input
              label="Reason for waiver"
              value={waiveReason}
              onChange={(e) => setWaiveReason(e.target.value)}
              placeholder="e.g. First offense, financial hardship..."
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowWaiveModal(null)}>Cancel</Button>
              <Button variant="warning"
                onClick={() => waiveMutation.mutate({ id: showWaiveModal.id, reason: waiveReason })}
                loading={waiveMutation.isPending}>
                Confirm Waive
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Issue Fine Modal */}
      <Modal isOpen={showIssueModal} onClose={() => setShowIssueModal(false)}
        title="Issue Manual Fine" size="sm">
        <div className="space-y-4">
          <Input label="Member ID or Username"
            value={issueForm.userId}
            onChange={(e) => setIssueForm(f => ({ ...f, userId: e.target.value }))}
            placeholder="Paste member UUID or username" />
          <Input label="Book ID (optional)"
            value={issueForm.bookId}
            onChange={(e) => setIssueForm(f => ({ ...f, bookId: e.target.value }))} />
          <Select label="Fine Type"
            value={issueForm.fineType}
            onChange={(e) => setIssueForm(f => ({ ...f, fineType: e.target.value }))}>
            <option value="overdue">Overdue</option>
            <option value="lost">Lost Book</option>
            <option value="damaged">Damaged Book</option>
          </Select>
          <Input label="Amount ($)" type="number" step="0.01"
            value={issueForm.amount}
            onChange={(e) => setIssueForm(f => ({ ...f, amount: e.target.value }))} />
          <Input label="Notes (optional)"
            value={issueForm.notes}
            onChange={(e) => setIssueForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowIssueModal(false)}>Cancel</Button>
            <Button
              onClick={() => issueMutation.mutate(issueForm)}
              loading={issueMutation.isPending}>
              Issue Fine
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FinesAdmin;
