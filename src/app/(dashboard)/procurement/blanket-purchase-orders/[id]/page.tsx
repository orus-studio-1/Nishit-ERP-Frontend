"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock, FileText, Package, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { showApiError, showApiSuccess } from "@/lib/apiError";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT:     { label: "Draft",     color: "bg-gray-100 text-gray-700 border-gray-200",   icon: Clock },
  SUBMITTED: { label: "Submitted", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200",       icon: XCircle },
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

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function currency(val: any, curr = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: curr, maximumFractionDigits: 2 }).format(Number(val) || 0);
}

export default function BPODetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bpo, setBpo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await api.get("/procurement/blanket-purchase-orders/" + id);
      setBpo(res.data?.data);
    } catch (err: any) { showApiError(err, "Failed to load BPO"); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  async function updateStatus(status: string) {
    const label = status === "SUBMITTED" ? "Submit" : "Cancel";
    if (!confirm(label + " this Blanket Purchase Order?")) return;
    try {
      setSaving(true);
      await api.patch("/procurement/blanket-purchase-orders/" + id + "/status", { status });
      showApiSuccess("BPO " + (status === "SUBMITTED" ? "submitted" : "cancelled") + " successfully");
      load();
    } catch (err: any) { showApiError(err, label + " failed"); } finally { setSaving(false); }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>;
  if (!bpo) return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-gray-500"><XCircle className="h-10 w-10" /><p>Not found.</p><Button variant="outline" onClick={() => router.back()}>Go back</Button></div>;

  const totalValue = (bpo.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity) * Number(item.rate), 0);
  const totalOrdered = (bpo.items || []).reduce((sum: number, item: any) => sum + Number(item.orderedQty || 0), 0);
  const isDraft = bpo.status === "DRAFT";
  const isSubmitted = bpo.status === "SUBMITTED";

  return (
    <div className="space-y-5 pb-10">

      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/procurement/blanket-purchase-orders" className="mb-2 inline-flex items-center text-xs text-gray-500 hover:text-gray-900">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />Blanket purchase orders
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{bpo.agreementNo}</h1>
            <StatusBadge status={bpo.status} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {bpo.supplier?.name} &middot; Valid {fmt(bpo.validFrom)} &rarr; {fmt(bpo.validTo)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          {!bpo.status.includes("CANCELLED") && (
            <Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-600 border-red-200" onClick={() => updateStatus("CANCELLED")} disabled={saving}>
              <XCircle className="mr-2 h-4 w-4" />Cancel
            </Button>
          )}
          {isDraft && (
            <Button onClick={() => updateStatus("SUBMITTED")} disabled={saving}>
              <CheckCircle2 className="mr-2 h-4 w-4" />Submit
            </Button>
          )}
        </div>
      </div>

      {/* ── SUMMARY STATS ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Line Items", (bpo.items || []).length],
          ["Agreement Value", currency(totalValue, bpo.currency)],
          ["POs Raised", (bpo.purchaseOrders || []).length],
          ["Currency", bpo.currency],
        ].map(([label, value], index) => (
          <Card key={String(label)}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── ITEMS TABLE ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package className="h-4 w-4" />Agreement Items</CardTitle>
          <CardDescription>Line items covered under this blanket purchase order.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Agreed Qty</th>
                <th className="px-4 py-3 text-right">Ordered Qty</th>
                <th className="px-4 py-3 text-right">Balance Qty</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Line Value</th>
                <th className="px-4 py-3">UOM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(bpo.items || []).map((item: any) => {
                const agreedQty = Number(item.quantity);
                const orderedQty = Number(item.orderedQty || 0);
                const balanceQty = agreedQty - orderedQty;
                const lineValue = agreedQty * Number(item.rate);
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 border-t">
                    <td className="px-4 py-3 font-medium">{item.product?.name || "—"}</td>
                    <td className="px-4 py-3 text-right">{agreedQty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-blue-700">{orderedQty.toLocaleString()}</td>
                    <td className={"px-4 py-3 text-right font-medium " + (balanceQty <= 0 ? "text-red-600" : "text-green-700")}>{balanceQty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{currency(item.rate, bpo.currency)}</td>
                    <td className="px-4 py-3 text-right font-medium">{currency(lineValue, bpo.currency)}</td>
                    <td className="px-4 py-3 text-gray-500">{item.uom || item.stockUom || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-100 bg-gray-50 font-semibold">
                <td className="px-4 py-3 text-gray-700">Total</td>
                <td className="px-4 py-3 text-right">{(bpo.items || []).reduce((s: number, i: any) => s + Number(i.quantity), 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-blue-700">{totalOrdered.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{((bpo.items || []).reduce((s: number, i: any) => s + Number(i.quantity), 0) - totalOrdered).toLocaleString()}</td>
                <td></td>
                <td className="px-4 py-3 text-right">{currency(totalValue, bpo.currency)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* ── LINKED PURCHASE ORDERS ── */}
      {(bpo.purchaseOrders || []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Linked Purchase Orders</CardTitle>
            <CardDescription>All purchase orders created against this agreement.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">PO #</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(bpo.purchaseOrders || []).map((po: any) => (
                  <tr key={po.id} className="border-t hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium">{po.orderNo}</td>
                    <td className="px-4 py-3">{po.supplier?.name || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                    <td className="px-4 py-3 text-right font-medium">{currency(po.grandTotal || po.netTotal || 0)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmt(po.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={"/procurement/purchase-orders/" + po.id} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <ExternalLink className="h-3 w-3" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── TERMS / NOTES ── */}
      {bpo.terms && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Terms / Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{bpo.terms}</p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}