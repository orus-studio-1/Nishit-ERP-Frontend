'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FilePlus2, Shuffle } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/shared/DataTable';
import { Opportunity } from '@/types';
import { Info, TimelineCard } from '@/components/crm/CrmDetailBlocks';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';

const stages = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [createSalesOrder, setCreateSalesOrder] = useState(false);
  const [isGeneratingErp, setIsGeneratingErp] = useState(false);

  const load = async () => {
    try {
      const res = await api.get(`/crm/opportunities/${params.id}`);
      setOpp(res.data?.data || null);
    } catch (err: any) {
      showApiError(err, 'Failed to load opportunity details');
    }
  };

  useEffect(() => {
    load();
  }, [params.id]);

  const moveStage = async (stage: string) => {
    try {
      await api.patch(`/crm/opportunities/${params.id}`, { stage });
      showApiSuccess(`Stage updated to ${stage.replace('_', ' ')}`);
      load();
    } catch (err: any) {
      showApiError(err, 'Stage update failed');
    }
  };

  const createErpDocs = async () => {
    if (isGeneratingErp) return;
    setIsGeneratingErp(true);
    try {
      await api.post(`/crm/opportunities/${params.id}/create-erp-docs`, { createSalesOrder });
      showApiSuccess('ERP documents created and linked successfully');
      load();
    } catch (err: any) {
      showApiError(err, 'ERP document creation failed');
    } finally {
      setIsGeneratingErp(false);
    }
  };

  if (!opp) return <div className="h-40 animate-pulse rounded bg-[#f7f8fa]" />;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/crm/opportunities')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to opportunities
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#1f2937]">{opp.title}</h1>
          <p className="text-sm text-[#6b7280]">
            {formatCurrency(opp.value, opp.currency)} · {opp.probability}% probability
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={opp.stage} />
          <StatusBadge status={opp.erpSyncStatus || 'NOT_SYNCED'} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Opportunity Profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Info label="Stage">
                <StatusBadge status={opp.stage} />
              </Info>
              <Info label="Expected Close">{opp.expectedClose ? formatDateTime(opp.expectedClose) : '-'}</Info>
              <Info label="Value">{formatCurrency(opp.value, opp.currency)}</Info>
              <Info label="Source Lead">
                {opp.lead ? (
                  <Link className="text-[#1674c4] hover:underline" href={`/crm/leads/${opp.lead.id}`}>
                    {opp.lead.firstName} {opp.lead.lastName}
                  </Link>
                ) : (
                  '-'
                )}
              </Info>
              <Info label="Contact">
                {opp.contact ? (
                  <Link className="text-[#1674c4] hover:underline" href={`/crm/contacts/${opp.contact.id}`}>
                    {opp.contact.firstName} {opp.contact.lastName}
                  </Link>
                ) : (
                  '-'
                )}
              </Info>
              <Info label="Organization">
                {opp.organization ? (
                  <Link
                    className="text-[#1674c4] hover:underline"
                    href={`/crm/organizations/${opp.organization.id}`}
                  >
                    {opp.organization.name}
                  </Link>
                ) : (
                  '-'
                )}
              </Info>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={opp.items || []}
                columns={[
                  {
                    key: 'itemCode',
                    header: 'Item',
                    render: (item: any) => item.itemCode || item.product?.sku || '-',
                  },
                  { key: 'description', header: 'Description' },
                  { key: 'quantity', header: 'Qty', render: (item: any) => Number(item.quantity || 0) },
                  {
                    key: 'rate',
                    header: 'Rate',
                    render: (item: any) => formatCurrency(Number(item.rate || 0), opp.currency),
                  },
                  {
                    key: 'amount',
                    header: 'Amount',
                    render: (item: any) => formatCurrency(Number(item.amount || 0), opp.currency),
                  },
                ]}
              />
            </CardContent>
          </Card>

          <TimelineCard activities={opp.activities} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stage Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={opp.stage} onValueChange={moveStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" className="w-full" onClick={() => moveStage('CLOSED_WON')}>
                <Shuffle className="mr-2 h-4 w-4" />
                Mark Won
              </Button>
              <Button variant="outline" className="w-full" onClick={() => moveStage('CLOSED_LOST')}>
                Mark Lost
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ERP Chain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Info label="Customer">
                {opp.customer ? (
                  <Link className="text-[#1674c4] hover:underline" href={`/customers/${opp.customer.id}`}>
                    {opp.customer.customerNo} · {opp.customer.name}
                  </Link>
                ) : (
                  '-'
                )}
              </Info>
              <Info label="Quotation">
                {opp.quotation ? (
                  <Link className="text-[#1674c4] hover:underline" href="/sales/quotations">
                    {opp.quotation.quotationNo}
                  </Link>
                ) : (
                  '-'
                )}
              </Info>
              <Info label="Sales Order">
                {opp.salesOrder ? (
                  <Link className="text-[#1674c4] hover:underline" href="/sales/orders">
                    {opp.salesOrder.orderNo}
                  </Link>
                ) : (
                  '-'
                )}
              </Info>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createSalesOrder}
                  onChange={(e) => setCreateSalesOrder(e.target.checked)}
                />
                Also create Sales Order
              </label>
              <Button
                className="w-full"
                onClick={createErpDocs}
                disabled={opp.stage !== 'CLOSED_WON' || isGeneratingErp}
              >
                <FilePlus2 className="mr-2 h-4 w-4" />
                {isGeneratingErp ? 'Creating ERP Docs...' : 'Create ERP Documents'}
              </Button>
              {opp.stage !== 'CLOSED_WON' && (
                <p className="text-xs text-[#8a929d]">
                  Mark the opportunity as won before creating ERP documents.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
