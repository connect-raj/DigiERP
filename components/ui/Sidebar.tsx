'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isRouteActive = (route: string) => {
    return pathname.startsWith(route);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Failed to log out', error);
    }
    router.push('/login');
  };

  return (
    <nav className="text-primary font-body-md text-body-md fixed top-0 left-0 z-50 flex h-full w-[260px] flex-col overflow-y-auto border-r-[0.5px] border-[#333] bg-[#1c1c1c] py-8">
      <div className="mb-10 flex items-center gap-4 px-8">
        <div className="bg-surface-container-high text-primary font-display flex h-11 w-11 items-center justify-center rounded-xl border-[0.5px] border-[#444] text-xl font-bold shadow-sm">
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

      <div className="flex flex-col gap-8">
        <div>
          <div className="mb-3 px-8">
            <h2 className="font-label-caps text-label-caps text-on-surface-variant">MAIN</h2>
          </div>
          <ul className="flex w-full flex-col space-y-1 px-5">
            <Link
              href="/"
              className={`flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 transition-all duration-200 ${pathname === '/' ? 'text-primary border-[0.5px] border-[#444] bg-[#2a2a2a]' : 'text-on-surface-variant hover:text-primary hover:bg-[#252525]'}`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={pathname === '/' ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                dashboard
              </span>
              <span className="text-[13px] font-medium">Dashboard</span>
            </Link>
            <Link
              href="/products"
              className={`flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 transition-all duration-200 ${isRouteActive('/products') ? 'text-primary border-[0.5px] border-[#444] bg-[#2a2a2a]' : 'text-on-surface-variant hover:text-primary hover:bg-[#252525]'}`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isRouteActive('/products') ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                inventory_2
              </span>
              <span className="text-[13px] font-medium">Products</span>
            </Link>
            <Link
              href="/categories"
              className={`flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 transition-all duration-200 ${isRouteActive('/categories') ? 'text-primary border-[0.5px] border-[#444] bg-[#2a2a2a]' : 'text-on-surface-variant hover:text-primary hover:bg-[#252525]'}`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isRouteActive('/categories') ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                category
              </span>
              <span className="text-[13px] font-medium">Categories</span>
            </Link>
            <Link
              href="/vendors"
              className={`flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 transition-all duration-200 ${isRouteActive('/vendors') ? 'text-primary border-[0.5px] border-[#444] bg-[#2a2a2a]' : 'text-on-surface-variant hover:text-primary hover:bg-[#252525]'}`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isRouteActive('/vendors') ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                factory
              </span>
              <span className="text-[13px] font-medium">Vendors</span>
            </Link>
            <Link
              href="/customers"
              className={`flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 transition-all duration-200 ${isRouteActive('/customers') ? 'text-primary border-[0.5px] border-[#444] bg-[#2a2a2a]' : 'text-on-surface-variant hover:text-primary hover:bg-[#252525]'}`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isRouteActive('/customers') ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                groups
              </span>
              <span className="text-[13px] font-medium">Customers</span>
            </Link>
            <Link
              href="/purchases"
              className={`flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 transition-all duration-200 ${isRouteActive('/purchases') ? 'text-primary border-[0.5px] border-[#444] bg-[#2a2a2a]' : 'text-on-surface-variant hover:text-primary hover:bg-[#252525]'}`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isRouteActive('/purchases') ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                shopping_cart
              </span>
              <span className="text-[13px] font-medium">Purchases</span>
            </Link>
            <Link
              href="/dispatch-entries"
              className={`flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 transition-all duration-200 ${isRouteActive('/dispatch-entries') ? 'text-primary border-[0.5px] border-[#444] bg-[#2a2a2a]' : 'text-on-surface-variant hover:text-primary hover:bg-[#252525]'}`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={
                  isRouteActive('/dispatch-entries') ? { fontVariationSettings: "'FILL' 1" } : {}
                }
              >
                local_shipping
              </span>
              <span className="text-[13px] font-medium">Dispatch Entries</span>
            </Link>
            <Link
              href="/invoices"
              className={`flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 transition-all duration-200 ${isRouteActive('/invoices') ? 'text-primary border-[0.5px] border-[#444] bg-[#2a2a2a]' : 'text-on-surface-variant hover:text-primary hover:bg-[#252525]'}`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isRouteActive('/invoices') ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                receipt_long
              </span>
              <span className="text-[13px] font-medium">Invoices</span>
            </Link>
            <Link
              href="/payments"
              className={`flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 transition-all duration-200 ${isRouteActive('/payments') ? 'text-primary border-[0.5px] border-[#444] bg-[#2a2a2a]' : 'text-on-surface-variant hover:text-primary hover:bg-[#252525]'}`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isRouteActive('/payments') ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                payments
              </span>
              <span className="text-[13px] font-medium">Payments</span>
            </Link>
          </ul>
        </div>
      </div>

      <div className="mt-8 mt-auto flex w-full flex-col space-y-1 border-t-[0.5px] border-[#333] px-5 pt-8">
        <Link
          href="/settings"
          title="Settings"
          className={`flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 transition-all duration-200 ${isRouteActive('/settings') ? 'text-primary border-[0.5px] border-[#444] bg-[#2a2a2a]' : 'text-on-surface-variant hover:text-primary hover:bg-[#252525]'}`}
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={isRouteActive('/settings') ? { fontVariationSettings: "'FILL' 1" } : {}}
          >
            settings
          </span>
          <span className="text-[13px] font-medium">Settings</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="text-on-surface-variant hover:text-primary flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left transition-all duration-200 hover:bg-[#252525]"
          title="Logout"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="text-[13px] font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
