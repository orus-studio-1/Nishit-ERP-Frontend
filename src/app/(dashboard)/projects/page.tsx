'use client';

import { useEffect, useState } from 'react';
import { Plus, FolderOpen, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { Project } from '@/types';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: '', description: '', status: 'PLANNING', priority: 'MEDIUM', startDate: '', endDate: '', budget: '' });

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/projects', { params: { limit: 50 } });
      setProjects(res.data.data.items);
    } catch { toast.error('Failed to load projects'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, budget: form.budget ? Number(form.budget) : undefined };
      if (editingProject) await api.put(`/projects/${editingProject.id}`, payload); else await api.post('/projects', payload);
      toast.success(`Project ${editingProject ? 'updated' : 'created'}`);
      setShowModal(false);
      setEditingProject(null);
      fetchProjects();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const openCreate = () => { setEditingProject(null); setForm({ name: '', description: '', status: 'PLANNING', priority: 'MEDIUM', startDate: '', endDate: '', budget: '' }); setShowModal(true); };
  const openEdit = (project: Project) => { const row = project as any; setEditingProject(project); setForm({ name: row.name || '', description: row.description || '', status: row.status || 'PLANNING', priority: row.priority || 'MEDIUM', startDate: row.startDate ? String(row.startDate).slice(0, 10) : '', endDate: row.endDate ? String(row.endDate).slice(0, 10) : '', budget: row.budget == null ? '' : String(row.budget) }); setShowModal(true); };

  if (isLoading) return (
    <div>
      <div className="flex items-center justify-between mb-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-9 w-32" /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Projects" description="Manage team projects and tasks" action={{ label: 'New Project', onClick: openCreate, icon: Plus }} />

      {projects.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No projects yet" description="Create your first project to collaborate with your team" action={{ label: 'New Project', onClick: openCreate }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    {p.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>}
                  </div>
                  <div className="flex items-center gap-2"><StatusBadge status={p.status} /><Button size="sm" variant="ghost" aria-label={`Edit ${p.name}`} onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button></div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{p.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex gap-3">
                    <span>{p._count?.tasks || 0} tasks</span>
                    <span>{p._count?.milestones || 0} milestones</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={p.priority} />
                  </div>
                </div>

                {(p.startDate || p.endDate) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                    {p.startDate && <span>Start: {formatDate(p.startDate)}</span>}
                    {p.startDate && p.endDate && <span className="mx-2">→</span>}
                    {p.endDate && <span>End: {formatDate(p.endDate)}</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) setEditingProject(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editingProject ? 'Edit Project' : 'New Project'}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2 space-y-1.5"><Label>Project Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="col-span-2 space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['PLANNING','ACTIVE','ON_HOLD','COMPLETED','CANCELLED'].map(s => <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['LOW','MEDIUM','HIGH','URGENT'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Budget</Label><Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0.00" /></div>
            <div className="col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit">{editingProject ? 'Save Changes' : 'Create Project'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
