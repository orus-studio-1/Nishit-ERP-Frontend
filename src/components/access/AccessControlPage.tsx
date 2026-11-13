'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { History, KeyRound, Plus, RefreshCcw, ShieldCheck, Users } from 'lucide-react';
import api from '@/lib/api';
import { showApiError } from '@/lib/apiError';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { PermissionMatrix } from './PermissionMatrix';
import { EmployeeAccessTab } from './EmployeeAccessTab';
import { isExpired, overrideCountLabel, type OverrideMeta, type StoredOverride } from './overrideExpiry';

function nameOf(user: any) {
  return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || '-';
}

function toggleSet(set: Set<string>, id: string) {
  const next = new Set(set);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
}

export function AccessControlPage() {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [roleForm, setRoleForm] = useState({ name: '', title: '', description: '' });
  const [roleAllowed, setRoleAllowed] = useState<Set<string>>(new Set());
  const [roleDenied, setRoleDenied] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userRoleIds, setUserRoleIds] = useState<Set<string>>(new Set());
  const [userAllowed, setUserAllowed] = useState<Set<string>>(new Set());
  const [userDenied, setUserDenied] = useState<Set<string>>(new Set());
  const [userOverrideMeta, setUserOverrideMeta] = useState<Record<string, OverrideMeta>>({});
  const [expiredOverrides, setExpiredOverrides] = useState<StoredOverride[]>([]);
  const [userIsActive, setUserIsActive] = useState(true);
  const [loading, setLoading] = useState(true);

  const { user: currentUser } = useAuth();
  const isSuperAdmin = Boolean(currentUser?.access?.isSuperAdmin);
  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId), [roles, selectedRoleId]);
  const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId), [users, selectedUserId]);
  const isOwnAccount = Boolean(selectedUser && currentUser?.id === selectedUser.id);
  const targetIsSuperAdmin =Boolean(selectedUser?.accessRoles?.some((r: { role?: { isSuperAdmin?: boolean } }) => r.role?.isSuperAdmin));

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [catalog, roleRes, userRes, summaryRes] = await Promise.all([
        api.get('/access/permissions'),
        api.get('/access/roles'),
        api.get('/access/users'),
        api.get('/access/summary'),
      ]);
      setPermissions(catalog.data.data || []);
      setRoles(roleRes.data.data || []);
      setUsers(userRes.data.data || []);
      setSummary(summaryRes.data.data || {});
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load access control');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (!selectedRole) return;
    setRoleForm({ name: selectedRole.name, title: selectedRole.title || '', description: selectedRole.description || '' });
    setRoleAllowed(new Set(selectedRole.permissions?.filter((p: any) => p.effect === 'ALLOW').map((p: any) => p.permissionId)));
    setRoleDenied(new Set(selectedRole.permissions?.filter((p: any) => p.effect === 'DENY').map((p: any) => p.permissionId)));
  }, [selectedRole]);

  useEffect(() => {
    if (!selectedUser) return;
    setUserRoleIds(new Set(selectedUser.accessRoles?.map((r: any) => r.roleId) || []));
    // Expired overrides no longer apply: keep them out of the grid (so saving can never revive
    // them) and list them separately as history.
    const overrides: StoredOverride[] = selectedUser.permissionOverrides || [];
    const live = overrides.filter((o) => !isExpired(o.expiresAt));
    setUserAllowed(new Set(live.filter((o) => o.effect === 'ALLOW').map((o) => o.permissionId)));
    setUserDenied(new Set(live.filter((o) => o.effect === 'DENY').map((o) => o.permissionId)));
    setUserOverrideMeta(Object.fromEntries(live.map((o) => [o.permissionId, { expiresAt: o.expiresAt || null, reason: o.reason || '' }])));
    setExpiredOverrides(overrides.filter((o) => isExpired(o.expiresAt)));
    setUserIsActive(Boolean(selectedUser.isActive));
  }, [selectedUser]);

  const bootstrap = async () => {
    try {
      await api.post('/access/bootstrap');
      toast.success('Access catalog synchronized');
      fetchAll();
    } catch (err) {
      showApiError(err, 'Could not synchronize the access catalog');
    }
  };

  const createRole = async () => {
    if (!roleForm.name.trim()) return toast.error('Role name is required');
    try {
      await api.post('/access/roles', {
        ...roleForm,
        permissionIds: [...roleAllowed],
        deniedPermissionIds: [...roleDenied],
      });
      toast.success('Role created');
      setRoleForm({ name: '', title: '', description: '' });
      setRoleAllowed(new Set());
      setRoleDenied(new Set());
      fetchAll();
    } catch (err) {
      showApiError(err, 'Could not create the role');
    }
  };

  const saveRole = async () => {
    if (!selectedRoleId) return toast.error('Select a role first');
    try {
      await api.put(`/access/roles/${selectedRoleId}`, {
        title: roleForm.title,
        description: roleForm.description,
        permissionIds: [...roleAllowed],
        deniedPermissionIds: [...roleDenied],
      });
      toast.success('Role permissions saved');
      fetchAll();
    } catch (err) {
      showApiError(err, 'Could not save the role permissions');
    }
  };

  const saveUserAccess = async () => {
    if (!selectedUserId) return toast.error('Select an employee user first');
    if (isOwnAccount && !userIsActive) {
      setUserIsActive(true);
      return toast.error('You cannot deactivate your own account. To keep the system accessible, another Super Admin must do this.');
    }
    if (isOwnAccount) {
      return toast.error('You cannot change your own roles or permission overrides. Please ask another Super Admin to make this change.', { id: 'own-access' });
    }
    if (!isSuperAdmin && targetIsSuperAdmin) {
      return toast.error('This user is a Super Admin. Only a Super Admin can change their access.');
    }
    if (!isSuperAdmin && roles.some((role) => role.isSuperAdmin && userRoleIds.has(role.id))) {
      return toast.error('Only a Super Admin can assign the Super Admin role. Please ask a Super Admin to make this change.');
    }
    const overrideFor = (permissionId: string, effect: 'ALLOW' | 'DENY') => {
      const meta = userOverrideMeta[permissionId];
      return { permissionId, effect, expiresAt: meta?.expiresAt || null, reason: meta?.reason?.trim() || null };
    };
    const live = [
      ...[...userAllowed].map((permissionId) => overrideFor(permissionId, 'ALLOW')),
      ...[...userDenied].map((permissionId) => overrideFor(permissionId, 'DENY')),
    ];
    if (live.some((o) => isExpired(o.expiresAt))) {
      return toast.error('One or more overrides have an expiry date in the past. Choose a future date or "Never".');
    }
    // Expired overrides are sent back unchanged so they stay as history; a permission picked
    // again in the grid replaces its expired entry.
    const liveIds = new Set(live.map((o) => o.permissionId));
    const history = expiredOverrides
      .filter((o) => !liveIds.has(o.permissionId))
      .map((o) => ({ permissionId: o.permissionId, effect: o.effect, expiresAt: o.expiresAt || null, reason: o.reason || null }));
    try {
      const res = await api.put(`/access/users/${selectedUserId}/access`, {
        isActive: userIsActive,
        roleIds: [...userRoleIds],
        permissionOverrides: [...live, ...history],
      });
      if (res.data?.data?.sessionsRevoked) toast.success('User access updated. They have been signed out of all devices and must sign in again.');
      else toast.success(res.data?.message || 'User access saved');
      fetchAll();
    } catch (err) {
      showApiError(err, 'Could not update user access');
    }
  };

  const roleColumns = [
    { key: 'name', header: 'Role', render: (r: any) => <span className="font-medium">{r.title || r.name}</span> },
    { key: 'isSystem', header: 'Type', render: (r: any) => <StatusBadge status={r.isSystem ? 'SYSTEM' : 'CUSTOM'} /> },
    { key: 'permissions', header: 'Permissions', render: (r: any) => r.permissions?.length || 0 },
    { key: 'users', header: 'Users', render: (r: any) => r._count?.users || 0 },
  ];

  const userColumns = [
    { key: 'name', header: 'Employee User', render: (u: any) => <div><p className="font-medium">{nameOf(u)}</p><p className="text-xs text-[#6b7280]">{u.email}</p></div> },
    { key: 'employee', header: 'Employee Record', render: (u: any) => u.employee ? `${u.employee.employeeId || ''} ${u.employee.position?.title ? `- ${u.employee.position.title}` : ''}` : 'No employee record' },
    { key: 'roles', header: 'Roles', render: (u: any) => <div className="flex flex-wrap gap-1">{u.accessRoles?.length ? u.accessRoles.map((r: any) => <StatusBadge key={r.roleId} status={r.role?.title || r.role?.name} />) : <span className="text-[#8a929d]">No roles</span>}</div> },
    { key: 'overrides', header: 'Overrides', render: (u: any) => overrideCountLabel(u.permissionOverrides) },
    { key: 'isActive', header: 'Status', render: (u: any) => <StatusBadge status={u.isActive ? 'ACTIVE' : 'DISABLED'} /> },
  ];

  return (
    <div>
      <PageHeader title="Access Control" description="Manage roles and permissions for employee users created from HR">
        <Button variant="outline" onClick={bootstrap}><RefreshCcw className="mr-2 h-4 w-4" />Sync Catalog</Button>
      </PageHeader>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-4"><Users className="h-5 w-5 text-[#1674c4]" /><div><p className="text-xs text-[#6b7280]">Employee Users</p><p className="text-xl font-semibold">{summary.users || 0}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><ShieldCheck className="h-5 w-5 text-[#16a34a]" /><div><p className="text-xs text-[#6b7280]">Roles</p><p className="text-xl font-semibold">{summary.roles || 0}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><KeyRound className="h-5 w-5 text-[#d97706]" /><div><p className="text-xs text-[#6b7280]">Permissions</p><p className="text-xl font-semibold">{summary.permissions || permissions.length}</p></div></CardContent></Card>
        <Link href="/audit-trail?module=access">
          <Card className="transition hover:border-[#2490ef]"><CardContent className="flex items-center gap-3 p-4"><History className="h-5 w-5 text-[#6b7280]" /><div><p className="text-xs text-[#6b7280]">Audit Trail</p><p className="text-xl font-semibold">View events</p></div></CardContent></Card>
        </Link>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Employee Access</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <EmployeeAccessTab
            loading={loading}
            users={users}
            userColumns={userColumns}
            selectedUser={selectedUser}
            setSelectedUserId={setSelectedUserId}
            userIsActive={userIsActive}
            setUserIsActive={setUserIsActive}
            roles={roles}
            isSuperAdmin={isSuperAdmin}
            targetIsSuperAdmin={targetIsSuperAdmin}
            isOwnAccount={isOwnAccount}
            userRoleIds={userRoleIds}
            setUserRoleIds={setUserRoleIds}
            saveUserAccess={saveUserAccess}
            permissions={permissions}
            userAllowed={userAllowed}
            userDenied={userDenied}
            setUserAllowed={setUserAllowed}
            setUserDenied={setUserDenied}
            userOverrideMeta={userOverrideMeta}
            setUserOverrideMeta={setUserOverrideMeta}
            expiredOverrides={expiredOverrides}
            onPasswordIssued={fetchAll}
          />
        </TabsContent>
        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
            <Card>
              <CardHeader><CardTitle>Role Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger><SelectValue placeholder="Edit existing role" /></SelectTrigger>
                  <SelectContent>{roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.title || role.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Role name for new role" value={roleForm.name} onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))} disabled={!!selectedRoleId} />
                <Input placeholder="Display title" value={roleForm.title} onChange={(e) => setRoleForm((f) => ({ ...f, title: e.target.value }))} />
                <Textarea placeholder="Description" value={roleForm.description} onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))} />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setSelectedRoleId(''); setRoleForm({ name: '', title: '', description: '' }); setRoleAllowed(new Set()); setRoleDenied(new Set()); }}>New</Button>
                  {selectedRoleId ? <Button onClick={saveRole}>Save Role</Button> : <Button onClick={createRole}><Plus className="mr-2 h-4 w-4" />Create Role</Button>}
                </div>
              </CardContent>
            </Card>
            <DataTable isLoading={loading} data={roles} columns={roleColumns} onRowClick={(role) => setSelectedRoleId(role.id)} />
          </div>
          <PermissionMatrix
            permissions={permissions}
            allowed={roleAllowed}
            denied={roleDenied}
            onAllow={(id) => { setRoleDenied((s) => { const n = new Set(s); n.delete(id); return n; }); setRoleAllowed((s) => toggleSet(s, id)); }}
            onDeny={(id) => { setRoleAllowed((s) => { const n = new Set(s); n.delete(id); return n; }); setRoleDenied((s) => toggleSet(s, id)); }}
          />
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionMatrix
            permissions={permissions}
            allowed={new Set(permissions.map((p) => p.id))}
            denied={new Set()}
            onAllow={() => undefined}
            onDeny={() => undefined}
            readOnly
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
