'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/useAuthStore';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoaded, setLoaded } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  // Fallback in case onRehydrateStorage didn't fire (first load, no storage)
  useEffect(() => {
    if (!isLoaded) setLoaded();
  }, [isLoaded, setLoaded]);

  const isAuthPage = pathname.startsWith('/auth');

  useEffect(() => {
    if (!isLoaded) return;
    if (!currentUser && !isAuthPage) {
      router.replace('/auth/login');
    }
    if (currentUser && isAuthPage) {
      router.replace('/');
    }
  }, [currentUser, isLoaded, isAuthPage, router]);

  // Loading splash
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-bg-0 grid place-items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange grid place-items-center font-display font-extrabold text-white text-3xl shadow-[0_8px_24px_rgba(241,100,30,0.35)] animate-pulse">
            E
          </div>
          <div className="font-mono text-[12px] text-text-2 tracking-[0.2em] uppercase animate-pulse">
            Đang tải...
          </div>
        </div>
      </div>
    );
  }

  // Auth pages — no sidebar
  if (isAuthPage) {
    return <div className="min-h-screen bg-bg-0">{children}</div>;
  }

  // Not logged in — show nothing while redirect fires
  if (!currentUser) return null;

  // Main app layout
  return (
    <div className="grid grid-cols-[260px_1fr] min-h-screen relative z-[2]">
      <Sidebar />
      <main className="flex flex-col min-h-screen">
        <Topbar />
        {children}
      </main>
    </div>
  );
}
