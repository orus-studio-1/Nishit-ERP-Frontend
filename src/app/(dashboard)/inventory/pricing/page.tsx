'use client';

import { useEffect, useState } from 'react';
import { Plus, Tags } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { ItemPrice, PriceList, PricingRule, Product } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { CurrencySelect } from '@/components/ui/currency-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';

export default function InventoryPricingPage() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [itemPrices, setItemPrices] = useState<ItemPrice[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingPL, setIsSubmittingPL] = useState(false);
  const [isSubmittingIP, setIsSubmittingIP] = useState(false);
  const [isSubmittingRule, setIsSubmittingRule] = useState(false);

  const [priceListForm, setPriceListForm] = useState({ name: '', currency: 'INR' });
  const [itemPriceForm, setItemPriceForm] = useState({ productId: '', priceListId: '', currency: 'INR', price: '' });
  const [ruleForm, setRuleForm] = useState({
    name: '',
    priceListId: '',
    productId: '',
    minQty: '',
    discountPercent: '',
    marginPercent: '',
    priority: '100',
  });

  const load = async () => {
    setIsLoading(true);
    try {
      const [pl, ip, rulesRes, prod] = await Promise.all([
        api.get('/inventory/price-lists'),
        api.get('/inventory/item-prices'),
        api.get('/inventory/pricing-rules'),
        api.get('/inventory/products', { params: { limit: 300 } }),
      ]);
      setPriceLists(pl.data?.data || []);
      setItemPrices(ip.data?.data?.items || []);
      setRules(rulesRes.data?.data || []);
      setProducts(prod.data?.data?.items || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load pricing configurations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createPriceList = async () => {
    if (isSubmittingPL) return;
    const trimmedName = priceListForm.name.trim();
    if (!trimmedName) {
      toast.error('Price list name is required');
      return;
    }

    setIsSubmittingPL(true);
    try {
      await api.post('/inventory/price-lists', { ...priceListForm, name: trimmedName });
      showApiSuccess(`Price list "${trimmedName}" created`);
      setPriceListForm({ name: '', currency: 'INR' });
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to create price list');
    } finally {
      setIsSubmittingPL(false);
    }
  };

  const createItemPrice = async () => {
    if (isSubmittingIP) return;
    if (!itemPriceForm.productId) {
      toast.error('Please select a product');
      return;
    }
    if (!itemPriceForm.priceListId) {
      toast.error('Please select a price list');
      return;
    }
    if (!itemPriceForm.price || Number(itemPriceForm.price) < 0) {
      toast.error('Please enter a valid non-negative price');
      return;
    }

    setIsSubmittingIP(true);
    try {
      await api.post('/inventory/item-prices', { ...itemPriceForm, price: Number(itemPriceForm.price) });
      showApiSuccess('Item price configured successfully');
      setItemPriceForm({ productId: '', priceListId: '', currency: 'INR', price: '' });
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to save item price');
    } finally {
      setIsSubmittingIP(false);
    }
  };

  const createRule = async () => {
    if (isSubmittingRule) return;
    const trimmedName = ruleForm.name.trim();
    if (!trimmedName) {
      toast.error('Rule name is required');
      return;
    }

    setIsSubmittingRule(true);
    try {
      await api.post('/inventory/pricing-rules', {
        ...ruleForm,
        name: trimmedName,
        productId: ruleForm.productId || undefined,
        priceListId: ruleForm.priceListId || undefined,
        minQty: ruleForm.minQty ? Number(ruleForm.minQty) : undefined,
        discountPercent: Number(ruleForm.discountPercent || 0),
        marginPercent: Number(ruleForm.marginPercent || 0),
        priority: Number(ruleForm.priority || 100),
      });
      showApiSuccess(`Pricing rule "${trimmedName}" created`);
      setRuleForm({
        name: '',
        priceListId: '',
        productId: '',
        minQty: '',
        discountPercent: '',
        marginPercent: '',
        priority: '100',
      });
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to create pricing rule');
    } finally {
      setIsSubmittingRule(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Pricing" description="Manage price lists, item prices, and automatic selling rules" />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Price List
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={priceListForm.name}
                placeholder="e.g. Standard Selling, Wholesale"
                onChange={(e) => setPriceListForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <CurrencySelect
                value={priceListForm.currency}
                onChange={(currency) => setPriceListForm((f) => ({ ...f, currency }))}
              />
            </div>
            <Button onClick={createPriceList} disabled={isSubmittingPL}>
              <Plus className="mr-2 h-4 w-4" />
              {isSubmittingPL ? 'Adding...' : 'Add Price List'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Item Price</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ProductSelect
              value={itemPriceForm.productId}
              products={products}
              onChange={(productId) => setItemPriceForm((f) => ({ ...f, productId }))}
            />
            <PriceListSelect
              value={itemPriceForm.priceListId}
              priceLists={priceLists}
              onChange={(priceListId) => {
                const selectedPl = priceLists.find((p) => p.id === priceListId);
                setItemPriceForm((f) => ({
                  ...f,
                  priceListId,
                  currency: selectedPl?.currency || f.currency,
                }));
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <CurrencySelect
                  value={itemPriceForm.currency}
                  onChange={(currency) => setItemPriceForm((f) => ({ ...f, currency }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Price *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={itemPriceForm.price}
                  onChange={(e) => setItemPriceForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={createItemPrice}
              disabled={isSubmittingIP || products.length === 0 || priceLists.length === 0}
            >
              {isSubmittingIP ? 'Adding...' : 'Add Item Price'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={ruleForm.name}
                placeholder="e.g. Bulk 10+ Discount"
                onChange={(e) => setRuleForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <ProductSelect
              value={ruleForm.productId}
              products={products}
              onChange={(productId) => setRuleForm((f) => ({ ...f, productId }))}
            />
            <PriceListSelect
              value={ruleForm.priceListId}
              priceLists={priceLists}
              onChange={(priceListId) => setRuleForm((f) => ({ ...f, priceListId }))}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Min qty"
                type="number"
                value={ruleForm.minQty}
                onChange={(e) => setRuleForm((f) => ({ ...f, minQty: e.target.value }))}
              />
              <Input
                placeholder="Disc %"
                type="number"
                value={ruleForm.discountPercent}
                onChange={(e) => setRuleForm((f) => ({ ...f, discountPercent: e.target.value }))}
              />
              <Input
                placeholder="Margin %"
                type="number"
                value={ruleForm.marginPercent}
                onChange={(e) => setRuleForm((f) => ({ ...f, marginPercent: e.target.value }))}
              />
            </div>
            <Button onClick={createRule} disabled={isSubmittingRule}>
              {isSubmittingRule ? 'Adding...' : 'Add Pricing Rule'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={itemPrices}
        isLoading={isLoading}
        columns={[
          {
            key: 'product',
            header: 'Product',
            render: (row: ItemPrice) =>
              row.product ? `${row.product.sku} - ${row.product.name}` : row.productId,
          },
          {
            key: 'priceList',
            header: 'Price List',
            render: (row: ItemPrice) => row.priceList?.name || row.priceListId,
          },
          { key: 'currency', header: 'Currency' },
          {
            key: 'price',
            header: 'Price',
            render: (row: ItemPrice) => formatCurrency(row.price, row.currency),
          },
        ]}
      />

      <DataTable
        data={rules}
        isLoading={isLoading}
        columns={[
          { key: 'priority', header: 'Priority', render: (rule: PricingRule) => rule.priority },
          {
            key: 'name',
            header: 'Rule',
            render: (rule: PricingRule) => <span className="font-medium">{rule.name}</span>,
          },
          {
            key: 'priceList',
            header: 'Price List',
            render: (rule: PricingRule) => rule.priceList?.name || 'Any',
          },
          { key: 'discountPercent', header: 'Discount %' },
          { key: 'marginPercent', header: 'Margin %' },
        ]}
      />
    </div>
  );
}

function ProductSelect({
  value,
  products,
  onChange,
}: {
  value: string;
  products: Product[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Product</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select product" />
        </SelectTrigger>
        <SelectContent>
          {products.length === 0 ? (
            <SelectEmptyState
              message="No products found"
              linkHref="/inventory/products"
              linkText="Create Product"
            />
          ) : (
            products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.sku} - {product.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function PriceListSelect({
  value,
  priceLists,
  onChange,
}: {
  value: string;
  priceLists: PriceList[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Price List</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select price list" />
        </SelectTrigger>
        <SelectContent>
          {priceLists.length === 0 ? (
            <SelectEmptyState
              message="No price lists found"
              linkHref="/inventory/pricing"
              linkText="Create Price List"
            />
          ) : (
            priceLists.map((list) => (
              <SelectItem key={list.id} value={list.id}>
                {list.name} ({list.currency})
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
