import { ReactNode } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#181818] text-on-surface font-body-md text-body-md selection:bg-surface-container-highest">
      <Sidebar />
      <div className="ml-[260px] flex-1 flex flex-col h-screen overflow-hidden bg-[#181818]">
        <Header />
        <main className="flex-1 overflow-y-auto mt-[88px] p-10 bg-[#181818]">
          <div className="max-w-[1600px] w-full mx-auto flex flex-col h-full gap-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
