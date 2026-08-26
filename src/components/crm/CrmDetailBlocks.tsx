'use client';

import Link from 'next/link';
import { Activity, Contact, Opportunity } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="text-xs text-[#6b7280]">{label}</p><div className="mt-1 text-sm font-medium text-[#1f2937]">{children}</div></div>;
}

export function TimelineCard({ activities = [] }: { activities?: Activity[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {activities.length ? activities.map((item: Activity) => (
          <div key={item.id} className="rounded-md border border-[#e5e2dc] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><StatusBadge status={item.type} /><span className="font-medium">{item.subject}</span></div>
              <span className="text-xs text-[#8a929d]">{formatDateTime(item.createdAt)}</span>
            </div>
            {item.description && <p className="mt-2 text-sm text-[#4b5563]">{item.description}</p>}
          </div>
        )) : <p className="text-sm text-[#6b7280]">No activity yet.</p>}
      </CardContent>
    </Card>
  );
}

export function OpportunityList({ opportunities = [] }: { opportunities?: Opportunity[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Opportunities</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {opportunities.length ? opportunities.map((opp) => (
          <Link key={opp.id} href={`/crm/opportunities/${opp.id}`} className="block rounded-md border border-[#e5e2dc] p-3 hover:bg-[#f8faf9]">
            <div className="flex items-center justify-between gap-3"><span className="font-medium">{opp.title}</span><StatusBadge status={opp.stage} /></div>
            <p className="mt-1 text-sm text-[#6b7280]">{formatCurrency(opp.value, opp.currency)} · {opp.probability}% probability</p>
          </Link>
        )) : <p className="text-sm text-[#6b7280]">No opportunities linked.</p>}
      </CardContent>
    </Card>
  );
}

export function ContactList({ contacts = [] }: { contacts?: Contact[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Contacts</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {contacts.length ? contacts.map((contact) => (
          <Link key={contact.id} href={`/crm/contacts/${contact.id}`} className="block rounded-md border border-[#e5e2dc] p-3 hover:bg-[#f8faf9]">
            <p className="font-medium">{contact.firstName} {contact.lastName}</p>
            <p className="text-sm text-[#6b7280]">{contact.email || contact.phone || contact.position || '-'}</p>
          </Link>
        )) : <p className="text-sm text-[#6b7280]">No contacts linked.</p>}
      </CardContent>
    </Card>
  );
}
