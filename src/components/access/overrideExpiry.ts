// Helpers for temporary permission overrides: an override can carry an optional expiry date
// (it stops applying after that moment) and a reason. Dates are picked as calendar days and an
// override stays valid until the end of the chosen day in the admin's local time.

export type OverrideMeta = { expiresAt: string | null; reason: string };
export type StoredOverride = { permissionId: string; effect: 'ALLOW' | 'DENY'; expiresAt?: string | null; reason?: string | null; permission?: { key?: string; label?: string; module?: string; resource?: string; action?: string } };

export const EXPIRING_SOON_DAYS = 3;

export function isExpired(expiresAt?: string | null, now = Date.now()) {
  return Boolean(expiresAt) && new Date(expiresAt as string).getTime() <= now;
}

/** "2026-11-20" → ISO timestamp for 23:59:59 that day, local time. */
export function endOfDayIso(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 0).toISOString();
}

/** ISO timestamp → "YYYY-MM-DD" in local time, for <input type="date">. */
export function toDateInput(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayInput() {
  return toDateInput(new Date().toISOString());
}

export type ExpiryPreset = '1d' | '1w' | '1m' | 'never';
export const EXPIRY_PRESETS: { key: ExpiryPreset; label: string }[] = [
  { key: '1d', label: '1 day' },
  { key: '1w', label: '1 week' },
  { key: '1m', label: '1 month' },
  { key: 'never', label: 'Never' },
];

export function presetExpiry(preset: ExpiryPreset): string | null {
  if (preset === 'never') return null;
  const date = new Date();
  if (preset === '1d') date.setDate(date.getDate() + 1);
  if (preset === '1w') date.setDate(date.getDate() + 7);
  if (preset === '1m') date.setMonth(date.getMonth() + 1);
  return endOfDayIso(toDateInput(date.toISOString()));
}

export function formatExpiry(iso?: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export type OverrideStatus = { label: string; tone: 'active' | 'soon' | 'expired' };

export function overrideStatus(expiresAt?: string | null, now = Date.now()): OverrideStatus {
  if (!expiresAt) return { label: 'Active', tone: 'active' };
  if (new Date(expiresAt).getTime() <= now) return { label: 'Expired', tone: 'expired' };
  // Count calendar days (local time), so an override ending tomorrow says "tomorrow".
  const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const days = Math.round((startOfDay(new Date(expiresAt).getTime()) - startOfDay(now)) / 86_400_000);
  if (days <= EXPIRING_SOON_DAYS) return { label: days <= 0 ? 'Expires today' : days === 1 ? 'Expires tomorrow' : `Expires in ${days} days`, tone: 'soon' };
  return { label: `Active · ${days} days left`, tone: 'active' };
}

export function permissionName(permission?: StoredOverride['permission']) {
  if (!permission) return 'Unknown permission';
  const pretty = (s?: string) => String(s || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  if (permission.module && permission.resource && permission.action) return `${pretty(permission.module)} › ${pretty(permission.resource)} › ${pretty(permission.action.toLowerCase())}`;
  return permission.label || permission.key || 'Unknown permission';
}

/** Summary for the employee list, e.g. "2 (1 expiring soon)". */
export function overrideCountLabel(overrides: StoredOverride[] = [], now = Date.now()) {
  const active = overrides.filter((o) => !isExpired(o.expiresAt, now));
  const soon = active.filter((o) => overrideStatus(o.expiresAt, now).tone === 'soon').length;
  const expired = overrides.length - active.length;
  const extras = [soon ? `${soon} expiring soon` : '', expired ? `${expired} expired` : ''].filter(Boolean).join(', ');
  return `${active.length}${extras ? ` (${extras})` : ''}`;
}
