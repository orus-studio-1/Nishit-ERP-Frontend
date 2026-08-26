'use client';

import { formatCurrency } from '@/lib/utils';
import { SimpleInventoryReport } from '@/components/inventory/SimpleInventoryReport';

export default function ItemWiseSalesPage() {
  return <SimpleInventoryReport title="Item-wise Sales" description="Submitted invoice sales by item with cost and gross profit" endpoint="/inventory/reports/item-wise-sales" columns={[
    { key: 'sku', header: 'SKU', render: (row: any) => <span className="font-mono text-xs">{row.sku}</span> },
    { key: 'productName', header: 'Item' },
    { key: 'quantity', header: 'Qty' },
    { key: 'revenue', header: 'Revenue', render: (row: any) => formatCurrency(row.revenue) },
    { key: 'cost', header: 'Cost', render: (row: any) => formatCurrency(row.cost) },
    { key: 'grossProfit', header: 'Gross Profit', render: (row: any) => formatCurrency(row.grossProfit) },
  ]} />;
}
