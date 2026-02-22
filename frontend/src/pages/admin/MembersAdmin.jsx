import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { membersApi } from '../../services/api';
import {
  Button, Card, Modal, Input, Select, Badge, Spinner, EmptyState, Pagination
} from '../../components/ui';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const MemberForm = ({ onSuccess }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { role: 'student' }
  });
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => membersApi.create(data),
    onSuccess: () => {
      toast.success('Member account created successfully');
      qc.invalidateQueries(['admin-members']);
      onSuccess?.();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create member'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="First Name *" {...register('firstName', { required: 'Required' })}
          error={errors.firstName?.message} />
        <Input label="Last Name *" {...register('lastName', { required: 'Required' })}
          error={errors.lastName?.message} />
        <Input label="Username *" {...register('username', { required: 'Required' })}
          error={errors.username?.message} />
        <Input label="Email *" type="email" {...register('email', { required: 'Required' })}
          error={errors.email?.message} />
        <Input label="Password *" type="password"
          {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })}
          error={errors.password?.message} />
        <Select label="Role" {...register('role')}>
          <option value="student">Student</option>
          <option value="staff">Staff</option>
          <option value="librarian">Librarian</option>
        </Select>
        <Input label="Phone" {...register('phone')} />
        <Input label="Grade / Class" {...register('gradeClass')}
          placeholder="e.g. Grade 10B" />
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={mutation.isPending}>Create Member</Button>
      </div>
    </form>
  );
};

const roleBadgeColor = {
  admin: 'red',
  librarian: 'blue',
  staff: 'green',
  student: 'yellow'
};

const MembersAdmin = () => {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeMode, setBarcodeMode] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-members', search, roleFilter, page],
    queryFn: () => membersApi.list({ search, role: roleFilter, page, limit: 15 }).then(r => r.data),
  });

  const handleBarcodeSearch = async (e) => {
    e.preventDefault();
    if (!barcodeInput) return;
    try {
      const { data: member } = await membersApi.getByBarcode(barcodeInput);
      window.location.href = `/admin/members/${member.id}`;
    } catch {
      toast.error('Member not found with that barcode');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage students and staff library accounts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setBarcodeMode(true)}>
            Card Scan
          </Button>
          <Button onClick={() => setShowForm(true)}>+ New Member</Button>
        </div>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
            className="flex gap-2 flex-1 min-w-48">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, email, username, class..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit" size="sm">Search</Button>
          </form>
          <select value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="staff">Staff</option>
            <option value="librarian">Librarians</option>
          </select>
          {(search || roleFilter) && (
            <Button variant="ghost" size="sm"
              onClick={() => { setSearch(''); setSearchInput(''); setRoleFilter(''); setPage(1); }}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      <Card padding={false}>
        {isLoading ? (
          <Spinner size="md" className="py-10" />
        ) : data?.members?.length === 0 ? (
          <EmptyState title="No members found"
            action={<Button onClick={() => setShowForm(true)}>Add Member</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Role / Class</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Active Loans</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Fines</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.members.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {m.first_name} {m.last_name}
                      </p>
                      <p className="text-xs text-gray-400">@{m.username}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={roleBadgeColor[m.role] || 'gray'}>{m.role}</Badge>
                      {m.grade_class && (
                        <p className="text-xs text-gray-400 mt-1">{m.grade_class}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{m.email}</td>
                    <td className="px-4 py-3">
                      {parseInt(m.active_loans) > 0 ? (
                        <Badge color="blue">{m.active_loans}</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {parseFloat(m.unpaid_fines) > 0 ? (
                        <Badge color="red">${parseFloat(m.unpaid_fines).toFixed(2)}</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={m.is_active ? 'green' : 'gray'}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/members/${m.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pagination
        page={data?.pagination?.page || 1}
        pages={data?.pagination?.pages || 1}
        onPageChange={setPage}
      />

      <Modal isOpen={showForm} onClose={() => setShowForm(false)}
        title="Create New Member" size="lg">
        <MemberForm onSuccess={() => setShowForm(false)} />
      </Modal>

      <Modal isOpen={barcodeMode} onClose={() => setBarcodeMode(false)}
        title="Member Card Scanner" size="sm">
        <p className="text-gray-500 text-sm mb-4">Scan a member card barcode to look up their account.</p>
        <form onSubmit={handleBarcodeSearch} className="flex gap-2">
          <input
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="Member barcode..."
            autoFocus
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
          <Button type="submit">Look Up</Button>
        </form>
      </Modal>
    </div>
  );
};

export default MembersAdmin;
