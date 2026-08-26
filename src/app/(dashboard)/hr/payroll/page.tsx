'use client';

import Link from 'next/link';
import { FileText, Landmark, ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PayrollPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Payroll" description="Payroll is managed through salary structures, monthly payroll entries, and salary slips" />
      <div className="grid gap-4 md:grid-cols-3">
        <PayrollCard
          icon={ListChecks}
          title="1. Salary Structures"
          text="Create earnings, deductions, taxes and reusable salary templates, then assign them to employees."
          href="/hr/salary-structures"
          action="Configure Structures"
        />
        <PayrollCard
          icon={Landmark}
          title="2. Payroll Entries"
          text="Generate the monthly payroll document. It creates salary slips using active employee assignments."
          href="/hr/payroll-entries"
          action="Run Payroll"
        />
        <PayrollCard
          icon={FileText}
          title="3. Salary Slips"
          text="Review employee-wise slip details, component breakdown, gross pay, deductions, and net pay."
          href="/hr/salary-slips"
          action="View Slips"
        />
      </div>
      <Card>
        <CardContent className="p-4 text-sm leading-6 text-[#4b5563]">
          The older one-row payroll table has been replaced by the structured ERP flow. Use this page as the control center, then manage payroll from the three linked sections.
        </CardContent>
      </Card>
    </div>
  );
}

function PayrollCard({ icon: Icon, title, text, href, action }: { icon: any; title: string; text: string; href: string; action: string }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eef6ff] text-[#1674c4]"><Icon className="h-5 w-5" /></div>
        <div>
          <h3 className="font-semibold text-[#1f2937]">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-[#6b7280]">{text}</p>
        </div>
        <Button asChild><Link href={href}>{action}</Link></Button>
      </CardContent>
    </Card>
  );
}
