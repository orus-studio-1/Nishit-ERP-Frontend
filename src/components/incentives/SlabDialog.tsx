'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const problem = validateSlabDraft(draft, 'Slab');
    if (problem) { toast.error(problem); return; }
    setIsSubmitting(true);
    try {
      const payload = slabDraftPayload(draft);
      if (slab) await api.put(`/incentives/schemes/${schemeId}/slabs/${slab.id}`, payload);
      else await api.post(`/incentives/schemes/${schemeId}/slabs`, payload);
      showApiSuccess(slab ? 'Slab updated' : 'Slab added');
      onSaved();
      onClose();
    } catch (err) {
      showApiError(err, slab ? 'Failed to update slab' : 'Failed to add slab');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{slab ? 'Edit Slab' : 'Add Slab'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="mt-2 space-y-4">
          <SlabFields value={draft} onChange={setDraft} measurementType={measurementType} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : slab ? 'Save Changes' : 'Add Slab'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
