// Pure helpers for the Tally Integration page (kept dependency-free so they can be unit tested).

export interface SyncGateInput {
  savedCompany: string | null | undefined;
  isOnline: boolean;
  tallyReachable: boolean;
}

/** Why Start Sync is unavailable, or null when it may proceed. Order matches the UI priority. */
export function getSyncBlockReason({ savedCompany, isOnline, tallyReachable }: SyncGateInput): string | null {
  if (!savedCompany || !savedCompany.trim()) return 'Select a Tally company first.';
  if (!isOnline) return 'The Tally Agent is offline.';
  if (!tallyReachable) return 'Tally is not reachable.';
  return null;
}

export interface DateRangeResult {
  valid: boolean;
  message: string;
  from?: string; // YYYYMMDD
  to?: string; // YYYYMMDD
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Validates two <input type="date"> values (YYYY-MM-DD) and returns them as YYYYMMDD. */
export function validateSyncDateRange(fromDate: string, toDate: string): DateRangeResult {
  if (!fromDate || !toDate) return { valid: false, message: 'Please select both dates' };
  const f = ISO_DATE.exec(fromDate);
  const t = ISO_DATE.exec(toDate);
  if (!f || !t) return { valid: false, message: 'Dates must be valid' };
  const fromMs = Date.UTC(+f[1], +f[2] - 1, +f[3]);
  const toMs = Date.UTC(+t[1], +t[2] - 1, +t[3]);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return { valid: false, message: 'Dates must be valid' };
  if (fromMs > toMs) return { valid: false, message: 'From date cannot be after To date' };
  // Inclusive one-year limit: same calendar day one year after the start date.
  if (toMs > Date.UTC(+f[1] + 1, +f[2] - 1, +f[3])) return { valid: false, message: 'Date range cannot exceed 1 year' };
  return { valid: true, message: '', from: fromDate.replace(/-/g, ''), to: toDate.replace(/-/g, '') };
}

const TECHNICAL_ERROR = /prisma|invocation|sqlstate|violates|constraint|\bselect\b.*\bfrom\b|\n\s+at\s|\bP\d{4}\b|unique constraint/i;

export interface ErrorSummary {
  short: string;
  full: string;
  isLong: boolean;
}

/** Short one-line text for tables; the full text stays available for an expand/tooltip. */
export function summarizeSyncError(message: string | null | undefined): ErrorSummary | null {
  const full = (message ?? '').trim();
  if (!full) return null;
  if (TECHNICAL_ERROR.test(full)) {
    return { short: 'Internal error while saving data. Expand for details.', full, isLong: true };
  }
  const firstLine = full.split(/\r?\n/)[0].trim();
  const MAX = 80;
  const short = firstLine.length > MAX ? `${firstLine.slice(0, MAX - 1).trimEnd()}…` : firstLine;
  return { short, full, isLong: short !== full };
}
