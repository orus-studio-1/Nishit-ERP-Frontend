'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { History, KeyRound, Plus, RefreshCcw, ShieldCheck, Users } from 'lucide-react';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
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
  const [audit, setAudit] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [roleForm, setRoleForm] = useState({ name: '', title: '', description: '' });
  const [roleAllowed, setRoleAllowed] = useState<Set<string>>(new Set());
  const [roleDenied, setRoleDenied] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userRoleIds, setUserRoleIds] = useState<Set<string>>(new Set());
  const [userAllowed, setUserAllowed] = useState<Set<string>>(new Set());
  const [userDenied, setUserDenied] = useState<Set<string>>(new Set());
  const [userIsActive, setUserIsActive] = useState(true);
  const [loading, setLoading] = useState(true);

  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId), [roles, selectedRoleId]);
  const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId), [users, selectedUserId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [catalog, roleRes, userRes, auditRes, summaryRes] = await Promise.all([
        api.get('/access/permissions'),
        api.get('/access/roles'),
        api.get('/access/users'),
        api.get('/access/audit'),
        api.get('/access/summary'),
      ]);
      setPermissions(catalog.data.data || []);
      setRoles(roleRes.data.data || []);
      setUsers(userRes.data.data || []);
      setAudit(auditRes.data.data || []);
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
    setUserAllowed(new Set(selectedUser.permissionOverrides?.filter((p: any) => p.effect === 'ALLOW').map((p: any) => p.permissionId)));
    setUserDenied(new Set(selectedUser.permissionOverrides?.filter((p: any) => p.effect === 'DENY').map((p: any) => p.permissionId)));
    setUserIsActive(Boolean(selectedUser.isActive));
  }, [selectedUser]);

  const bootstrap = async () => {
    await api.post('/access/bootstrap');
    toast.success('Access catalog synchronized');
    fetchAll();
  };

  const createRole = async () => {
    if (!roleForm.name.trim()) return toast.error('Role name is required');
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
  };

  const saveRole = async () => {
    if (!selectedRoleId) return toast.error('Select a role first');
    await api.put(`/access/roles/${selectedRoleId}`, {
      title: roleForm.title,
      description: roleForm.description,
      permissionIds: [...roleAllowed],
      deniedPermissionIds: [...roleDenied],
    });
    toast.success('Role permissions saved');
    fetchAll();
  };

  const saveUserAccess = async () => {
    if (!selectedUserId) return toast.error('Select an employee user first');
    await api.put(`/access/users/${selectedUserId}/access`, {
      isActive: userIsActive,
      roleIds: [...userRoleIds],
      permissionOverrides: [
        ...[...userAllowed].map((permissionId) => ({ permissionId, effect: 'ALLOW' })),
        ...[...userDenied].map((permissionId) => ({ permissionId, effect: 'DENY' })),
      ],
    });
    toast.success('User access updated');
    fetchAll();
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
    { key: 'overrides', header: 'Overrides', render: (u: any) => u.permissionOverrides?.length || 0 },
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
        <Card><CardContent className="flex items-center gap-3 p-4"><History className="h-5 w-5 text-[#6b7280]" /><div><p className="text-xs text-[#6b7280]">Audit Events</p><p className="text-xl font-semibold">{audit.length}</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Employee Access</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
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
            userRoleIds={userRoleIds}
            setUserRoleIds={setUserRoleIds}
            saveUserAccess={saveUserAccess}
            permissions={permissions}
            userAllowed={userAllowed}
            userDenied={userDenied}
            setUserAllowed={setUserAllowed}
            setUserDenied={setUserDenied}
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

        <TabsContent value="audit">
          <DataTable data={audit} columns={[
            { key: 'createdAt', header: 'Time', render: (r: any) => formatDateTime(r.createdAt) },
            { key: 'actor', header: 'Actor', render: (r: any) => r.actor ? nameOf(r.actor) : 'System' },
            { key: 'action', header: 'Action', render: (r: any) => <StatusBadge status={r.action} /> },
            { key: 'message', header: 'Message' },
          ]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
