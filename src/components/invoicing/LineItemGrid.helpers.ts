export interface LineItemRow {
  id?: string;
  productId: string;
  itemCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxTemplateId?: string;
  taxTemplateName?: string;
  taxRate: number;
  total: number;
}

export interface ProductOption {
  id: string;
  sku: string;
  name: string;
  salePrice: number;
  taxRate: number;
  defaultTaxTemplateId?: string | null;
  defaultTaxTemplate?: { id: string; name: string; code: string; lines?: { rate: number }[] } | null;
  unitId?: string | null;
}

export const blankRow = (): LineItemRow => ({
  productId: '',
  itemCode: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  taxRate: 0,
  total: 0,
});

export function computeRow(row: LineItemRow): LineItemRow {
  const quantity = Number(row.quantity) || 0;
  const unitPrice = Number(row.unitPrice) || 0;
  const discount = Number(row.discount) || 0;
  const taxRate = Number(row.taxRate) || 0;
  const net = quantity * unitPrice * (1 - discount / 100);
  const tax = net * (taxRate / 100);
  return { ...row, total: Number((net + tax).toFixed(2)) };
}

export function calculateLineSummary(rows: LineItemRow[]) {
  return rows.reduce(
    (acc, row) => {
      const quantity = Number(row.quantity) || 0;
      const unitPrice = Number(row.unitPrice) || 0;
      const discount = Number(row.discount) || 0;
      const taxRate = Number(row.taxRate) || 0;
      const gross = quantity * unitPrice;
      const discountAmount = gross * (discount / 100);
      const net = gross - discountAmount;
      const tax = net * (taxRate / 100);
      acc.subtotal += net;
      acc.discount += discountAmount;
      acc.taxAmount += tax;
      acc.total += net + tax;
      return acc;
    },
    { subtotal: 0, discount: 0, taxAmount: 0, total: 0 }
  );
}
