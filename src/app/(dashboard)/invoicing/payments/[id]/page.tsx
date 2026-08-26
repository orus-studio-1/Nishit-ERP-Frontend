'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { Payment } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showApiError } from '@/lib/apiError';

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/payments/${params.id}`)
      .then((res) => setPayment(res.data?.data))
      .catch((err) => showApiError(err, 'Failed to load payment details'))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isLoading || !payment) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/invoicing/payments">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to payments
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{payment.paymentNo}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <Info label="Type" value={payment.type} />
          <Info label="Customer" value={payment.customer?.name || payment.customerId || '-'} />
          <Info
            label="Invoice"
            value={payment.invoice?.invoiceNo || payment.invoiceId || '-'}
            href={payment.invoiceId ? `/invoicing/sales-invoices/${payment.invoiceId}` : undefined}
          />
          <Info label="Date" value={formatDate(payment.date)} />
          <Info label="Amount" value={formatCurrency(payment.amount, payment.currency)} />
          <Info label="Method" value={payment.method.replace('_', ' ')} />
          <Info label="Reference" value={payment.reference || '-'} />
          <Info label="Notes" value={payment.notes || '-'} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded-md border border-[#e5e2dc] bg-[#f8faf9] px-3 py-2">
      <p className="text-xs font-medium uppercase text-[#7c8591]">{label}</p>
      {href ? (
        <Link href={href} className="mt-1 block text-sm font-medium text-[#1674c4] hover:underline">
          {value}
        </Link>
      ) : (
        <p className="mt-1 text-sm font-medium text-[#1f2937]">{value}</p>
      )}
    </div>
  );
}
