'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { DASHBOARD_ITEM, NAV_GROUPS, SETTINGS_ITEM, type NavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

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
          'flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 transition-all duration-200',
          active
            ? 'text-primary border-outline-variant bg-surface-container-high border-[0.5px]'
            : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
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
          'text-primary font-body-md text-body-md border-border bg-surface-container-low fixed top-0 left-0 z-50 flex h-full w-[260px] flex-col overflow-y-auto border-r-[0.5px] py-8 transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="mb-10 flex items-center gap-4 px-8">
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

        <div className="flex flex-col gap-6">
          <ul className="flex w-full flex-col space-y-1 px-5">{renderLink(DASHBOARD_ITEM)}</ul>

          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="mb-2 px-8">
                <h2 className="font-label-caps text-label-caps text-on-surface-variant text-[11px] font-medium tracking-widest uppercase">
                  {group.label}
                </h2>
              </div>
              <ul className="flex w-full flex-col space-y-1 px-5">{group.items.map(renderLink)}</ul>
            </div>
          ))}
        </div>

        <div className="border-border mt-8 mt-auto flex w-full flex-col space-y-1 border-t-[0.5px] px-5 pt-8">
          {renderLink(SETTINGS_ITEM)}
          <button
            type="button"
            onClick={handleLogout}
            className="text-on-surface-variant hover:text-primary hover:bg-surface-container flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left transition-all duration-200"
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
