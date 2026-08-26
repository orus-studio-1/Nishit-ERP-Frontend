'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Check, User } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { Project, Task, Milestone } from '@/types';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const taskStatuses = ['TODO','IN_PROGRESS','REVIEW','DONE','CANCELLED'];
const priorities = ['LOW','MEDIUM','HIGH','URGENT'];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'TODO', priority: 'MEDIUM', dueDate: '' });
  const [milestoneForm, setMilestoneForm] = useState({ name: '', description: '', dueDate: '' });

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [projRes, taskRes, msRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks`),
        api.get(`/projects/${projectId}/milestones`),
      ]);
      setProject(projRes.data.data);
      setTasks(taskRes.data.data);
      setMilestones(msRes.data.data);
    } catch { toast.error('Failed to load project'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [projectId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/projects/${projectId}/tasks`, taskForm);
      toast.success('Task created');
      setShowTaskModal(false);
      fetchAll();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/projects/${projectId}/milestones`, milestoneForm);
      toast.success('Milestone created');
      setShowMilestoneModal(false);
      fetchAll();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      await api.patch(`/projects/${projectId}/tasks/${taskId}`, { status });
      fetchAll();
    } catch { toast.error('Failed'); }
  };

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (!project) return <div className="text-center py-20 text-gray-500">Project not found</div>;

  const doneTasks = tasks.filter(t => t.status === 'DONE').length;
  const progress = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;

  const tasksByStatus = (status: string) => tasks.filter(t => t.status === status);

  return (
    <div>
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Projects
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <StatusBadge status={project.status} />
            <StatusBadge status={project.priority} />
          </div>
          {project.description && <p className="text-gray-500 text-sm">{project.description}</p>}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {project.startDate && <span>Start: {formatDate(project.startDate)}</span>}
            {project.endDate && <span>End: {formatDate(project.endDate)}</span>}
            <span>{tasks.length} tasks · {milestones.length} milestones</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowMilestoneModal(true)}>+ Milestone</Button>
          <Button size="sm" onClick={() => setShowTaskModal(true)}><Plus className="h-4 w-4 mr-1" /> Task</Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600">Progress</span>
          <span className="text-sm font-medium">{progress}% ({doneTasks}/{tasks.length})</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Tabs defaultValue="board">
        <TabsList className="mb-4">
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          <div className="grid grid-cols-4 gap-4">
            {taskStatuses.slice(0, 4).map(status => (
              <div key={status}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{status.replace('_', ' ')}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 rounded">{tasksByStatus(status).length}</span>
                </div>
                <div className="space-y-2">
                  {tasksByStatus(status).map(task => (
                    <div key={task.id} className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                      <p className="font-medium text-sm text-gray-900 mb-1">{task.title}</p>
                      <div className="flex items-center justify-between">
                        <StatusBadge status={task.priority} />
                        {task.dueDate && <span className="text-xs text-gray-500">{formatDate(task.dueDate)}</span>}
                      </div>
                      {status !== 'DONE' && (
                        <button onClick={() => updateTaskStatus(task.id, 'DONE')} className="mt-2 text-xs text-green-600 hover:text-green-700 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Mark done
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="text-left px-4 py-2.5">Task</th>
                <th className="text-left px-4 py-2.5">Priority</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Due Date</th>
                <th className="text-left px-4 py-2.5">Actions</th>
              </tr></thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{task.title}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={task.priority} /></td>
                    <td className="px-4 py-2.5"><StatusBadge status={task.status} /></td>
                    <td className="px-4 py-2.5 text-gray-500">{task.dueDate ? formatDate(task.dueDate) : '—'}</td>
                    <td className="px-4 py-2.5">
                      <Select value={task.status} onValueChange={v => updateTaskStatus(task.id, v)}>
                        <SelectTrigger className="h-7 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{taskStatuses.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tasks.length === 0 && <div className="text-center py-8 text-gray-500">No tasks yet</div>}
          </div>
        </TabsContent>

        <TabsContent value="milestones">
          <div className="space-y-3">
            {milestones.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No milestones yet</div>
            ) : milestones.map(ms => (
              <Card key={ms.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{ms.name}</p>
                      {ms.description && <p className="text-sm text-gray-500">{ms.description}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {ms.dueDate && <span className="text-sm text-gray-500">{formatDate(ms.dueDate)}</span>}
                      <StatusBadge status={ms.status} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowTaskModal(false)}>Cancel</Button>
              <Button type="submit">Create Task</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showMilestoneModal} onOpenChange={setShowMilestoneModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Milestone</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateMilestone} className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={milestoneForm.name} onChange={e => setMilestoneForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={milestoneForm.description} onChange={e => setMilestoneForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={milestoneForm.dueDate} onChange={e => setMilestoneForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowMilestoneModal(false)}>Cancel</Button>
              <Button type="submit">Create Milestone</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
