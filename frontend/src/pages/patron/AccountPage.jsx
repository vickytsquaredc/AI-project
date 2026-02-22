import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input } from '../../components/ui';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const roleLabels = {
  student: 'Student',
  staff: 'Staff',
  librarian: 'Librarian',
  admin: 'Administrator',
};

const AccountPage = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile form
  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: profileErrors },
  } = useForm({
    defaultValues: {
      firstName: user?.first_name || '',
      lastName: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });

  // Password form
  const {
    register: regPwd,
    handleSubmit: handlePwd,
    reset: resetPwd,
    watch,
    formState: { errors: pwdErrors },
  } = useForm();

  const profileMutation = useMutation({
    mutationFn: (data) => authApi.updateProfile(data),
    onSuccess: () => {
      toast.success('Profile updated!');
      refreshUser();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed'),
  });

  const passwordMutation = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully!');
      resetPwd();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Password change failed'),
  });

  const newPassword = watch('newPassword');

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your profile and account settings</p>
      </div>

      {/* User info summary */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xl font-bold shrink-0">
            {user?.first_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-sm text-gray-500">@{user?.username}</p>
            <p className="text-xs text-blue-600 font-medium mt-0.5">
              {roleLabels[user?.role] || user?.role}
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        {['profile', 'password'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
              ${activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'profile' ? 'Profile' : 'Change Password'}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h2>
          <form onSubmit={handleProfile((d) => profileMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                {...regProfile('firstName', { required: 'First name is required' })}
                error={profileErrors.firstName?.message}
              />
              <Input
                label="Last Name"
                {...regProfile('lastName', { required: 'Last name is required' })}
                error={profileErrors.lastName?.message}
              />
            </div>
            <Input
              label="Email Address"
              type="email"
              {...regProfile('email', {
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' }
              })}
              error={profileErrors.email?.message}
              placeholder="your.email@school.edu"
            />
            <Input
              label="Phone Number"
              type="tel"
              {...regProfile('phone')}
              placeholder="e.g. 555-0100"
            />
            <div className="pt-2">
              <Button type="submit" loading={profileMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handlePwd((d) => passwordMutation.mutate(d))} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              {...regPwd('currentPassword', { required: 'Current password is required' })}
              error={pwdErrors.currentPassword?.message}
            />
            <Input
              label="New Password"
              type="password"
              {...regPwd('newPassword', {
                required: 'New password is required',
                minLength: { value: 8, message: 'Must be at least 8 characters' },
              })}
              error={pwdErrors.newPassword?.message}
              helpText="Minimum 8 characters"
            />
            <Input
              label="Confirm New Password"
              type="password"
              {...regPwd('confirmPassword', {
                required: 'Please confirm your password',
                validate: (v) => v === newPassword || 'Passwords do not match',
              })}
              error={pwdErrors.confirmPassword?.message}
            />
            <div className="pt-2">
              <Button type="submit" loading={passwordMutation.isPending}>
                Update Password
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

export default AccountPage;
