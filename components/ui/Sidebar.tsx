'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DASHBOARD_ITEM,
  NAV_GROUPS,
  SETTINGS_ITEM,
  findActiveGroup,
  type NavItem,
} from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const activeGroup = findActiveGroup(pathname);
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup);

  // On navigation, snap the accordion back to the route's group: the active
  // group opens and any manual "peek" into another group is reverted.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenGroup(activeGroup);
  }, [activeGroup, pathname]);

  const isItemActive = (item: NavItem) =>
    item.href === '/'
      ? pathname === '/'
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Failed to log out', error);
    }
    router.push('/login');
  };

  const renderLink = (item: NavItem) => {
    const active = isItemActive(item);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={cn(
          'flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg border-l-2 px-3 transition-all duration-200',
          active
            ? 'text-primary bg-surface-container-high border-accent-cyan'
            : 'text-on-surface-variant hover:text-primary hover:bg-surface-container border-transparent'
        )}
      >
        <span
          className="material-symbols-outlined text-[20px]"
          style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
        >
          {item.icon}
        </span>
        <span className="text-[13px] font-medium">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-45 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <nav
        className={cn(
          'text-primary font-body-md text-body-md border-border bg-surface-container-low fixed top-0 left-0 z-50 flex h-full w-[260px] flex-col border-r-[0.5px] py-8 transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="mb-8 flex shrink-0 items-center gap-4 px-8">
          <div className="bg-surface-container-high text-primary font-display border-outline-variant flex h-11 w-11 items-center justify-center rounded-xl border-[0.5px] text-xl font-bold shadow-sm">
            DE
          </div>
          <div>
            <h1 className="font-display text-base leading-tight font-semibold tracking-tight">
              DigiERP
            </h1>
            <p className="text-on-surface-variant mt-0.5 text-[11px] font-medium tracking-widest uppercase">
              ERP V1
            </p>
          </div>
        </div>

        {/* Scrollable groups region */}
        <div className="hide-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto px-5">
          {renderLink(DASHBOARD_ITEM)}

          {NAV_GROUPS.map((group) => {
            const expanded = openGroup === group.label;
            return (
              <div key={group.label} className="mt-2">
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroup((prev) => (prev === group.label ? null : group.label))
                  }
                  aria-expanded={expanded}
                  className="text-on-surface-variant hover:text-primary flex h-9 w-full items-center justify-between rounded-lg px-3 transition-colors"
                >
                  <span className="text-[11px] font-medium tracking-widest uppercase">
                    {group.label}
                  </span>
                  <span
                    className={cn(
                      'material-symbols-outlined text-[18px] transition-transform duration-200',
                      expanded && 'rotate-90'
                    )}
                  >
                    chevron_right
                  </span>
                </button>
                {expanded && (
                  <ul className="mt-1 flex w-full flex-col space-y-1">
                    {group.items.map(renderLink)}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Pinned footer — always visible */}
        <div className="border-border mt-4 flex shrink-0 flex-col space-y-1 border-t-[0.5px] px-5 pt-4">
          {renderLink(SETTINGS_ITEM)}
          <button
            type="button"
            onClick={handleLogout}
            className="text-on-surface-variant hover:text-primary hover:bg-surface-container flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg border-l-2 border-transparent px-3 text-left transition-all duration-200"
            title="Logout"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-[13px] font-medium">Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}
