"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Clock, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { showApiError, showApiSuccess } from "@/lib/apiError";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  ACCEPTED: { label: "Accepted", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  PARTIALLY_ACCEPTED: { label: "Partially Accepted", color: "bg-blue-100 text-blue-800 border-blue-200", icon: AlertCircle },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-700 border-gray-200", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold " + cfg.color}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

export default function QualityInspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [qi, setQi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ acceptedQty: "", rejectedQty: "", remarks: "", certificateNo: "", deviationReason: "" });

  async function load() {
    try {
      setLoading(true);
      const res = await api.get("/procurement/quality-inspections/" + id);
      const data = res.data?.data;
      setQi(data);
      setForm({
        acceptedQty: data.acceptedQty || data.inspectedQty,
        rejectedQty: data.rejectedQty || "0",
        remarks: data.remarks || "",
        certificateNo: data.certificateNo || "",
        deviationReason: data.deviationReason || ""
      });
    } catch (err: any) { showApiError(err, "Failed to load QI"); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  async function updateStatus(status: string) {
    if (!confirm("Confirm decision: " + STATUS_CONFIG[status]?.label + "? This cannot be undone.")) return;
    try {
      setSaving(true);
      await api.patch("/procurement/quality-inspections/" + id, { status, ...form });
      showApiSuccess("Quality inspection updated successfully");
      load();
    } catch (err: any) { showApiError(err, "Update failed"); } finally { setSaving(false); }
  }

  async function saveNotes() {
    try {
      setSaving(true);
      await api.patch("/procurement/quality-inspections/" + id, form);
      showApiSuccess("Notes saved successfully");
      load();
    } catch (err: any) { showApiError(err, "Failed to save notes"); } finally { setSaving(false); }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>;
  if (!qi) return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-gray-500"><XCircle className="h-10 w-10" /><p>Not found.</p><Button variant="outline" onClick={() => router.back()}>Go back</Button></div>;

  const isPending = qi.status === "PENDING";
  const supplier = qi.purchaseReceipt?.purchaseOrder?.supplier;

  return (
    <div className="space-y-5 pb-10">
      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/procurement/quality-inspections" className="mb-2 inline-flex items-center text-xs text-gray-500 hover:text-gray-900">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />Quality inspections
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{qi.inspectionNo}</h1>
            <StatusBadge status={qi.status} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Created {new Date(qi.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inspection Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Product</p>
                <p className="text-sm font-medium">{qi.product?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Purchase Receipt</p>
                <p className="text-sm font-medium">{qi.purchaseReceipt?.receiptNo || "—"}</p>
              </div>
              {supplier && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Supplier</p>
                  <p className="text-sm font-medium">{supplier.name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 uppercase">Status</p>
                <div className="mt-1"><StatusBadge status={qi.status} /></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quantities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-white p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-gray-900">{Number(qi.inspectedQty)}</p>
                <p className="text-xs text-gray-500 mt-1">Inspected</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-green-700">{Number(qi.acceptedQty)}</p>
                <p className="text-xs text-green-600 mt-1">Accepted</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-red-700">{Number(qi.rejectedQty)}</p>
                <p className="text-xs text-red-600 mt-1">Rejected</p>
              </div>
            </div>
            {isPending && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label className="text-xs">Accepted Qty</Label>
                  <Input type="number" min="0" step="any" value={form.acceptedQty} onChange={e => setForm({ ...form, acceptedQty: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rejected Qty</Label>
                  <Input type="number" min="0" step="any" value={form.rejectedQty} onChange={e => setForm({ ...form, rejectedQty: e.target.value })} className="h-9" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notes and Certificate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Certificate No.</Label>
              <Input placeholder="CERT-2026-001" value={form.certificateNo} onChange={e => setForm({ ...form, certificateNo: e.target.value })} disabled={!isPending} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deviation Reason</Label>
              <Input placeholder="Reason for partial / reject" value={form.deviationReason} onChange={e => setForm({ ...form, deviationReason: e.target.value })} disabled={!isPending} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Inspector Remarks</Label>
            <Textarea placeholder="Observations, quality parameters..." value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={3} disabled={!isPending} />
          </div>
          {isPending && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={saveNotes} disabled={saving}>Save Notes</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isPending && (
        <Card>
          <CardHeader>
            <CardTitle>Decision</CardTitle>
            <CardDescription>Once a decision is made, the status cannot be reverted to Pending.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus("ACCEPTED")} disabled={saving}>
                <CheckCircle2 className="mr-2 h-4 w-4" />Accept All
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => updateStatus("PARTIALLY_ACCEPTED")} disabled={saving}>
                <AlertCircle className="mr-2 h-4 w-4" />Partially Accept
              </Button>
              <Button variant="destructive" onClick={() => updateStatus("REJECTED")} disabled={saving}>
                <XCircle className="mr-2 h-4 w-4" />Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isPending && (
        <Card className={qi.status === "ACCEPTED" ? "border-green-200 bg-green-50" : qi.status === "REJECTED" ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              {qi.status === "ACCEPTED" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {qi.status === "REJECTED" && <XCircle className="h-5 w-5 text-red-600" />}
              {qi.status === "PARTIALLY_ACCEPTED" && <AlertCircle className="h-5 w-5 text-blue-600" />}
              <p className="font-semibold text-gray-900">Inspection {STATUS_CONFIG[qi.status]?.label}</p>
            </div>
            {qi.remarks && <p className="mt-2 text-sm text-gray-700"><span className="font-medium">Remarks:</span> {qi.remarks}</p>}
            {qi.deviationReason && <p className="mt-1 text-sm text-gray-700"><span className="font-medium">Deviation:</span> {qi.deviationReason}</p>}
            {qi.certificateNo && <p className="mt-1 text-sm text-gray-700"><span className="font-medium">Certificate:</span> {qi.certificateNo}</p>}
          </CardContent>
        </Card>
      )}

    </div>
  );
}