// Shared helpers for rendering audit-log before/after/diff values. Used by the main Audit Trail
// page, the Procurement Audit Trail page, and any inline audit history view (e.g. a Sales Case's
// Audit History tab) so there's one place that decides how a changed record is displayed.

export const prettyJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

/** Shortens a value for compact display (e.g. a table cell): objects/arrays are JSON-stringified
 * and long strings are truncated. */
export function compactValue(value: unknown): string {
  if (value == null) return '—';
  const text = typeof value === 'string' ? value : prettyJson(value);
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

/** Diffs two flat records (before/after, or before/submitted-changes when there's no "after" yet)
 * and returns only the fields whose value actually changed, each formatted for display. */
export function changedFields(before: unknown, after: unknown, submitted?: unknown): FieldChange[] {
  const oldRow = before && typeof before === 'object' && !Array.isArray(before) ? (before as Record<string, unknown>) : {};
  const newRow = after && typeof after === 'object' && !Array.isArray(after)
    ? (after as Record<string, unknown>)
    : submitted && typeof submitted === 'object' && !Array.isArray(submitted)
      ? (submitted as Record<string, unknown>)
      : {};
  return [...new Set([...Object.keys(oldRow), ...Object.keys(newRow)])]
    .filter((field) => prettyJson(oldRow[field]) !== prettyJson(newRow[field]))
    .slice(0, 100)
    .map((field) => ({ field, before: compactValue(oldRow[field]), after: compactValue(newRow[field]) }));
}

const fieldLabel = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase());
const looksLikeDate = (key: string, value: string) => /(date|at)$/i.test(key) && !Number.isNaN(Date.parse(value));

/** Formats one scalar field value for the readable field/value grid (dates, numbers, booleans). */
export function formatFieldScalar(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isInteger(value) ? value.toLocaleString('en-IN') : value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  if (typeof value === 'string' && looksLikeDate(key, value)) return new Date(value).toLocaleString('en-IN');
  return String(value);
}

export { fieldLabel };
