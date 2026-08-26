'use client';

const actions = ['READ', 'CREATE', 'WRITE', 'DELETE', 'SUBMIT', 'CANCEL', 'AMEND', 'APPROVE', 'PRINT', 'REPORT', 'EXPORT', 'IMPORT', 'MANAGE'];

function groupedPermissions(permissions: any[]) {
  return permissions.reduce((acc: Record<string, any[]>, permission) => {
    acc[permission.module] = acc[permission.module] || [];
    acc[permission.module].push(permission);
    return acc;
  }, {});
}

function toggleSet(set: Set<string>, id: string) {
  const next = new Set(set);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
}

export function PermissionMatrix({
  permissions,
  allowed,
  denied,
  onAllow,
  onDeny,
  readOnly = false,
}: {
  permissions: any[];
  allowed: Set<string>;
  denied: Set<string>;
  onAllow: (id: string) => void;
  onDeny: (id: string) => void;
  readOnly?: boolean;
}) {
  const grouped = groupedPermissions(permissions);
  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([module, rows]) => (
        <div key={module} className="rounded-md border border-[#e5e2dc] bg-white">
          <div className="border-b border-[#f0ede8] px-3 py-2">
            <p className="text-sm font-semibold capitalize text-[#1f2937]">{module.replace(/-/g, ' ')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#f8faf9] text-[#6b7280]">
                <tr>
                  <th className="min-w-40 px-3 py-2 text-left">Resource</th>
                  {actions.map((action) => <th key={action} className="px-2 py-2 text-center">{action}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ede8]">
                {Array.from(new Set(rows.map((r) => r.resource))).map((resource) => (
                  <tr key={resource}>
                    <td className="px-3 py-2 font-medium text-[#374151]">{String(resource).replace(/-/g, ' ')}</td>
                    {actions.map((action) => {
                      const permission = rows.find((r) => r.resource === resource && r.action === action);
                      if (!permission) return <td key={action} className="px-2 py-2 text-center text-[#d1d5db]">-</td>;
                      const isAllowed = allowed.has(permission.id);
                      const isDenied = denied.has(permission.id);
                      return (
                        <td key={action} className="px-2 py-2 text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() => onAllow(permission.id)}
                              className={`h-5 w-5 rounded border text-[10px] disabled:cursor-default ${isAllowed ? 'border-[#16a34a] bg-[#dcfce7] text-[#166534]' : 'border-[#d1d5db] bg-white text-[#9ca3af]'}`}
                              title="Allow"
                            >
                              A
                            </button>
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() => onDeny(permission.id)}
                              className={`h-5 w-5 rounded border text-[10px] disabled:cursor-default ${isDenied ? 'border-[#dc2626] bg-[#fee2e2] text-[#991b1b]' : 'border-[#d1d5db] bg-white text-[#9ca3af]'}`}
                              title="Deny"
                            >
                              D
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
