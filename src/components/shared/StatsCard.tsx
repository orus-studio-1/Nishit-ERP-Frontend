import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label: string };
}

export function StatsCard({ title, value, subtitle, icon: Icon, iconColor = 'text-blue-600', iconBg = 'bg-blue-50', trend }: StatsCardProps) {
  return (
    <Card className="transition hover:border-[#d5d0c8] hover:shadow-[0_4px_14px_rgba(16,24,40,0.06)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase text-[#7c8591]">{title}</p>
            <p className="mt-1 truncate text-xl font-semibold text-[#1f2937]">{value}</p>
            {subtitle && <p className="mt-0.5 truncate text-xs text-[#7c8591]">{subtitle}</p>}
            {trend && (
              <p className={cn('mt-1 text-xs font-medium', trend.value >= 0 ? 'text-[#0f9d58]' : 'text-[#c3423f]')}>
                {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div className={cn('rounded-md p-2', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
