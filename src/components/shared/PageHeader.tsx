import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  children?: React.ReactNode;
}

export function PageHeader({ title, description, action, children }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold leading-7 text-[#1f2937]">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-[#6b7280]">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {action && (
          <Button onClick={action.onClick} className="flex items-center gap-2">
            {action.icon && <action.icon className="h-4 w-4" />}
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
