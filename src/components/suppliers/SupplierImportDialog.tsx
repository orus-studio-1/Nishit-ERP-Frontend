'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/DataTable';

type PreviewRow = { rowNo: number; status: 'READY' | 'DUPLICATE' | 'ERROR'; message?: string; data: { name?: string; email?: string; phone?: string; taxId?: string; city?: string; paymentTerms?: number } };
type Summary = { totalRows: number; readyRows: number; duplicateRows: number; errorRows: number };
type Result = Summary & { createdRows: number; failedRows: number; failed: Array<{ rowNo: number; message: string }> };

const TEMPLATE_HEADERS = ['Name', 'Email', 'Phone', 'Address', 'City', 'State', 'Pincode', 'Country', 'GSTIN', 'PAN', 'Payment Terms', 'Currency', 'Bank Name', 'Bank Account', 'MSME', 'MSME Category', 'MSME Registration No', 'Notes'];
const TEMPLATE_EXAMPLE = ['Sharma Electricals Pvt Ltd', 'accounts@sharmaelectricals.in', '9876543210', '12 Industrial Estate', 'Pune', 'Maharashtra', '411019', 'India', '27ABCDE1234F1Z5', 'ABCDE1234F', '30', 'INR', 'HDFC Bank', '50100012345678', 'Yes', 'Small', 'UDYAM-MH-26-0012345', 'Cables and switchgear'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const statusStyle = {
  READY: 'border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]',
  DUPLICATE: 'border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]',
  ERROR: 'border-[#fecaca] bg-[#fef2f2] text-[#991b1b]',
};
const statusLabel = { READY: 'Ready', DUPLICATE: 'Duplicate', ERROR: 'Error' };

function downloadTemplate() {
  const quote = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE].map((row) => row.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'supplier-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

/** Upload a CSV of suppliers, check every row on the server, then import the rows that passed. */
export function SupplierImportDialog({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (open: boolean) => void; onImported: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState<'preview' | 'import' | null>(null);

  const reset = () => { setFileName(''); setCsvText(''); setSummary(null); setRows([]); setResult(null); if (fileInput.current) fileInput.current.value = ''; };
  const close = (next: boolean) => { if (busy) return; if (!next) reset(); onOpenChange(next); };

  const preview = async (text: string) => {
    setBusy('preview');
    try {
      const res = await api.post('/suppliers/import/preview', { csvText: text });
      const data = res.data?.data;
      setSummary({ totalRows: data.totalRows, readyRows: data.readyRows, duplicateRows: data.duplicateRows, errorRows: data.errorRows });
      setRows(data.rows || []);
    } catch (err) {
      setSummary(null); setRows([]);
      showApiError(err, 'Could not read the CSV file');
    } finally {
      setBusy(null);
    }
  };

  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) return toast.error('Choose a .csv file. In Excel, use File → Save As → CSV.');
    if (file.size > MAX_FILE_BYTES) return toast.error('The file is larger than 5 MB. Split it into smaller files.');
    try {
      const text = await file.text();
      setFileName(file.name); setCsvText(text); setResult(null);
      await preview(text);
    } catch {
      toast.error('Could not read the file');
    }
  };

  const runImport = async () => {
    setBusy('import');
    try {
      const res = await api.post('/suppliers/import', { csvText, fileName });
      setResult(res.data?.data);
      showApiSuccess(res.data?.message || 'Suppliers imported');
      onImported();
    } catch (err) {
      showApiError(err, 'Import failed');
    } finally {
      setBusy(null);
    }
  };

  const columns = [
    { key: 'rowNo', header: 'Row', render: (r: PreviewRow) => <span className="text-xs text-[#6b7280]">{r.rowNo}</span> },
    { key: 'name', header: 'Supplier', render: (r: PreviewRow) => <span className="font-medium">{r.data?.name || '—'}</span> },
    { key: 'gstin', header: 'GSTIN', render: (r: PreviewRow) => <span className="font-mono text-xs">{r.data?.taxId || '—'}</span> },
    { key: 'contact', header: 'Email / Phone', render: (r: PreviewRow) => <span className="text-xs">{[r.data?.email, r.data?.phone].filter(Boolean).join(' · ') || '—'}</span> },
    { key: 'status', header: 'Status', render: (r: PreviewRow) => <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyle[r.status]}`}>{statusLabel[r.status]}</span> },
    { key: 'message', header: 'Details', render: (r: PreviewRow) => <span className="text-xs text-[#4b5563]">{r.message || '—'}</span> },
  ];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import suppliers from CSV</DialogTitle>
          <DialogDescription>Upload a CSV file. Every row is checked first; only new, valid suppliers are imported. Duplicates and rows with errors are skipped.</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#16a34a]" />
              <div className="text-sm">
                <p className="font-semibold text-[#166534]">{result.createdRows} supplier(s) imported</p>
                <p className="mt-1 text-[#4b5563]">
                  {result.duplicateRows} duplicate(s) skipped · {result.errorRows} row(s) with errors skipped{result.failedRows ? ` · ${result.failedRows} could not be saved` : ''}
                </p>
                {!!result.failed?.length && <p className="mt-1 text-xs text-[#991b1b]">Not saved: {result.failed.map((f) => `row ${f.rowNo} (${f.message})`).join(', ')}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Import another file</Button>
              <Button onClick={() => close(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-[#e5e2dc] p-3">
                <p className="text-sm font-semibold text-[#1f2937]">1. Get the template</p>
                <p className="mt-1 text-xs leading-5 text-[#6b7280]">Only <b>Name</b> is required. GSTIN, PAN, email, phone, address, payment terms (days), bank details and MSME are optional.</p>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" />Download template</Button>
              </div>
              <div className="rounded-lg border border-[#e5e2dc] p-3">
                <p className="text-sm font-semibold text-[#1f2937]">2. Upload your file</p>
                <p className="mt-1 text-xs leading-5 text-[#6b7280]">CSV only, up to 2,000 suppliers and 5 MB. From Excel: File → Save As → CSV (UTF-8).</p>
                <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void chooseFile(e.target.files?.[0])} />
                <Button type="button" size="sm" className="mt-2" disabled={busy !== null} onClick={() => fileInput.current?.click()}>
                  {busy === 'preview' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                  {fileName ? 'Choose a different file' : 'Choose CSV file'}
                </Button>
                {fileName && <p className="mt-1 truncate text-xs text-[#4b5563]">{fileName}</p>}
              </div>
            </div>

            {summary && (
              <>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border px-2.5 py-1">{summary.totalRows} row(s)</span>
                  <span className={`rounded-full border px-2.5 py-1 ${statusStyle.READY}`}>{summary.readyRows} ready to import</span>
                  <span className={`rounded-full border px-2.5 py-1 ${statusStyle.DUPLICATE}`}>{summary.duplicateRows} duplicate(s)</span>
                  <span className={`rounded-full border px-2.5 py-1 ${statusStyle.ERROR}`}>{summary.errorRows} with errors</span>
                </div>
                <DataTable data={rows} columns={columns} pageSize={10} />
                <div className="flex items-center justify-between gap-2 border-t pt-3">
                  <p className="text-xs text-[#6b7280]">{summary.readyRows ? `${summary.readyRows} new supplier(s) will be created with the next supplier numbers.` : 'Nothing to import. Fix the errors in your file and choose it again.'}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={busy !== null} onClick={() => close(false)}>Cancel</Button>
                    <Button disabled={busy !== null || !summary.readyRows} onClick={() => void runImport()}>
                      {busy === 'import' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Import {summary.readyRows || ''} supplier(s)
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
