import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membersApi, finesApi } from '../../services/api';
import {
  Button, Card, Badge, Modal, Input, Spinner, LoanStatusBadge
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const MemberDetail = () => {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [activeTab, setActiveTab] = useState('loans');

  const { data: member, isLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: () => membersApi.get(id).then(r => r.data),
  });

  const { data: loans } = useQuery({
    queryKey: ['member-loans', id],
    queryFn: () => membersApi.getLoans(id).then(r => r.data),
    enabled: activeTab === 'loans',
  });

  const { data: fines } = useQuery({
    queryKey: ['member-fines', id],
    queryFn: () => membersApi.getFines(id).then(r => r.data),
    enabled: activeTab === 'fines',
  });

  const { data: reservations } = useQuery({
    queryKey: ['member-reservations', id],
    queryFn: () => membersApi.getReservations(id).then(r => r.data),
    enabled: activeTab === 'reservations',
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () => membersApi.update(id, { isActive: !member?.is_active }),
    onSuccess: () => {
      toast.success('Member status updated');
      qc.invalidateQueries(['member', id]);
    },
    onError: () => toast.error('Failed to update status'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => membersApi.resetPassword(id, { newPassword }),
    onSuccess: () => {
      toast.success('Password reset successfully');
      setShowPasswordReset(false);
      setNewPassword('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Password reset failed'),
  });

  const payAllFinesMutation = useMutation({
    mutationFn: () => finesApi.payAll(id),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries(['member', id]);
      qc.invalidateQueries(['member-fines', id]);
    },
    onError: () => toast.error('Failed to process payment'),
  });

  if (isLoading) return <Spinner size="lg" className="py-20" />;
  if (!member) return <div>Member not found</div>;

  const unpaidFines = parseFloat(member.unpaid_fines || 0);
  const fmt = (date) => date ? format(new Date(date), 'MMM d, yyyy') : '—';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/admin/members" className="text-blue-600 hover:underline text-sm">
          ← Members
        </Link>
      </div>

      {/* Profile Card */}
      <Card className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700">
              {member.first_name?.[0]}{member.last_name?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {member.first_name} {member.last_name}
              </h1>
              <p className="text-gray-500">@{member.username}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge color={member.role === 'student' ? 'yellow' : member.role === 'librarian' ? 'blue' : 'green'}>
                  {member.role}
                </Badge>
                {member.grade_class && <Badge color="gray">{member.grade_class}</Badge>}
                <Badge color={member.is_active ? 'green' : 'red'}>
                  {member.is_active ? 'Active' : 'Deactivated'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm"
              onClick={() => setShowPasswordReset(true)}>
              Reset Password
            </Button>
            <Button
              variant={member.is_active ? 'warning' : 'success'}
              size="sm"
              onClick={() => toggleActiveMutation.mutate()}
              loading={toggleActiveMutation.isPending}
            >
              {member.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Email</p>
            <p className="text-sm text-gray-700">{member.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Phone</p>
            <p className="text-sm text-gray-700">{member.phone || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Member Card</p>
            <p className="text-sm font-mono text-gray-700">{member.barcode}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Member Since</p>
            <p className="text-sm text-gray-700">{fmt(member.created_at)}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">{member.active_loans || 0}</p>
            <p className="text-xs text-blue-500">Active Loans</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-700">{member.total_loans_ever || 0}</p>
            <p className="text-xs text-gray-500">Total Loans</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${unpaidFines > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <p className={`text-2xl font-bold ${unpaidFines > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${unpaidFines.toFixed(2)}
            </p>
            <p className={`text-xs ${unpaidFines > 0 ? 'text-red-400' : 'text-green-400'}`}>
              Unpaid Fines
            </p>
          </div>
        </div>

        {unpaidFines > 0 && (
          <div className="mt-4 flex justify-end">
            <Button variant="success" size="sm"
              onClick={() => payAllFinesMutation.mutate()}
              loading={payAllFinesMutation.isPending}>
              Pay All Fines (${unpaidFines.toFixed(2)})
            </Button>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {['loans', 'fines', 'reservations'].map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'loans' && (
        <Card padding={false}>
          {!loans?.length ? (
            <p className="text-center py-8 text-gray-400">No loans found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Book</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Checked Out</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Due Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Returned</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Fine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loans.map(loan => (
                    <tr key={loan.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{loan.title}</p>
                        <p className="text-xs text-gray-400">{loan.authors}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{fmt(loan.checkout_date)}</td>
                      <td className={`px-4 py-3 ${
                        loan.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-600'
                      }`}>{fmt(loan.due_date)}</td>
                      <td className="px-4 py-3 text-gray-600">{fmt(loan.return_date)}</td>
                      <td className="px-4 py-3"><LoanStatusBadge status={loan.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {loan.fine_amount ? (
                          <Badge color={loan.fine_status === 'paid' ? 'green' : 'red'}>
                            ${parseFloat(loan.fine_amount).toFixed(2)}
                          </Badge>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'fines' && (
        <Card padding={false}>
          {!fines?.length ? (
            <p className="text-center py-8 text-gray-400">No fines</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Book</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fines.map(f => (
                    <tr key={f.id}>
                      <td className="px-4 py-3">{f.book_title || '—'}</td>
                      <td className="px-4 py-3 capitalize">{f.fine_type}</td>
                      <td className="px-4 py-3 font-semibold">${parseFloat(f.amount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Badge color={f.status === 'paid' ? 'green' : f.status === 'waived' ? 'gray' : 'red'}>
                          {f.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmt(f.issued_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'reservations' && (
        <Card padding={false}>
          {!reservations?.length ? (
            <p className="text-center py-8 text-gray-400">No reservations</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Book</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Queue #</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Reserved</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reservations.map(r => (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.title}</p>
                        <p className="text-xs text-gray-400">{r.authors}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={
                          r.status === 'ready' ? 'green' :
                          r.status === 'pending' ? 'blue' :
                          r.status === 'fulfilled' ? 'gray' : 'red'
                        }>{r.status}</Badge>
                      </td>
                      <td className="px-4 py-3">{r.queue_position}</td>
                      <td className="px-4 py-3 text-gray-500">{fmt(r.reserved_at)}</td>
                      <td className="px-4 py-3 text-gray-500">{fmt(r.expires_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Reset Password Modal */}
      <Modal isOpen={showPasswordReset} onClose={() => setShowPasswordReset(false)}
        title="Reset Member Password" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Set a new password for {member.first_name} {member.last_name}.
            They should change it after first login.
          </p>
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 6 characters"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowPasswordReset(false)}>Cancel</Button>
            <Button
              onClick={() => resetPasswordMutation.mutate()}
              loading={resetPasswordMutation.isPending}
              disabled={newPassword.length < 6}
            >
              Reset Password
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MemberDetail;
