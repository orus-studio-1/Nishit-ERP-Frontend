'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { CurrencySelect } from '@/components/ui/currency-select';
import api from '@/lib/api';
import { Opportunity } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

const stages = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

export default function OpportunitiesPage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stageFilter, setStageFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    value: '',
    currency: 'INR',
    stage: 'PROSPECTING',
    probability: '10',
    expectedClose: '',
    notes: '',
  });
  const router = useRouter();
  const limit = 20;

  const fetchOpps = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/crm/opportunities', { params: { page, limit, stage: stageFilter || undefined } });
      setOpps(res.data?.data?.items || []);
      setTotal(res.data?.data?.total || 0);
      const pipelineRes = await api.get('/crm/opportunities/pipeline');
      setPipeline(pipelineRes.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load opportunities');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOpps();
  }, [page, stageFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      toast.error('Please enter an opportunity title');
      return;
    }
    const valNum = Number(form.value);
    if (!form.value || Number.isNaN(valNum) || valNum <= 0) {
      toast.error('Please enter an estimated opportunity value greater than zero');
      return;
    }
    const probNum = Number(form.probability);
    if (Number.isNaN(probNum) || probNum < 0 || probNum > 100) {
      toast.error('Probability must be between 0% and 100%');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/crm/opportunities', {
        ...form,
        title: trimmedTitle,
        value: valNum,
        probability: probNum,
      });
      showApiSuccess('Opportunity created successfully');
      setShowModal(false);
      setForm({
        title: '',
        value: '',
        currency: 'INR',
        stage: 'PROSPECTING',
        probability: '10',
        expectedClose: '',
        notes: '',
      });
      fetchOpps();
    } catch (err: any) {
      showApiError(err, 'Failed to create opportunity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Opportunity',
      render: (o: Opportunity) => <span className="font-medium text-gray-900">{o.title}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      render: (o: Opportunity) => <span className="font-semibold">{formatCurrency(o.value, o.currency)}</span>,
    },
    { key: 'stage', header: 'Stage', render: (o: Opportunity) => <StatusBadge status={o.stage} /> },
    { key: 'probability', header: 'Probability', render: (o: Opportunity) => `${o.probability}%` },
    {
      key: 'expectedClose',
      header: 'Expected Close',
      render: (o: Opportunity) => (o.expectedClose ? formatDate(o.expectedClose) : '—'),
    },
  ];

  const moveStage = async (id: string, stage: string) => {
    try {
      if (stage === 'CLOSED_LOST') {
        const response = await api.get('/crm/lost-reasons');
        const reasons = response.data?.data || [];
        if (!reasons.length) throw new Error('Configure a mandatory loss reason in CRM Configuration first');
        const choice = window.prompt(`Enter loss reason number:\n${reasons.map((item: any, index: number) => `${index + 1}. ${item.name}`).join('\n')}`);
        const selected = reasons[Number(choice) - 1];
        if (!selected) return;
        await api.post(`/crm/opportunities/${id}/lose`, { lostReasonId: selected.id });
      } else if (stage === 'CLOSED_WON') {
        await api.post(`/crm/opportunities/${id}/win`, {});
      } else {
        await api.post(`/crm/opportunities/${id}/stage`, { stage });
      }
      showApiSuccess(`Opportunity stage updated to ${stage.replace('_', ' ')}`);
      fetchOpps();
    } catch (err: any) {
      showApiError(err, 'Stage update failed');
    }
  };

  return (
    <div>
      <PageHeader
        title="Opportunities"
        description="Track sales opportunities and deals through the pipeline"
        action={{ label: 'New Opportunity', onClick: () => setShowModal(true), icon: Plus }}
      />
      <div className="mb-4 grid gap-3 xl:grid-cols-6">
        {pipeline.map((column) => (
          <div key={column.stage} className="min-h-44 rounded-md border border-[#dfe3e8] bg-[#fbfaf8]">
            <div className="border-b border-[#e5e2dc] p-3">
              <StatusBadge status={column.stage} />
              <p className="mt-1 text-xs text-[#6b7280]">
                {column.count} deals · {formatCurrency(column.totalValue || 0, 'USD')}
              </p>
            </div>
            <div className="space-y-2 p-2">
              {column.items.slice(0, 4).map((opp: Opportunity) => (
                <div key={opp.id} className="rounded-md border border-[#e5e2dc] bg-white p-2 text-sm">
                  <p className="font-medium text-[#1f2937]">{opp.title}</p>
                  <p className="text-xs text-[#6b7280]">
                    {formatCurrency(opp.value, opp.currency)} · {opp.probability}%
                  </p>
                  <Select value={opp.stage} onValueChange={(stage) => moveStage(opp.id, stage)}>
                    <SelectTrigger className="mt-2 h-7">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <Button variant={stageFilter === '' ? 'default' : 'outline'} size="sm" onClick={() => setStageFilter('')}>
          All
        </Button>
        {stages.map((s) => (
          <Button
            key={s}
            variant={stageFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStageFilter(s)}
          >
            {s.replace('_', ' ')}
          </Button>
        ))}
      </div>
      {opps.length === 0 && !isLoading ? (
        <EmptyState
          icon={TrendingUp}
          title="No opportunities"
          description="Start tracking sales opportunities to forecast revenue"
          action={{ label: 'New Opportunity', onClick: () => setShowModal(true) }}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={opps}
            isLoading={isLoading}
            onRowClick={(opp) => router.push(`/crm/opportunities/${opp.id}`)}
          />
          {total > limit && (
            <Pagination
              page={page}
              totalPages={Math.ceil(total / limit)}
              total={total}
              limit={limit}
              onPageChange={setPage}
            />
          )}
        </>
      )}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New Opportunity</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                placeholder="e.g. Acme Corp Annual License"
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Value *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <CurrencySelect
                value={form.currency}
                onChange={(currency) => setForm((f) => ({ ...f, currency }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Probability (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.probability}
                onChange={(e) => setForm((f) => ({ ...f, probability: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Expected Close Date</Label>
              <Input
                type="date"
                value={form.expectedClose}
                onChange={(e) => setForm((f) => ({ ...f, expectedClose: e.target.value }))}
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Opportunity'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
