'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const isRouteActive = (route: string) => {
    return pathname.startsWith(route);
  };

  return (
    <nav className="bg-[#1c1c1c] text-primary font-body-md text-body-md fixed left-0 top-0 h-full w-[260px] border-r-[0.5px] border-[#333] flex flex-col py-8 z-50 overflow-y-auto">
      <div className="px-8 mb-10 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-surface-container-high border-[0.5px] border-[#444] text-primary flex items-center justify-center font-bold font-display text-xl shadow-sm">DE</div>
        <div>
          <h1 className="font-display font-semibold tracking-tight text-base leading-tight">DigiERP</h1>
          <p className="text-[11px] text-on-surface-variant tracking-widest uppercase font-medium mt-0.5">ERP V1</p>
        </div>
      </div>
      
      <div className="flex flex-col gap-8">
        <div>
          <div className="px-8 mb-3">
            <h2 className="font-label-caps text-label-caps text-on-surface-variant">MAIN</h2>
          </div>
          <ul className="flex flex-col w-full px-5 space-y-1">
            <Link href="/" className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg cursor-pointer duration-200 transition-all ${pathname === '/' ? 'bg-[#2a2a2a] text-primary border-[0.5px] border-[#444]' : 'text-on-surface-variant hover:bg-[#252525] hover:text-primary'}`}>
              <span className="material-symbols-outlined text-[20px]" style={pathname === '/' ? { fontVariationSettings: "'FILL' 1" } : {}}>dashboard</span>
              <span className="font-medium text-[13px]">Dashboard</span>
            </Link>
            <Link href="/products" className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg cursor-pointer duration-200 transition-all ${isRouteActive('/products') ? 'bg-[#2a2a2a] text-primary border-[0.5px] border-[#444]' : 'text-on-surface-variant hover:bg-[#252525] hover:text-primary'}`}>
              <span className="material-symbols-outlined text-[20px]" style={isRouteActive('/products') ? { fontVariationSettings: "'FILL' 1" } : {}}>inventory_2</span>
              <span className="font-medium text-[13px]">Products</span>
            </Link>
            <Link href="/categories" className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg cursor-pointer duration-200 transition-all ${isRouteActive('/categories') ? 'bg-[#2a2a2a] text-primary border-[0.5px] border-[#444]' : 'text-on-surface-variant hover:bg-[#252525] hover:text-primary'}`}>
              <span className="material-symbols-outlined text-[20px]" style={isRouteActive('/categories') ? { fontVariationSettings: "'FILL' 1" } : {}}>category</span>
              <span className="font-medium text-[13px]">Categories</span>
            </Link>
            <Link href="/vendors" className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg cursor-pointer duration-200 transition-all ${isRouteActive('/vendors') ? 'bg-[#2a2a2a] text-primary border-[0.5px] border-[#444]' : 'text-on-surface-variant hover:bg-[#252525] hover:text-primary'}`}>
              <span className="material-symbols-outlined text-[20px]" style={isRouteActive('/vendors') ? { fontVariationSettings: "'FILL' 1" } : {}}>factory</span>
              <span className="font-medium text-[13px]">Vendors</span>
            </Link>
          </ul>
        </div>
      </div>
      
      <div className="mt-auto w-full px-5 pt-8 border-t-[0.5px] border-[#333] mt-8">
        <div className="w-full flex items-center gap-3 h-10 px-3 rounded-lg text-on-surface-variant hover:bg-[#252525] hover:text-primary transition-all cursor-pointer duration-200" title="Settings">
          <span className="material-symbols-outlined text-[20px]">settings</span>
          <span className="font-medium text-[13px]">Settings</span>
        </div>
      </div>
    </nav>
  );
}
