'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { showApiError } from '@/lib/apiError';
import { ContactList, Info, OpportunityList, TimelineCard } from '@/components/crm/CrmDetailBlocks';

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);

  useEffect(() => {
    api.get(`/crm/organizations/${params.id}`)
      .then((res) => setOrg(res.data?.data))
      .catch((err) => showApiError(err, 'Failed to load organization details'));
  }, [params.id]);

  if (!org) return <div className="h-40 animate-pulse rounded bg-[#f7f8fa]" />;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/crm/organizations')}><ArrowLeft className="mr-2 h-4 w-4" />Back to organizations</Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-semibold text-[#1f2937]">{org.name}</h1><p className="text-sm text-[#6b7280]">{org.industry || 'CRM organization'}</p></div>
        <StatusBadge status={org.isActive ? 'ACTIVE' : 'ARCHIVED'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Organization Profile</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Info label="Email">{org.email || '-'}</Info>
              <Info label="Phone">{org.phone || '-'}</Info>
              <Info label="Website">{org.website || '-'}</Info>
              <Info label="Location">{[org.city, org.state, org.country].filter(Boolean).join(', ') || '-'}</Info>
              <Info label="Owner">{org.owner ? `${org.owner.firstName} ${org.owner.lastName}` : '-'}</Info>
              <Info label="Linked Records">{org.leads?.length || 0} leads / {org.opportunities?.length || 0} deals</Info>
            </CardContent>
          </Card>
          <TimelineCard activities={org.activities} />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Leads</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {org.leads?.length ? org.leads.map((lead: any) => (
                <Link key={lead.id} href={`/crm/leads/${lead.id}`} className="block rounded-md border border-[#e5e2dc] p-3 hover:bg-[#f8faf9]">
                  <div className="flex items-center justify-between gap-2"><span className="font-medium">{lead.title}</span><StatusBadge status={lead.status} /></div>
                  <p className="text-sm text-[#6b7280]">{lead.email || lead.phone || '-'}</p>
                </Link>
              )) : <p className="text-sm text-[#6b7280]">No leads linked.</p>}
            </CardContent>
          </Card>
          <ContactList contacts={org.contacts} />
          <OpportunityList opportunities={org.opportunities} />
        </div>
      </div>
    </div>
  );
}
