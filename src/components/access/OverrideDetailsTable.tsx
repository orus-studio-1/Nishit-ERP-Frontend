'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  EXPIRY_PRESETS, endOfDayIso, formatExpiry, overrideStatus, permissionName, presetExpiry, toDateInput, todayInput,
  type OverrideMeta, type StoredOverride,
} from './overrideExpiry';

type Permission = { id: string; key?: string; label?: string; module?: string; resource?: string; action?: string };

const toneClass = {
  active: 'border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]',
  soon: 'border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]',
  expired: 'border-[#e5e7eb] bg-[#f3f4f6] text-[#6b7280]',
};

function StatusPill({ expiresAt }: { expiresAt: string | null | undefined }) {
  const status = overrideStatus(expiresAt);
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneClass[status.tone]}`}>{status.label}</span>;
}

function EffectPill({ effect }: { effect: 'ALLOW' | 'DENY' }) {
  return effect === 'ALLOW'
    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-[#166534]"><span className="h-2 w-2 rounded-full bg-[#16a34a]" />Allow</span>
    : <span className="inline-flex items-center gap-1 text-xs font-medium text-[#991b1b]"><span className="h-2 w-2 rounded-full bg-[#dc2626]" />Deny</span>;
}

/**
 * The details for each direct permission override picked in the grid below it: when it expires
 * and why it was given. Expired overrides are listed separately as history; they never apply and
 * saving never brings them back.
 */
export function OverrideDetailsTable({
  permissions, allowed, denied, meta, onMetaChange, onRemove, expired, readOnly = false,
}: {
  permissions: Permission[];
  allowed: Set<string>;
  denied: Set<string>;
  meta: Record<string, OverrideMeta>;
  onMetaChange: (permissionId: string, patch: Partial<OverrideMeta>) => void;
  onRemove: (permissionId: string) => void;
  expired: StoredOverride[];
  readOnly?: boolean;
}) {
  const [showExpired, setShowExpired] = useState(false);
  const byId = new Map(permissions.map((p) => [p.id, p]));
  const rows = [
    ...[...allowed].map((id) => ({ id, effect: 'ALLOW' as const })),
    ...[...denied].map((id) => ({ id, effect: 'DENY' as const })),
  ].sort((a, b) => permissionName(byId.get(a.id)).localeCompare(permissionName(byId.get(b.id))));
  const visibleExpired = expired.filter((o) => !allowed.has(o.permissionId) && !denied.has(o.permissionId));
  const today = todayInput();

  return (
    <div className="mb-3 rounded-md border border-[#e5e2dc] bg-white">
      <div className="border-b border-[#f0ede8] px-3 py-2">
        <p className="text-sm font-semibold text-[#1f2937]">Selected overrides ({rows.length})</p>
        <p className="text-xs text-[#6b7280]">Set an expiry date for temporary access. The override switches off automatically at the end of that day.</p>
      </div>

      {rows.length === 0 ? (
        <p className="px-3 py-4 text-sm text-[#8a929d]">No overrides. Click <b>A</b> (Allow) or <b>D</b> (Deny) on a permission below to add one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#f8faf9] text-left text-xs text-[#6b7280]">
              <tr>
                <th className="px-3 py-2 font-medium">Permission</th>
                <th className="px-3 py-2 font-medium">Effect</th>
                <th className="px-3 py-2 font-medium">Expires on</th>
                <th className="px-3 py-2 font-medium">Reason</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ede8]">
              {rows.map(({ id, effect }) => {
                const row = meta[id] || { expiresAt: null, reason: '' };
                const permission = byId.get(id);
                return (
                  <tr key={id} className="align-top">
                    <td className="px-3 py-2">
                      <p className="font-medium text-[#1f2937]">{permissionName(permission)}</p>
                      {permission?.key && <p className="font-mono text-[11px] text-[#9ca3af]">{permission.key}</p>}
                    </td>
                    <td className="px-3 py-2"><EffectPill effect={effect} /></td>
                    <td className="px-3 py-2">
                      {readOnly ? <span className="text-sm">{formatExpiry(row.expiresAt)}</span> : (
                        <div className="space-y-1">
                          <Input
                            type="date"
                            className="h-8 w-40 text-xs"
                            min={today}
                            value={toDateInput(row.expiresAt)}
                            onChange={(event) => onMetaChange(id, { expiresAt: event.target.value ? endOfDayIso(event.target.value) : null })}
                            aria-label="Expiry date"
                          />
                          <div className="flex flex-wrap gap-1">
                            {EXPIRY_PRESETS.map((preset) => (
                              <button
                                key={preset.key}
                                type="button"
                                onClick={() => onMetaChange(id, { expiresAt: presetExpiry(preset.key) })}
                                className={`rounded border px-1.5 py-0.5 text-[11px] ${preset.key === 'never' && !row.expiresAt ? 'border-[#2490ef] bg-[#eef6fe] text-[#1674c4]' : 'border-[#d1d5db] bg-white text-[#4b5563] hover:border-[#2490ef]'}`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {readOnly ? <span className="text-sm text-[#4b5563]">{row.reason || '—'}</span> : (
                        <Input
                          className="h-8 min-w-48 text-xs"
                          placeholder="e.g. Covering for Priya"
                          maxLength={200}
                          value={row.reason}
                          onChange={(event) => onMetaChange(id, { reason: event.target.value })}
                          aria-label="Reason"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2"><StatusPill expiresAt={row.expiresAt} /></td>
                    <td className="px-2 py-2">
                      {!readOnly && (
                        <button type="button" onClick={() => onRemove(id)} className="rounded p-1 text-[#9ca3af] hover:bg-[#fee2e2] hover:text-[#991b1b]" title="Remove override" aria-label="Remove override">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {visibleExpired.length > 0 && (
        <div className="border-t border-[#f0ede8]">
          <button type="button" onClick={() => setShowExpired((v) => !v)} className="flex w-full items-center gap-1 px-3 py-2 text-left text-xs font-medium text-[#6b7280] hover:bg-[#f8faf9]">
            {showExpired ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Expired overrides ({visibleExpired.length}) — no longer apply
          </button>
          {showExpired && (
            <table className="w-full text-sm text-[#6b7280]">
              <tbody className="divide-y divide-[#f0ede8]">
                {visibleExpired.map((o) => (
                  <tr key={o.permissionId}>
                    <td className="px-3 py-2">{permissionName(o.permission || byId.get(o.permissionId))}</td>
                    <td className="px-3 py-2 text-xs">{o.effect === 'ALLOW' ? 'Allow' : 'Deny'}</td>
                    <td className="px-3 py-2 text-xs">Expired {formatExpiry(o.expiresAt)}</td>
                    <td className="px-3 py-2 text-xs">{o.reason || '—'}</td>
                    <td className="px-3 py-2"><StatusPill expiresAt={o.expiresAt} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {showExpired && !readOnly && <p className="px-3 pb-2 text-[11px] text-[#9ca3af]">To give this access again, click A or D on the permission below and set a new expiry date.</p>}
        </div>
      )}
    </div>
  );
}
