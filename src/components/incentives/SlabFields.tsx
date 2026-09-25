'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REWARD_TYPES, humanize, type MeasurementType, type RewardType, type SlabDraft } from '@/lib/incentives';

interface SlabFieldsProps {
  value: SlabDraft;
  onChange: (next: SlabDraft) => void;
  measurementType: MeasurementType;
}

const NONE = '__none__';

export function SlabFields({ value, onChange, measurementType }: SlabFieldsProps) {
  const set = (patch: Partial<SlabDraft>) => onChange({ ...value, ...patch });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Threshold ({measurementType === 'VALUE' ? 'amount' : 'units'}) *</Label>
        <Input type="number" min="0" step="any" value={value.thresholdValue} onChange={(e) => set({ thresholdValue: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Reward type *</Label>
        <Select value={value.rewardType} onValueChange={(v) => set({ rewardType: v as RewardType })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{REWARD_TYPES.map((t) => <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Reward value *</Label>
        <Input type="number" min="0" step="any" value={value.rewardValue} onChange={(e) => set({ rewardValue: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Alternate reward type</Label>
        <Select value={value.altRewardType || NONE} onValueChange={(v) => set({ altRewardType: v === NONE ? '' : (v as RewardType), ...(v === NONE ? { altRewardValue: '' } : {}) })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>None</SelectItem>
            {REWARD_TYPES.map((t) => <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {value.altRewardType !== '' && (
        <div className="space-y-1.5">
          <Label>Alternate reward value *</Label>
          <Input type="number" min="0" step="any" value={value.altRewardValue} onChange={(e) => set({ altRewardValue: e.target.value })} />
        </div>
      )}
    </div>
  );
}
