import { fieldLabel, formatFieldScalar, prettyJson } from '@/lib/auditDiff';

/** Renders a flat object (an audit event's before/after/diff snapshot) as a readable field/value
 * grid; nested objects/arrays fall back to inline JSON since audit diffs are usually one level of
 * scalars (line items are the exception). Shared by every audit-log view in the app. */
export function AuditFieldGrid({ value }: { value: unknown }) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return <pre className="mt-1 max-h-72 overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-100">{prettyJson(value)}</pre>;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) return <p className="mt-1 text-sm text-gray-500">No fields recorded.</p>;
  return (
    <div className="mt-1 grid gap-x-6 gap-y-2 rounded-lg border bg-white p-3 sm:grid-cols-2">
      {entries.map(([key, val]) => (
        <div key={key} className="min-w-0">
          <p className="text-xs text-gray-500">{fieldLabel(key)}</p>
          {val !== null && typeof val === 'object'
            ? <p className="truncate font-mono text-xs text-gray-700" title={prettyJson(val)}>{Array.isArray(val) ? `${val.length} item(s)` : 'Nested object'}</p>
            : <p className="break-words text-sm font-medium text-gray-900">{formatFieldScalar(key, val)}</p>}
        </div>
      ))}
    </div>
  );
}
