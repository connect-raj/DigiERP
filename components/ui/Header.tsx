'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

export default function Header() {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname.startsWith('/products')) return 'Products';
    if (pathname.startsWith('/vendors')) return 'Vendors';
    if (pathname.startsWith('/categories')) return 'Categories';
    return 'Dashboard';
  };

  return (
    <header className="text-primary font-headline-md text-headline-md bg-opacity-90 fixed top-0 right-0 z-40 flex h-[88px] w-[calc(100%-260px)] items-center justify-between border-b-[0.5px] border-[#333] bg-[#181818] px-10 backdrop-blur-md">
      <div className="font-display text-display text-primary flex items-center gap-4">
        <span className="text-[22px] font-semibold tracking-tight">{getPageTitle()}</span>
      </div>
      <div className="font-body-md flex items-center gap-4 text-sm">
        <div className="mr-2 flex items-center gap-2">
          <span className="cursor-pointer rounded-md border-[0.5px] border-[#333] bg-[#222] px-3.5 py-1.5 text-[12px] font-medium text-[#c4c7c8] transition-all hover:bg-[#2a2a2a]">
            FY 2023-24
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
