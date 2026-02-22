import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { circulationApi, membersApi, booksApi } from '../../services/api';
import {
  Button, Card, Badge, Spinner, EmptyState, LoanStatusBadge
} from '../../components/ui';
import { format, isPast } from 'date-fns';
import toast from 'react-hot-toast';

// --- Checkout Panel ---
const CheckoutPanel = () => {
  const qc = useQueryClient();
  const [step, setStep] = useState('member'); // member | book | confirm
  const [memberBarcode, setMemberBarcode] = useState('');
  const [copyBarcode, setCopyBarcode] = useState('');
  const [member, setMember] = useState(null);
  const [copy, setCopy] = useState(null);
  const [loadingMember, setLoadingMember] = useState(false);
  const [loadingCopy, setLoadingCopy] = useState(false);

  const checkoutMutation = useMutation({
    mutationFn: () => circulationApi.checkout({
      userId: member.id,
      copyBarcode: copy.barcode,
    }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries(['overdue-loans']);
      // Reset
      setStep('member');
      setMemberBarcode('');
      setCopyBarcode('');
      setMember(null);
      setCopy(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Checkout failed');
    }
  });

  const lookupMember = async (e) => {
    e.preventDefault();
    if (!memberBarcode.trim()) return;
    setLoadingMember(true);
    try {
      // Try barcode first, then treat as ID if no result
      let data;
      try {
        const res = await membersApi.getByBarcode(memberBarcode.trim());
        data = res.data;
      } catch {
        const res = await membersApi.get(memberBarcode.trim());
        data = res.data;
      }
      setMember(data);
      setStep('book');
    } catch {
      toast.error('Member not found');
    } finally {
      setLoadingMember(false);
    }
  };

  const lookupCopy = async (e) => {
    e.preventDefault();
    if (!copyBarcode.trim()) return;
    setLoadingCopy(true);
    try {
      const res = await booksApi.getCopyByBarcode(copyBarcode.trim());
      const data = res.data;
      if (data.status !== 'available') {
        toast.error(`Copy is ${data.status} - not available for checkout`);
        return;
      }
      setCopy(data);
      setStep('confirm');
    } catch {
      toast.error('Book copy not found');
    } finally {
      setLoadingCopy(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Checkout</h2>

      {/* Step 1: Member */}
      <div className={`space-y-3 ${step !== 'member' && member ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
            member ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'
          }`}>1</div>
          <span className="font-medium text-gray-700">Scan Member Card</span>
        </div>
        {!member ? (
          <form onSubmit={lookupMember} className="flex gap-2">
            <input
              value={memberBarcode}
              onChange={(e) => setMemberBarcode(e.target.value)}
              placeholder="Member barcode or username..."
              autoFocus
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit" loading={loadingMember}>Look Up</Button>
          </form>
        ) : (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
            <div>
              <p className="font-semibold text-green-800">
                {member.first_name} {member.last_name}
              </p>
              <p className="text-xs text-green-600">
                {member.role} · {member.grade_class || 'N/A'} · {member.active_loans} loan(s)
              </p>
              {parseFloat(member.unpaid_fines) > 0 && (
                <p className="text-xs text-red-600 font-medium">
                  Outstanding fines: ${parseFloat(member.unpaid_fines).toFixed(2)}
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => {
              setMember(null);
              setMemberBarcode('');
              setStep('member');
              setCopy(null);
              setCopyBarcode('');
            }}>Change</Button>
          </div>
        )}
      </div>

      {/* Step 2: Book */}
      {member && (
        <div className={`space-y-3 mt-5 ${step !== 'book' && copy ? 'opacity-60' : ''}`}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
              copy ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'
            }`}>2</div>
            <span className="font-medium text-gray-700">Scan Book Barcode</span>
          </div>
          {!copy ? (
            <form onSubmit={lookupCopy} className="flex gap-2">
              <input
                value={copyBarcode}
                onChange={(e) => setCopyBarcode(e.target.value)}
                placeholder="Book copy barcode..."
                autoFocus={step === 'book'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <Button type="submit" loading={loadingCopy}>Look Up</Button>
            </form>
          ) : (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
              <div>
                <p className="font-semibold text-green-800">{copy.title}</p>
                <p className="text-xs text-green-600">{copy.authors} · {copy.barcode}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => {
                setCopy(null);
                setCopyBarcode('');
                setStep('book');
              }}>Change</Button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Confirm */}
      {member && copy && (
        <div className="mt-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800 font-medium">Ready to Check Out</p>
            <p className="text-xs text-blue-600 mt-1">
              Checking out "{copy.title}" to {member.first_name} {member.last_name} for 14 days.
            </p>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={() => checkoutMutation.mutate()}
            loading={checkoutMutation.isPending}
          >
            Confirm Checkout
          </Button>
        </div>
      )}
    </div>
  );
};

// --- Return Panel ---
const ReturnPanel = () => {
  const qc = useQueryClient();
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const returnMutation = useMutation({
    mutationFn: (copyBarcode) => circulationApi.return({ copyBarcode }),
    onSuccess: (res) => {
      setLastResult(res.data);
      setBarcode('');
      qc.invalidateQueries(['overdue-loans']);
      if (res.data.isOverdue) {
        toast.success(`Returned (${res.data.daysOverdue} days overdue - fine $${res.data.fineAmount.toFixed(2)})`, {
          duration: 5000,
          style: { background: '#fef2f2', color: '#991b1b' }
        });
      } else {
        toast.success(`"${res.data.bookTitle}" returned successfully!`);
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Return failed');
    }
  });

  const handleReturn = (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    returnMutation.mutate(barcode.trim());
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Return</h2>
      <p className="text-sm text-gray-500 mb-4">Scan the barcode on the book being returned.</p>
      <form onSubmit={handleReturn} className="flex gap-2">
        <input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Book copy barcode..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        />
        <Button type="submit" loading={returnMutation.isPending}>Process Return</Button>
      </form>

      {lastResult && (
        <div className={`mt-4 p-4 rounded-lg border ${
          lastResult.isOverdue
            ? 'bg-red-50 border-red-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <p className={`font-semibold ${lastResult.isOverdue ? 'text-red-800' : 'text-green-800'}`}>
            {lastResult.bookTitle}
          </p>
          {lastResult.isOverdue && (
            <div className="text-sm text-red-700 mt-1">
              <p>{lastResult.daysOverdue} days overdue</p>
              <p className="font-bold">Fine: ${lastResult.fineAmount?.toFixed(2)}</p>
            </div>
          )}
          {!lastResult.isOverdue && (
            <p className="text-sm text-green-600 mt-1">Returned on time - no fine</p>
          )}
        </div>
      )}
    </div>
  );
};

// --- Renew Panel ---
const RenewPanel = () => {
  const [loanId, setLoanId] = useState('');
  const [memberBarcode, setMemberBarcode] = useState('');
  const [member, setMember] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const lookupMember = async (e) => {
    e.preventDefault();
    if (!memberBarcode.trim()) return;
    setLoading(true);
    try {
      let data;
      try {
        const res = await membersApi.getByBarcode(memberBarcode.trim());
        data = res.data;
      } catch {
        const res = await membersApi.get(memberBarcode.trim());
        data = res.data;
      }
      setMember(data);
      const loansRes = await membersApi.getLoans(data.id, { status: 'active' });
      setLoans(loansRes.data);
    } catch {
      toast.error('Member not found');
    } finally {
      setLoading(false);
    }
  };

  const renewMutation = useMutation({
    mutationFn: (lId) => circulationApi.renew({ loanId: lId }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      // Refresh loans
      if (member) {
        membersApi.getLoans(member.id, { status: 'active' }).then(r => setLoans(r.data));
      }
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Renewal failed'),
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Renew Loan</h2>
      <form onSubmit={lookupMember} className="flex gap-2 mb-4">
        <input
          value={memberBarcode}
          onChange={(e) => setMemberBarcode(e.target.value)}
          placeholder="Member barcode..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        />
        <Button type="submit" loading={loading}>Look Up</Button>
      </form>

      {member && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="font-semibold text-blue-800">{member.first_name} {member.last_name}</p>
            <p className="text-xs text-blue-600">{member.grade_class || member.role}</p>
          </div>
          {loans.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No active loans</p>
          ) : (
            <div className="space-y-2">
              {loans.map(loan => (
                <div key={loan.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{loan.title}</p>
                    <p className="text-xs text-gray-500">
                      Due: {format(new Date(loan.due_date), 'MMM d, yyyy')}
                      {loan.renewal_count > 0 && ` · Renewed ${loan.renewal_count}x`}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary"
                    onClick={() => renewMutation.mutate(loan.id)}
                    loading={renewMutation.isPending}>
                    Renew
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Main CirculationDesk ---
const CirculationDesk = () => {
  const [activePanel, setActivePanel] = useState('checkout');
  const [page, setPage] = useState(1);

  const { data: overdueLoans, isLoading: overdueLoading } = useQuery({
    queryKey: ['overdue-loans'],
    queryFn: () => circulationApi.getOverdue().then(r => r.data),
    refetchInterval: 60000,
  });

  const panels = ['checkout', 'return', 'renew'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Circulation Desk</h1>
          <p className="text-gray-500 text-sm mt-1">Checkout, return, and renew books</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Circulation panel */}
        <div>
          <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
            {panels.map(p => (
              <button key={p}
                onClick={() => setActivePanel(p)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                  activePanel === p
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}>
                {p}
              </button>
            ))}
          </div>
          <Card>
            {activePanel === 'checkout' && <CheckoutPanel />}
            {activePanel === 'return' && <ReturnPanel />}
            {activePanel === 'renew' && <RenewPanel />}
          </Card>
        </div>

        {/* Overdue List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Overdue Books
              {overdueLoans?.length > 0 && (
                <span className="ml-2 text-sm bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  {overdueLoans.length}
                </span>
              )}
            </h2>
          </div>
          <Card padding={false}>
            {overdueLoading ? (
              <Spinner size="md" className="py-8" />
            ) : overdueLoans?.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-4xl mb-2">✅</p>
                <p className="text-gray-500">No overdue books!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {overdueLoans?.slice(0, 20).map(loan => (
                  <div key={loan.id} className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{loan.title}</p>
                    <p className="text-xs text-gray-500">
                      {loan.first_name} {loan.last_name} · {loan.grade_class || loan.role}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color="red">{loan.days_overdue} days</Badge>
                      <span className="text-xs text-gray-400">
                        Due: {format(new Date(loan.due_date), 'MMM d')}
                      </span>
                      <span className="text-xs text-red-600 font-medium">
                        ~${parseFloat(loan.estimated_fine).toFixed(2)} fine
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CirculationDesk;
