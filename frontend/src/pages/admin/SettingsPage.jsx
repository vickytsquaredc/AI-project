import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../../services/api';
import { Card, Button, Input, Spinner } from '../../components/ui';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const qc = useQueryClient();
  const [values, setValues] = useState({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => reportsApi.getSettings().then(r => r.data),
  });

  useEffect(() => {
    if (settings) {
      const v = {};
      Object.entries(settings).forEach(([k, s]) => { v[k] = s.value; });
      setValues(v);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data) => reportsApi.updateSettings(data),
    onSuccess: () => {
      toast.success('Settings saved');
      qc.invalidateQueries(['settings']);
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleSave = () => updateMutation.mutate(values);

  if (isLoading) return <Spinner size="lg" className="py-20" />;

  const editableSettings = [
    { key: 'library_name', label: 'Library Name', type: 'text' },
    { key: 'fine_rate_per_day', label: 'Fine Rate Per Day ($)', type: 'number', step: '0.01' },
    { key: 'max_books_student', label: 'Max Books Per Student', type: 'number' },
    { key: 'max_books_staff', label: 'Max Books Per Staff', type: 'number' },
    { key: 'loan_period_days', label: 'Default Loan Period (days)', type: 'number' },
    { key: 'renewal_period_days', label: 'Renewal Extension (days)', type: 'number' },
    { key: 'max_renewals', label: 'Maximum Renewals Allowed', type: 'number' },
    { key: 'hold_expiry_days', label: 'Hold Expiry (days after notification)', type: 'number' },
    { key: 'send_due_reminder_days', label: 'Send Due Reminder (days before)', type: 'number' },
    { key: 'allow_self_renew', label: 'Allow Self-Renewal Online', type: 'text' },
  ];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Library Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure library policies and system preferences</p>
      </div>

      <Card>
        <div className="space-y-4">
          {editableSettings.map(({ key, label, type, step }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
              </label>
              {settings?.[key]?.description && (
                <p className="text-xs text-gray-400 mb-1">{settings[key].description}</p>
              )}
              <input
                type={type}
                step={step}
                value={values[key] || ''}
                onChange={(e) => setValues(v => ({ ...v, [key]: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
          <Button onClick={handleSave} loading={updateMutation.isPending}>
            Save Settings
          </Button>
        </div>
      </Card>

      {/* About */}
      <Card className="mt-6">
        <h2 className="font-semibold text-gray-700 mb-3">System Information</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Application</span>
            <span>School Library Management System v1.0</span>
          </div>
          <div className="flex justify-between">
            <span>Backend</span>
            <span>Node.js + Express</span>
          </div>
          <div className="flex justify-between">
            <span>Database</span>
            <span>PostgreSQL</span>
          </div>
          <div className="flex justify-between">
            <span>Frontend</span>
            <span>React.js</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
