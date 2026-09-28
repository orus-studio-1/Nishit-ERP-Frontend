import {
  LayoutDashboard, BookOpen, Package, Users, ShoppingCart, UserCheck,
  TrendingUp, FileText, ShoppingBag, FolderOpen, Building2, Truck,
  ChevronDown, ChevronRight, X, Settings, Clock, ShieldCheck, BriefcaseBusiness, ClipboardList, Tags,
  Receipt, CreditCard, Landmark, FileMinus, Percent, Printer, Repeat, ClipboardCheck,
  Hourglass, CircleDollarSign, CalendarDays, ScrollText, CalendarRange, Network, WalletCards,
  BarChart3, Warehouse, Boxes, ArrowLeftRight, Layers, Archive, LockKeyhole, Calculator,
  ChartColumnIncreasing, ArchiveX, UserRound, Building, Target, Activity,
  Route, Upload, FileCheck2, ClipboardSignature, CalendarCheck, CalendarCog, CalendarX,
  ListChecks, HandCoins, BadgeDollarSign, Wallet, UserCog, SlidersHorizontal, KeyRound,
  Handshake, Scale, PackageCheck, History, BadgePercent
} from 'lucide-react';

export interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  permission?: string;
  children?: NavItem[];
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:dashboard:read' },
  {
    label: 'Accounting', icon: Landmark,
    children: [
	      { label: 'Chart of Accounts', href: '/accounting/accounts', icon: Network, permission: 'accounting:accounts:read' },
	      { label: 'Journal Entries', href: '/accounting/journal-entries', icon: ScrollText, permission: 'accounting:journal-entries:read' },
	      { label: 'Fiscal Years', href: '/accounting/fiscal-years', icon: CalendarRange, permission: 'accounting:fiscal-years:read' },
	      { label: 'Cost Centers', href: '/accounting/cost-centers', icon: Building2, permission: 'accounting:cost-centers:read' },
	      { label: 'Budgets', href: '/accounting/budgets', icon: WalletCards, permission: 'accounting:budgets:read' },
	      { label: 'Bank Reconciliation', href: '/accounting/bank-reconciliation', icon: ShieldCheck, permission: 'accounting:reconciliation:read' },
	      { label: 'Masters & Automation', href: '/accounting/automation', icon: Repeat, permission: 'accounting:journal-entries:read' },
	      { label: 'Financial Reports', href: '/accounting/reports', icon: BarChart3, permission: 'accounting:reports:read' },
    ],
  },
  {
    label: 'Inventory', icon: Package,
    children: [
	      { label: 'Products', href: '/inventory/products', icon: Package, permission: 'inventory:products:read' },
	      { label: 'Categories', href: '/inventory/categories', icon: Layers, permission: 'inventory:categories:read' },
	      { label: 'Warehouses', href: '/inventory/warehouses', icon: Warehouse, permission: 'inventory:warehouses:read' },
	      { label: 'Stock Entries', href: '/inventory/stock-entries', icon: ClipboardList, permission: 'inventory:stock-entries:read' },
	      { label: 'Stock Movements', href: '/inventory/stock-movements', icon: ArrowLeftRight, permission: 'inventory:stock-movements:read' },
	      { label: 'Pricing', href: '/inventory/pricing', icon: Tags, permission: 'inventory:price-lists:read' },
	      { label: 'Reconciliation', href: '/inventory/reconciliations', icon: ClipboardCheck },
	      { label: 'Transfer Orders', href: '/inventory/transfers', icon: ArrowLeftRight },
	      { label: 'Traceability', href: '/inventory/traceability', icon: Route },
	      { label: 'Inventory Monitoring', href: '/inventory/reports/advanced', icon: BarChart3 },
	      { label: 'Inventory Configuration', href: '/inventory/settings', icon: Settings },
	      { label: 'Stock Balance', href: '/inventory/reports/stock-balance', icon: Boxes, permission: 'inventory:stock-balance:read' },
	      { label: 'Stock Ledger', href: '/inventory/reports/stock-ledger', icon: BookOpen, permission: 'inventory:stock-ledger:read' },
	      { label: 'Projected Stock', href: '/inventory/reports/projected-stock', icon: TrendingUp, permission: 'inventory:projected-stock:read' },
	      { label: 'Reserved Stock', href: '/inventory/reports/reserved-stock', icon: LockKeyhole, permission: 'inventory:stock-balance:read' },
	      { label: 'Warehouse Valuation', href: '/inventory/reports/warehouse-valuation', icon: Calculator, permission: 'inventory:stock-balance:read' },
	      { label: 'Item-wise Sales', href: '/inventory/reports/item-wise-sales', icon: ChartColumnIncreasing, permission: 'inventory:stock-balance:read' },
	      { label: 'Gross Profit', href: '/inventory/reports/gross-profit', icon: CircleDollarSign, permission: 'inventory:stock-balance:read' },
	      { label: 'Slow Moving Stock', href: '/inventory/reports/slow-moving-stock', icon: ArchiveX, permission: 'inventory:stock-balance:read' },
	      { label: 'Inventory Audit Trail', href: '/audit-trail?module=inventory', icon: History, permission: 'access:audit:read' },
    ],
  },
  {
    label: 'HR', icon: Users,
    children: [
      { label: 'HR Desk', href: '/hr/desk', icon: LayoutDashboard },
      { label: 'My Profile', href: '/hr/my-profile', icon: UserRound },
      { label: 'Employees', href: '/hr/employees', icon: Users, permission: 'hr:employees:read' },
      { label: 'Departments', href: '/hr/departments', icon: Building },
      { label: 'Positions', href: '/hr/positions', icon: BriefcaseBusiness },
      { label: 'Attendance', href: '/hr/attendance', icon: CalendarCheck },
      { label: 'Shifts', href: '/hr/shifts', icon: CalendarCog },
      { label: 'Leave Management', href: '/hr/leave', icon: CalendarX },
      { label: 'Leave Setup', href: '/hr/leave-setup', icon: CalendarCog },
      { label: 'Leave Ledger', href: '/hr/leave-ledger', icon: ListChecks },
      { label: 'Lifecycle', href: '/hr/lifecycle', icon: UserCog },
      { label: 'Salary Structures', href: '/hr/salary-structures', icon: BadgeDollarSign },
      { label: 'Payroll Entries', href: '/hr/payroll-entries', icon: HandCoins },
      { label: 'Salary Slips', href: '/hr/salary-slips', icon: Receipt },
      { label: 'Payroll', href: '/hr/payroll', icon: Wallet, permission: 'hr:payroll:read' },
    ],
  },
  {
    label: 'CRM', icon: Handshake,
    children: [
      { label: 'CRM Dashboard', href: '/crm/dashboard', icon: LayoutDashboard, permission: 'crm:dashboard:read' },
      { label: 'Leads', href: '/crm/leads', icon: Target, permission: 'crm:leads:read' },
      { label: 'Customers', href: '/customers', icon: Users, permission: 'customers:customers:read' },
      { label: 'Lead Imports', href: '/crm/imports', icon: Upload, permission: 'crm:imports:read' },
      { label: 'Organizations', href: '/crm/organizations', icon: Building2, permission: 'crm:organizations:read' },
      { label: 'Opportunities', href: '/crm/opportunities', icon: TrendingUp },
      { label: 'Activities', href: '/crm/activities', icon: Activity },
      { label: 'Assignment Rules', href: '/crm/assignment-rules', icon: Route, permission: 'crm:assignment-rules:read' },
      { label: 'CRM Reports', href: '/crm/reports', icon: BarChart3, permission: 'crm:reports:read' },
      { label: 'CRM Configuration', href: '/crm/settings', icon: Settings },
      { label: 'CRM Audit Trail', href: '/audit-trail?module=crm', icon: History, permission: 'access:audit:read' },
    ],
  },
  {
    label: 'Sales', icon: ShoppingCart,
    children: [
      { label: 'Sales Cases', href: '/sales/enquiries', icon: ClipboardSignature },
      { label: 'Fulfilment', href: '/sales/fulfilment', icon: PackageCheck },
      { label: 'Sales Reports', href: '/sales/reports', icon: BarChart3 },
      { label: 'Sales Configuration', href: '/sales/settings', icon: Settings },
      { label: 'Sales Audit Trail', href: '/audit-trail?module=sales', icon: History, permission: 'access:audit:read' },
    ],
  },
  {
    label: 'Invoicing', icon: FileText,
    children: [
      { label: 'Sales Invoices', href: '/invoicing/sales-invoices', icon: Receipt, permission: 'invoicing:sales-invoices:read' },
      { label: 'Payments', href: '/invoicing/payments', icon: CreditCard },
      { label: 'Payment Entries', href: '/invoicing/payment-entries', icon: Landmark },
      { label: 'Delivery Notes', href: '/invoicing/delivery-notes', icon: Truck },
      { label: 'Credit Notes', href: '/invoicing/credit-notes', icon: FileMinus },
      { label: 'Tax Templates', href: '/invoicing/tax-templates', icon: Percent },
      { label: 'Ledger', href: '/invoicing/ledger', icon: BookOpen },
      { label: 'Print Formats', href: '/invoicing/print-formats', icon: Printer },
      { label: 'Recurring Invoices', href: '/invoicing/subscriptions', icon: Repeat },
      { label: 'Audit Log', href: '/invoicing/audit-log', icon: ClipboardCheck },
      { label: 'Aging Report', href: '/invoicing/reports/aging', icon: Hourglass },
      { label: 'Outstanding', href: '/invoicing/reports/outstanding', icon: CircleDollarSign },
      { label: 'Revenue by Customer', href: '/invoicing/reports/revenue-by-customer', icon: Users },
      { label: 'Revenue by Item', href: '/invoicing/reports/revenue-by-item', icon: Package },
      { label: 'Revenue by Period', href: '/invoicing/reports/revenue-by-period', icon: CalendarDays },
    ],
  },
  {
    label: 'Procurement', icon: ShoppingBag,
    children: [
      { label: 'Procurement Dashboard', href: '/procurement/dashboard', icon: LayoutDashboard, permission: 'procurement:dashboard:read' },
      { label: 'Material Requests', href: '/procurement/material-requests', icon: ClipboardList, permission: 'procurement:material-requests:read' },
      { label: 'Request for Quotations', href: '/procurement/rfqs', icon: FileText, permission: 'procurement:rfqs:read' },
      { label: 'Supplier Quotations', href: '/procurement/supplier-quotations', icon: Scale, permission: 'procurement:supplier-quotations:read' },
      { label: 'Blanket Purchase Orders', href: '/procurement/blanket-purchase-orders', icon: Landmark, permission: 'procurement:blanket-purchase-orders:read' },
      { label: 'Purchase Orders', href: '/procurement/purchase-orders', icon: ClipboardSignature, permission: 'procurement:purchase-orders:read' },
      { label: 'Purchase Receipts', href: '/procurement/purchase-receipts', icon: PackageCheck, permission: 'procurement:purchase-receipts:read' },
      { label: 'Quality Inspections', href: '/procurement/quality-inspections', icon: FileCheck2, permission: 'procurement:quality-inspections:read' },
      { label: 'Landed Cost Vouchers', href: '/procurement/landed-cost-vouchers', icon: Truck, permission: 'procurement:landed-cost-vouchers:read' },
      { label: 'Purchase Invoices', href: '/procurement/purchase-invoices', icon: Receipt, permission: 'procurement:purchase-invoices:read' },
      { label: 'Supplier Payments', href: '/procurement/supplier-payments', icon: HandCoins, permission: 'procurement:supplier-payments:read' },
      { label: 'Payment Terms', href: '/procurement/payment-terms', icon: Landmark, permission: 'procurement:payment-terms:read' },
      { label: 'Supplier Item Codes', href: '/procurement/supplier-items', icon: Tags, permission: 'procurement:supplier-items:read' },
      { label: 'Communications', href: '/procurement/communications', icon: Activity, permission: 'procurement:communications:read' },
      { label: 'Procurement Tracker', href: '/procurement/tracker', icon: BarChart3, permission: 'procurement:tracker:read' },
      { label: 'Procurement Reports', href: '/procurement/reports', icon: ChartColumnIncreasing, permission: 'procurement:reports:read' },
      { label: 'Procurement Audit Trail', href: '/procurement/audit-trail', icon: History, permission: 'access:audit:read' },
      { label: 'Buying Settings', href: '/procurement/settings', icon: Settings, permission: 'procurement:settings:read' },
    ],
  },
  {
    label: 'Incentives', icon: BadgePercent,
    children: [
      { label: 'Incentive Schemes', href: '/incentives', icon: BadgePercent, permission: 'incentives:schemes:read' },
    ],
  },
  { label: 'Projects', href: '/projects', icon: FolderOpen, permission: 'projects:projects:read' },
  { label: 'Suppliers', href: '/suppliers', icon: Truck, permission: 'suppliers:suppliers:read' },
  {
    label: 'Settings', icon: Settings,
    children: [
      { label: 'General Settings', href: '/settings', icon: SlidersHorizontal },
      { label: 'Organization Setup', href: '/settings/organization', icon: Building2, permission: 'company:company:read' },
      { label: 'Access Control', href: '/settings/access', icon: KeyRound, permission: 'access:users:read' },
      { label: 'Tally Integration', href: '/settings/tally', icon: Repeat },
      { label: 'Organization Audit Trail', href: '/audit-trail', icon: History, permission: 'access:audit:read' },
    ],
  },
];

