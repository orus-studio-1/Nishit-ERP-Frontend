'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function DeskPage({ title, description, action, meta, children }: { title: string; description: string; action?: React.ReactNode; meta?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[#1f2937]">{title}</h1>
            {meta && <span className="rounded-full bg-[#eef3f5] px-2 py-0.5 text-xs text-[#6b7280]">{meta}</span>}
          </div>
          <p className="text-sm text-[#6b7280]">{description}</p>
        </div>
        {action}
      </div>
      <Card className="rounded-md border-[#dfe3e8] shadow-none">
        <CardHeader className="border-b border-[#edf0f2] py-3"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
        <CardContent className="p-0">{children}</CardContent>
      </Card>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
