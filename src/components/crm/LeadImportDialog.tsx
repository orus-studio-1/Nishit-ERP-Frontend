'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

const sampleCsv = `firstName,lastName,email,phone,company,source,priority,value,notes
Ananya,Mehta,ananya@example.com,+919999999999,Acme Pvt Ltd,WEBSITE,HIGH,250000,Interested in ERP
Rahul,Sharma,rahul@example.com,+918888888888,Northwind,REFERRAL,MEDIUM,90000,Call next week`;

export function LeadImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const [csvText, setCsvText] = useState(sampleCsv);
  const [preview, setPreview] = useState<any[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const readFile = async (file?: File) => {
    if (!file) return;
    try {
      const content = await file.text();
      setCsvText(content);
      setPreview([]);
    } catch {
      toast.error('Failed to read CSV file');
    }
  };

  const runPreview = async () => {
    if (!csvText.trim()) {
      toast.error('Please paste or upload CSV data first');
      return;
    }
    setIsBusy(true);
    try {
      const res = await api.post('/crm/leads/import/preview', { csvText });
      setPreview(res.data?.data?.rows || []);
      showApiSuccess('CSV preview generated');
    } catch (err: any) {
      showApiError(err, 'CSV preview failed');
    } finally {
      setIsBusy(false);
    }
  };

  const runImport = async () => {
    if (!csvText.trim()) {
      toast.error('Please paste or upload CSV data first');
      return;
    }
    setIsBusy(true);
    try {
      const res = await api.post('/crm/leads/import', { csvText, fileName: 'leads.csv', duplicateMode: 'skip' });
      const data = res.data?.data || {};
      showApiSuccess(`${data.createdRows || 0} leads imported, ${data.duplicateRows || 0} duplicates skipped`);
      onOpenChange(false);
      onImported();
    } catch (err: any) {
      showApiError(err, 'Import failed');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input type="file" accept=".csv,text/csv" onChange={(event) => readFile(event.target.files?.[0])} />
            <Button type="button" variant="outline" onClick={() => setCsvText(sampleCsv)}>
              Use Sample
            </Button>
            <Button type="button" variant="outline" onClick={runPreview} disabled={isBusy}>
              Preview
            </Button>
            <Button type="button" onClick={runImport} disabled={isBusy}>
              <Upload className="mr-2 h-4 w-4" />
              {isBusy ? 'Importing...' : 'Import'}
            </Button>
          </div>
          <Textarea
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            rows={8}
            className="font-mono text-xs"
          />
          {!!preview.length && (
            <DataTable
              data={preview}
              columns={[
                { key: 'rowNo', header: 'Row' },
                {
                  key: 'name',
                  header: 'Lead',
                  render: (row: any) =>
                    `${row.normalized?.firstName || ''} ${row.normalized?.lastName || ''}`.trim() ||
                    row.normalized?.company ||
                    '-',
                },
                { key: 'email', header: 'Email', render: (row: any) => row.normalized?.email || '-' },
                { key: 'company', header: 'Company', render: (row: any) => row.normalized?.company || '-' },
                { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
                {
                  key: 'error',
                  header: 'Message',
                  render: (row: any) => row.error || row.duplicate?.title || '-',
                },
              ]}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
