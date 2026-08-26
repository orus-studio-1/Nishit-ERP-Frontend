'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Contact } from '@/types';
import { showApiError } from '@/lib/apiError';
import { Info, OpportunityList, TimelineCard } from '@/components/crm/CrmDetailBlocks';

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [contact, setContact] = useState<any>(null);

  useEffect(() => {
    api.get(`/crm/contacts/${params.id}`)
      .then((res) => setContact(res.data?.data))
      .catch((err) => showApiError(err, 'Failed to load contact details'));
  }, [params.id]);

  if (!contact) return <div className="h-40 animate-pulse rounded bg-[#f7f8fa]" />;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push(contact.lead ? `/crm/leads/${contact.lead.id}` : '/crm/leads')}><ArrowLeft className="mr-2 h-4 w-4" />Back to lead</Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-semibold text-[#1f2937]">{contact.firstName} {contact.lastName}</h1><p className="text-sm text-[#6b7280]">{contact.position || contact.company || 'CRM Contact'}</p></div>
        <div className="flex gap-2">
          {contact.email && <Button asChild variant="outline"><a href={`mailto:${contact.email}`}><Mail className="mr-2 h-4 w-4" />Email</a></Button>}
          {(contact.phone || contact.mobile) && <Button asChild><a href={`tel:${contact.phone || contact.mobile}`}><Phone className="mr-2 h-4 w-4" />Call</a></Button>}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Contact Profile</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Info label="Email">{contact.email ? <a className="text-[#1674c4]" href={`mailto:${contact.email}`}>{contact.email}</a> : '-'}</Info>
              <Info label="Phone">{contact.phone || contact.mobile ? <a className="text-[#1674c4]" href={`tel:${contact.phone || contact.mobile}`}>{contact.phone || contact.mobile}</a> : '-'}</Info>
              <Info label="Position">{contact.position || '-'}</Info>
              <Info label="Source Lead">{contact.lead ? <Link className="text-[#1674c4]" href={`/crm/leads/${contact.lead.id}`}>{contact.lead.title}</Link> : '-'}</Info>
              <Info label="Organization">{contact.organization ? <Link className="text-[#1674c4]" href={`/crm/organizations/${contact.organization.id}`}>{contact.organization.name}</Link> : contact.company || '-'}</Info>
              <Info label="Location">{[contact.city, contact.country].filter(Boolean).join(', ') || '-'}</Info>
              <Info label="ERP Customer">{contact.customers?.[0] ? <Link className="text-[#1674c4]" href={`/customers/${contact.customers[0].id}`}>{contact.customers[0].customerNo}</Link> : '-'}</Info>
            </CardContent>
          </Card>
          <TimelineCard activities={contact.activities} />
        </div>
        <div className="space-y-4">
          <OpportunityList opportunities={contact.opportunities} />
          <Card>
            <CardHeader><CardTitle>ERP Customers</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {contact.customers?.length ? contact.customers.map((customer: any) => (
                <Link key={customer.id} href={`/customers/${customer.id}`} className="block rounded-md border border-[#e5e2dc] p-3 hover:bg-[#f8faf9]">
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-[#6b7280]">{customer.customerNo}</p>
                </Link>
              )) : <p className="text-sm text-[#6b7280]">No ERP customer linked.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
