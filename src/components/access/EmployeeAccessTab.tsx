'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { UserRoundCog } from 'lucide-react';
import api from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionMatrix } from './PermissionMatrix';

function nameOf(user: any) {
  return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || '-';
}

function toggleSet(set: Set<string>, id: string) {
  const next = new Set(set);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
}

export function EmployeeAccessTab({
  loading, users, userColumns, selectedUser, setSelectedUserId, userIsActive, setUserIsActive,
  roles, userRoleIds, setUserRoleIds, saveUserAccess, permissions, userAllowed, userDenied, setUserAllowed, setUserDenied,
  onPasswordIssued,
}: any) {
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' });

  const issuePassword = async () => {
    if (!selectedUser) return toast.error('Select an employee user first');
    if (passwords.password.length < 8) return toast.error('Password must be at least 8 characters');
    if (passwords.password !== passwords.confirmPassword) return toast.error('Password confirmation does not match');
    try {
      await api.put(`/access/users/${selectedUser.id}/password`, { ...passwords, activate: true });
      toast.success('Password issued and login activated');
      setPasswords({ password: '', confirmPassword: '' });
      setUserIsActive(true);
      onPasswordIssued?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not issue password');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-2 p-4 text-sm text-[#4b5563] md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <UserRoundCog className="h-4 w-4 text-[#1674c4]" />
            Employees are created in <span className="font-semibold text-[#1f2937]">HR → Employees</span>. Issue their login password here, then assign roles and permission overrides.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_430px]">
        <DataTable isLoading={loading} data={users} columns={userColumns} onRowClick={(user) => setSelectedUserId(user.id)} />
        <Card>
          <CardHeader><CardTitle>{selectedUser ? `Access for ${nameOf(selectedUser)}` : 'Select Employee User'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {!selectedUser ? (
              <p className="text-sm leading-6 text-[#6b7280]">Choose an employee user from the table to add/remove roles or apply a direct allow/deny override.</p>
            ) : (
              <>
                <div className="rounded-md border border-[#e5e2dc] bg-[#f8faf9] p-3 text-sm">
                  <p className="font-medium text-[#1f2937]">{selectedUser.email}</p>
                  <p className="mt-1 text-[#6b7280]">{selectedUser.employee?.department?.name || 'No department'} / {selectedUser.employee?.position?.title || 'No position'}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={userIsActive} onChange={(event) => setUserIsActive(event.target.checked)} />
                  Login active
                </label>
                <div className="rounded-md border border-[#e5e2dc] bg-white p-3">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-[#1f2937]">Issue Login Password</p>
                    <p className="text-xs text-[#6b7280]">This sets or resets the employee password and activates their login.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <Label>New Password</Label>
                      <Input type="password" value={passwords.password} onChange={(event) => setPasswords((prev) => ({ ...prev, password: event.target.value }))} placeholder="Minimum 8 characters" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Confirm Password</Label>
                      <Input type="password" value={passwords.confirmPassword} onChange={(event) => setPasswords((prev) => ({ ...prev, confirmPassword: event.target.value }))} />
                    </div>
                    <Button variant="outline" onClick={issuePassword}>Issue Password</Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Assigned Roles</Label>
                  <div className="max-h-48 space-y-1 overflow-auto rounded-md border border-[#e5e2dc] p-2">
                    {roles.map((role: any) => (
                      <label key={role.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={userRoleIds.has(role.id)}
                          onChange={() => setUserRoleIds((set: Set<string>) => toggleSet(set, role.id))}
                        />
                        {role.title || role.name}
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={saveUserAccess}>Save User Access</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedUser && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#1f2937]">Direct Permission Overrides</h3>
              <p className="text-xs text-[#6b7280]">Use this only for exceptions. Role permissions should handle normal access.</p>
            </div>
          </div>
          <PermissionMatrix
            permissions={permissions}
            allowed={userAllowed}
            denied={userDenied}
            onAllow={(id) => { setUserDenied((s: Set<string>) => { const n = new Set(s); n.delete(id); return n; }); setUserAllowed((s: Set<string>) => toggleSet(s, id)); }}
            onDeny={(id) => { setUserAllowed((s: Set<string>) => { const n = new Set(s); n.delete(id); return n; }); setUserDenied((s: Set<string>) => toggleSet(s, id)); }}
          />
        </div>
      )}
    </div>
  );
}
