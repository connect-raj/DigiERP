import { ReactNode } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="text-on-surface font-body-md text-body-md selection:bg-surface-container-highest flex h-screen overflow-hidden bg-[#181818]">
      <Sidebar />
      <div className="ml-[260px] flex h-screen flex-1 flex-col overflow-hidden bg-[#181818]">
        <Header />
        <main className="mt-[88px] flex-1 overflow-y-auto bg-[#181818] p-10">
          <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col gap-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
