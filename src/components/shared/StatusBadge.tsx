import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string }> = {
  // Generic
  ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-700 border-green-200' },
  INACTIVE: { label: 'Inactive', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  // Invoice/Order statuses
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  SENT: { label: 'Sent', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-green-100 text-green-700 border-green-200' },
  PROCESSING: { label: 'Processing', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  SHIPPED: { label: 'Shipped', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  DELIVERED: { label: 'Delivered', className: 'bg-green-100 text-green-700 border-green-200' },
  PARTIAL: { label: 'Partial', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  PAID: { label: 'Paid', className: 'bg-green-100 text-green-700 border-green-200' },
  OVERDUE: { label: 'Overdue', className: 'bg-red-100 text-red-700 border-red-200' },
  CANCELLED: { label: 'Cancelled', className: 'bg-gray-700 text-white border-gray-700 line-through' },
  ACCEPTED: { label: 'Accepted', className: 'bg-green-100 text-green-700 border-green-200' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
  EXPIRED: { label: 'Expired', className: 'bg-gray-100 text-gray-500 border-gray-200' },
  RECEIVING: { label: 'Receiving', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  RECEIVED: { label: 'Received', className: 'bg-green-100 text-green-700 border-green-200' },
  // Lead statuses
  NEW: { label: 'New', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  CONTACTED: { label: 'Contacted', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  QUALIFIED: { label: 'Qualified', className: 'bg-green-100 text-green-700 border-green-200' },
  UNQUALIFIED: { label: 'Unqualified', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  CONVERTED: { label: 'Converted', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  // Opportunity stages
  PROSPECTING: { label: 'Prospecting', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  QUALIFICATION: { label: 'Qualification', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  PROPOSAL: { label: 'Proposal', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  NEGOTIATION: { label: 'Negotiation', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  CLOSED_WON: { label: 'Closed Won', className: 'bg-green-100 text-green-700 border-green-200' },
  CLOSED_LOST: { label: 'Closed Lost', className: 'bg-red-100 text-red-700 border-red-200' },
  // HR statuses
  ON_LEAVE: { label: 'On Leave', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  TERMINATED: { label: 'Terminated', className: 'bg-red-100 text-red-700 border-red-200' },
  PROBATION: { label: 'Probation', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-200' },
  // Project statuses
  PLANNING: { label: 'Planning', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  ON_HOLD: { label: 'On Hold', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200' },
  // Task statuses
  TODO: { label: 'To Do', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  IN_REVIEW: { label: 'In Review', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  DONE: { label: 'Done', className: 'bg-green-100 text-green-700 border-green-200' },
  // Journal entry statuses
  POSTED: { label: 'Posted', className: 'bg-green-100 text-green-700 border-green-200' },
  // Priority
  LOW: { label: 'Low', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  MEDIUM: { label: 'Medium', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  HIGH: { label: 'High', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  URGENT: { label: 'Urgent', className: 'bg-red-100 text-red-700 border-red-200' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', config.className, className)}>
      {config.label}
    </span>
  );
}
