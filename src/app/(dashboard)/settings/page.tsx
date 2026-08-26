'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { getInitials } from '@/lib/utils';

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPwd, setIsSavingPwd] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await api.put('/auth/profile', profile);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setIsSavingProfile(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsSavingPwd(true);
    try {
      await api.put('/auth/change-password', { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      toast.success('Password changed');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setIsSavingPwd(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xl font-bold">{user ? getInitials(user.firstName, user.lastName) : 'U'}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>First Name</Label><Input value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Last Name</Label><Input value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></div>
            <Button type="submit" disabled={isSavingProfile}>{isSavingProfile ? 'Saving...' : 'Save Profile'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5"><Label>Current Password</Label><Input type="password" value={passwords.currentPassword} onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>New Password</Label><Input type="password" value={passwords.newPassword} onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Confirm New Password</Label><Input type="password" value={passwords.confirmPassword} onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))} required /></div>
            <Button type="submit" disabled={isSavingPwd}>{isSavingPwd ? 'Changing...' : 'Change Password'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
