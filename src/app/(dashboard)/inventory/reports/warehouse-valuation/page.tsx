'use client';

import { formatCurrency } from '@/lib/utils';
import { SimpleInventoryReport } from '@/components/inventory/SimpleInventoryReport';

export default function WarehouseValuationPage() {
  return <SimpleInventoryReport title="Warehouse Valuation" description="Stock value by item and warehouse" endpoint="/inventory/reports/warehouse-valuation" columns={[
    { key: 'sku', header: 'SKU', render: (row: any) => <span className="font-mono text-xs">{row.sku}</span> },
    { key: 'productName', header: 'Item' },
    { key: 'warehouse', header: 'Warehouse' },
    { key: 'quantity', header: 'Qty' },
    { key: 'valuationRate', header: 'Rate', render: (row: any) => formatCurrency(row.valuationRate) },
    { key: 'stockValue', header: 'Value', render: (row: any) => formatCurrency(row.stockValue) },
  ]} />;
}
