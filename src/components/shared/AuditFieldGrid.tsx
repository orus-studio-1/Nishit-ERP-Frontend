import { fieldLabel, formatFieldScalar, prettyJson } from '@/lib/auditDiff';

const isScalar = (value: unknown) => value === null || ['string', 'number', 'boolean'].includes(typeof value);

/** Renders one field value: scalars as text, lists of plain values (e.g. role names) as chips,
 * anything deeper as a compact JSON hint. */
function FieldValue({ name, value }: { name: string; value: unknown }) {
  if (Array.isArray(value) && value.every(isScalar)) {
    if (!value.length) return <p className="text-sm text-gray-400">None</p>;
    return (
      <div className="mt-0.5 flex flex-wrap gap-1">
        {value.map((item, index) => (
          <span key={`${String(item)}-${index}`} className="rounded-md border border-[#dfe3e8] bg-[#f8faf9] px-2 py-0.5 text-xs font-medium text-gray-800">{formatFieldScalar(name, item)}</span>
        ))}
      </div>
    );
  }
  if (value !== null && typeof value === 'object') {
    return <p className="truncate font-mono text-xs text-gray-700" title={prettyJson(value)}>{Array.isArray(value) ? `${value.length} item(s)` : 'Nested object'}</p>;
  }
  return <p className="wrap-break-word text-sm font-medium text-gray-900">{formatFieldScalar(name, value)}</p>;
}

/** Renders a flat object (an audit event's before/after/diff snapshot) as a readable field/value
 * grid. Shared by every audit-log view in the app. */
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
          <FieldValue name={key} value={val} />
        </div>
      ))}
    </div>
  );
}

/** Side-by-side "Previous → New" table of only the fields that differ between two snapshots.
 * Renders nothing when either side is missing or nothing differs. */
export function AuditChangesTable({ before, after, title }: { before: unknown; after: unknown; title?: string }) {
  const isRecord = (v: unknown): v is Record<string, unknown> => v != null && typeof v === 'object' && !Array.isArray(v);
  if (!isRecord(before) || !isRecord(after)) return null;
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((field) => field in before && field in after && prettyJson(before[field]) !== prettyJson(after[field]));
  if (!fields.length) return null;
  return (
    <div>
    {title && <p className="text-sm font-medium leading-none">{title}</p>}
    <div className="mt-1 overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-[#f8faf9] text-left text-xs text-gray-500">
          <tr><th className="px-3 py-2 font-medium">Field</th><th className="px-3 py-2 font-medium">Previous</th><th className="px-3 py-2 font-medium">New</th></tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field} className="border-t align-top">
              <td className="px-3 py-2 text-xs font-medium text-gray-600">{fieldLabel(field)}</td>
              <td className="px-3 py-2"><div className="rounded bg-red-50/60 px-1.5 py-0.5"><FieldValue name={field} value={before[field]} /></div></td>
              <td className="px-3 py-2"><div className="rounded bg-green-50/70 px-1.5 py-0.5"><FieldValue name={field} value={after[field]} /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}
