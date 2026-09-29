'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { inferredPermission, navItems, type NavItem } from './sidebarNav';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

/**
 * Picks the single most specific nav href that matches the current path, so sibling items whose
 * href is a prefix of another item's href (e.g. "/settings" vs "/settings/tally") don't both
 * light up: only the longest matching href wins.
 */
function findActiveHref(items: NavItem[], pathname: string): string | undefined {
  let best: string | undefined;
  const consider = (href?: string) => {
    if (!href) return;
    const matches = href === pathname || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
    if (matches && (!best || href.length > best.length)) best = href;
  };
  const walk = (list: NavItem[]) => {
    for (const item of list) {
      consider(item.href);
      if (item.children) walk(item.children);
    }
  };
  walk(items);
  return best;
}

function NavItemComponent({ item, activeHref, depth = 0 }: { item: NavItem; activeHref?: string; depth?: number }) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(() => {
    if (!item.children) return false;
    return item.children.some(child => child.href === pathname || pathname.startsWith(child.href || ''));
  });

  const isActive = Boolean(item.href) && item.href === activeHref;

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors',
            'text-[#4b5563] hover:bg-[#eef3f5] hover:text-[#1f2937]',
            depth === 0 ? 'font-medium' : 'font-normal'
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </div>
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-[#e5e2dc] pl-2">
            {item.children.map((child) => (
              <NavItemComponent key={child.label} item={child} activeHref={activeHref} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
        isActive
          ? 'bg-[#e8f3ff] text-[#1674c4] font-medium'
          : 'text-[#4b5563] hover:bg-[#eef3f5] hover:text-[#1f2937]',
        depth === 0 ? 'font-medium' : 'font-normal'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const activeHref = findActiveHref(navItems, pathname);
  const canSee = (item: NavItem): boolean => {
    if (!user?.access || user.access.isSuperAdmin) return true;
    if (item.children) return item.children.some(canSee);
    const permission = item.permission || inferredPermission(item.href);
    if (!permission) return true;
    return user.access.permissions.includes(permission) && !user.access.deniedPermissions.includes(permission);
  };
  const visibleItems = navItems
    .map((item) => item.children ? { ...item, children: item.children.filter(canSee) } : item)
    .filter(canSee);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-[#e5e2dc] bg-[#fbfaf8] transition-transform duration-300',
        'lg:translate-x-0 lg:static lg:z-auto',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between border-b border-[#e5e2dc] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2490ef] shadow-sm shadow-[#2490ef]/25">
              <span className="text-sm font-bold text-white">V</span>
            </div>
            <div>
              <span className="text-base font-semibold text-[#1f2937]">Nishit</span>
              <span className="block -mt-1 text-xs text-[#7c8591]">ERP Desk</span>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-[#7c8591] hover:text-[#1f2937] lg:hidden">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {visibleItems.map((item) => (
            <NavItemComponent key={item.label} item={item} activeHref={activeHref} />
          ))}
        </nav>

        <div className="border-t border-[#e5e2dc] px-4 py-3">
          <p className="text-center text-xs text-[#8a929d]">Nishit ERP v1.0</p>
        </div>
      </aside>
    </>
  );
}
