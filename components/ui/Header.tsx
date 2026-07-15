'use client';

import { usePathname } from 'next/navigation';
import React from 'react';
import { getFinancialYearLabel } from '@/lib/period';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();
  const financialYearLabel = getFinancialYearLabel();

  const getPageTitle = () => {
    if (pathname.startsWith('/products')) return 'Products';
    if (pathname.startsWith('/vendors')) return 'Vendors';
    if (pathname.startsWith('/categories')) return 'Categories';
    return 'Dashboard';
  };

  return (
    <header className="text-primary font-headline-md text-headline-md sticky top-0 z-40 flex h-[88px] w-full items-center justify-between border-b-[0.5px] border-[#333] bg-[#181818] bg-opacity-90 px-4 backdrop-blur-md sm:px-6 lg:px-10">
      <div className="font-display text-display text-primary flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-on-surface-variant hover:text-primary transition-colors"
          title="Toggle navigation"
          aria-label="Toggle navigation"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
        <span className="text-[22px] font-semibold tracking-tight">{getPageTitle()}</span>
      </div>
      <div className="font-body-md flex items-center gap-4 text-sm">
        <div className="mr-2 flex items-center gap-2">
          <span className="cursor-pointer rounded-md border-[0.5px] border-[#333] bg-[#222] px-3.5 py-1.5 text-[12px] font-medium text-[#c4c7c8] transition-all hover:bg-[#2a2a2a]">
            {financialYearLabel}
          </span>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] border-[#333] bg-[#222]">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
            person
          </span>
        </div>
      </div>
    </header>
  );
}
