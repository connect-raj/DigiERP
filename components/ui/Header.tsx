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
    <header className="bg-[#181818] text-primary font-headline-md text-headline-md fixed top-0 right-0 w-[calc(100%-260px)] h-[88px] border-b-[0.5px] border-[#333] flex justify-between items-center px-10 z-40 backdrop-blur-md bg-opacity-90">
      <div className="font-display text-display text-primary flex items-center gap-4">
        <span className="text-[22px] font-semibold tracking-tight">{getPageTitle()}</span>
      </div>
      <div className="flex items-center gap-4 text-sm font-body-md">
        <div className="flex items-center gap-2 mr-2">
          <span className="bg-[#222] border-[0.5px] border-[#333] px-3.5 py-1.5 rounded-md text-[12px] font-medium text-[#c4c7c8] cursor-pointer hover:bg-[#2a2a2a] transition-all">FY 2023-24</span>
        </div>
        <div className="w-10 h-10 rounded-full border-[0.5px] border-[#333] flex items-center justify-center bg-[#222]">
           <span className="material-symbols-outlined text-[20px] text-on-surface-variant">person</span>
        </div>
      </div>
    </header>
  );
}
