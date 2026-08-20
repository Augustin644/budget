'use client';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function AppShell({ children }) {
  return (
    <div className="flex min-h-screen bg-[#0B0F1A]">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
