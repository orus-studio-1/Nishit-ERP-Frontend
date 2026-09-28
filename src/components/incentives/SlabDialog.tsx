'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { FormDialogShell } from '@/components/shared/FormDialogShell';
import { useDialogForm } from '@/hooks/useDialogForm';
import { SlabFields } from '@/components/incentives/SlabFields';
import {
  emptySlabDraft, slabDraftPayload, slabToDraft, validateSlabDraft,
  type IncentiveSlab, type MeasurementType, type SlabDraft,
} from '@/lib/incentives';

interface SlabDialogProps {
  open: boolean;
  schemeId: string;
  measurementType: MeasurementType;
  slab: IncentiveSlab | null; // null = add
  onClose: () => void;
  onSaved: () => void;
}

// Mount the form only while open so its state starts fresh each time.
export function SlabDialog(props: SlabDialogProps) {
  return props.open ? <SlabDialogForm {...props} /> : null;
}

function SlabDialogForm({ schemeId, measurementType, slab, onClose, onSaved }: SlabDialogProps) {
  const [draft, setDraft] = useState<SlabDraft>(slab ? slabToDraft(slab) : emptySlabDraft());
  const { isSubmitting, submit: runSubmit } = useDialogForm({ onSaved, onClose });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateSlabDraft(draft, 'Slab');
    if (problem) { toast.error(problem); return; }
    const payload = slabDraftPayload(draft);
    void runSubmit(
      () => (slab ? api.put(`/incentives/schemes/${schemeId}/slabs/${slab.id}`, payload) : api.post(`/incentives/schemes/${schemeId}/slabs`, payload)),
      slab ? 'Slab updated' : 'Slab added',
      slab ? 'Failed to update slab' : 'Failed to add slab',
    );
  };

  return (
    <FormDialogShell
      title={slab ? 'Edit Slab' : 'Add Slab'}
      onClose={onClose}
      onSubmit={submit}
      isSubmitting={isSubmitting}
      submitLabel={slab ? 'Save Changes' : 'Add Slab'}
    >
      <SlabFields value={draft} onChange={setDraft} measurementType={measurementType} />
    </FormDialogShell>
  );
}
