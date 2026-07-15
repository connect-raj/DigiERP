'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './ui/Sidebar';
import Header from './ui/Header';

export default function DashboardShell({ children }: { children: ReactNode }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Close mobile nav on route change (legitimate use of setState in effect for route-based state)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileNavOpen(false);
  }, [pathname]);

  const toggleNav = () => setIsMobileNavOpen(!isMobileNavOpen);
  const closeNav = () => setIsMobileNavOpen(false);

  return (
    <div className="text-on-surface font-body-md text-body-md selection:bg-surface-container-highest flex h-screen overflow-hidden bg-[#181818]">
      <Sidebar isOpen={isMobileNavOpen} onClose={closeNav} />

      <div className="flex w-full flex-1 flex-col overflow-hidden">
        <Header onToggleSidebar={toggleNav} />
        <main className="flex-1 overflow-y-auto bg-[#181818] p-4 sm:p-6 lg:ml-[260px] lg:p-10">
          <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col gap-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
