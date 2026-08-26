'use client';

import { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LeadImportDialog } from '@/components/crm/LeadImportDialog';
import { LeadImportBatch } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { showApiError } from '@/lib/apiError';

export default function LeadImportsPage() {
  const [imports, setImports] = useState<LeadImportBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/crm/leads/imports');
      setImports(res.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load lead imports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Lead Imports"
        description="Audit CSV imports, duplicate skips, and failed rows"
        action={{ label: 'Import Leads', onClick: () => setOpen(true), icon: Upload }}
      />
      {imports.length === 0 && !isLoading ? (
        <EmptyState
          icon={Upload}
          title="No import history"
          description="Import leads from CSV spreadsheets to quickly seed your sales pipeline."
          action={{ label: 'Import Leads', onClick: () => setOpen(true) }}
        />
      ) : (
        <DataTable
          data={imports}
          isLoading={isLoading}
          columns={[
            { key: 'fileName', header: 'File' },
            {
              key: 'status',
              header: 'Status',
              render: (row: LeadImportBatch) => <StatusBadge status={row.status} />,
            },
            { key: 'totalRows', header: 'Rows' },
            { key: 'createdRows', header: 'Created' },
            { key: 'duplicateRows', header: 'Duplicates' },
            { key: 'failedRows', header: 'Failed' },
            {
              key: 'createdAt',
              header: 'Imported',
              render: (row: LeadImportBatch) => formatDateTime(row.createdAt),
            },
          ]}
        />
      )}
      <LeadImportDialog open={open} onOpenChange={setOpen} onImported={load} />
    </div>
  );
}