export function inferredPermission(href?: string) {
    if (!href) return undefined;
    const parts = href.split('/').filter(Boolean);
    if (href === '/dashboard') return 'dashboard:dashboard:read';
    if (parts[0] === 'settings') return parts[1] === 'access' ? 'access:users:read' : 'company:company:read';
    if (parts[0] === 'audit-trail') return 'access:audit:read';
    if (parts[0] === 'customers') return 'customers:customers:read';
    if (parts[0] === 'suppliers') return 'suppliers:suppliers:read';
    if (parts[0] === 'projects') return 'projects:projects:read';
    if (parts[0] === 'sales') return `sales:${parts[1] === 'orders' ? 'sales-orders' : parts[1]}:read`;
    if (parts[0] === 'hr') {
      const hrMap: Record<string, string> = {
        desk: 'hr:employees:read',
        'my-profile': 'hr:employees:read',
        employees: 'hr:employees:read',
        departments: 'hr:departments:read',
        positions: 'hr:positions:read',
        attendance: 'hr:attendance:read',
        shifts: 'hr:shifts:read',
        leave: 'hr:leave:read',
        'leave-ledger': 'hr:leave:read',
        lifecycle: 'hr:lifecycle:read',
        'salary-structures': 'hr:salary:read',
        'salary-slips': 'hr:salary:read',
        payroll: 'hr:payroll:read',
        'payroll-entries': 'hr:payroll:read',
      };
      return hrMap[parts[1]];
    }
    if (parts[0] === 'invoicing') {
      const resource = parts[1] === 'reports' ? 'reports' : parts[1];
      return `invoicing:${resource}:read`;
    }
    if (parts[0] === 'inventory' || parts[0] === 'crm' || parts[0] === 'accounting' || parts[0] === 'procurement') {
      return `${parts[0]}:${parts[1]}:read`;
    }
    return undefined;
}
