'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { FormDialogShell } from '@/components/shared/FormDialogShell';
import { useDialogForm } from '@/hooks/useDialogForm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatAmount, type IncentiveContribution } from '@/lib/incentives';

interface SettleContributionDialogProps {
  open: boolean;
  schemeId: string;
  contribution: IncentiveContribution | null;
  onClose: () => void;
  onSaved: () => void;
}

// Mount the form only while open so its state starts fresh each time.
export function SettleContributionDialog(props: SettleContributionDialogProps) {
  return props.open && props.contribution ? <SettleContributionDialogForm {...props} contribution={props.contribution} /> : null;
}

function SettleContributionDialogForm({ schemeId, contribution, onClose, onSaved }: Omit<SettleContributionDialogProps, 'open'> & { contribution: IncentiveContribution }) {
  const [settledAmount, setSettledAmount] = useState(contribution.incentiveAmount);
  const [settledReference, setSettledReference] = useState('');
  const [settledAt, setSettledAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const { isSubmitting, submit: runSubmit } = useDialogForm({ onSaved, onClose });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (settledAmount.trim() === '' || !Number.isFinite(Number(settledAmount)) || Number(settledAmount) < 0) {
      toast.error('Settled amount must be a non-negative number');
      return;
    }
    void runSubmit(
      () => api.post(`/incentives/schemes/${schemeId}/contributions/${contribution.id}/settle`, {
        settledAmount: Number(settledAmount),
        settledReference: settledReference.trim() || undefined,
        settledAt,
        notes: notes.trim() || undefined,
      }),
      'Contribution marked as received',
      'Could not mark contribution as received',
    );
  };

  return (
    <FormDialogShell
      title="Record Incentive Received"
      onClose={onClose}
      onSubmit={submit}
      isSubmitting={isSubmitting}
      submitLabel="Mark as Received"
      contentClassName="max-w-md"
    >
      <p className="text-sm text-[#7c8591]">
        {contribution.purchaseInvoice?.invoiceNo} · Calculated incentive {formatAmount(contribution.incentiveAmount)}
      </p>
      <div className="space-y-1.5">
        <Label>Settled Amount (INR) *</Label>
        <Input type="number" min="0" step="0.01" value={settledAmount} onChange={(e) => setSettledAmount(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Settlement Reference</Label>
        <Input placeholder="Credit note no., bank reference..." value={settledReference} onChange={(e) => setSettledReference(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Date Received</Label>
        <Input type="date" value={settledAt} onChange={(e) => setSettledAt(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
      </div>
    </FormDialogShell>
  );
}
