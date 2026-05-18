'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { getSupabaseClient } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoaded, setCurrentUser, setLoaded, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname.startsWith('/auth') || pathname === '/onboarding';
  const isAdminPage = pathname.startsWith('/admin');

  useEffect(() => {
    if (isAuthPage || isAdminPage) return;

    const supabase = getSupabaseClient();

    async function syncSession(supabaseUser: any) {
      if (!supabaseUser) { logout(); return; }

      // Query workspace_members trước (tránh circular RLS join)
      const { data: member } = await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', supabaseUser.id)
        .order('joined_at', { ascending: true })
        .limit(1)
        .single();

      if (!member) {
        setLoaded();
        router.replace('/onboarding');
        return;
      }

      // Query workspace + profile song song
      const [{ data: ws }, { data: profile }] = await Promise.all([
        supabase.from('workspaces').select('name, account_type').eq('id', member.workspace_id).single(),
        supabase.from('profiles').select('is_super_admin').eq('id', supabaseUser.id).single(),
      ]);

      const isSuperAdmin = profile?.is_super_admin === true;
      setCurrentUser({
        id: supabaseUser.id,
        email: supabaseUser.email ?? '',
        name: supabaseUser.user_metadata?.full_name ?? supabaseUser.email?.split('@')[0] ?? 'User',
        avatarUrl: supabaseUser.user_metadata?.avatar_url,
        role: member.role as 'owner' | 'admin' | 'member',
        workspaceId: member.workspace_id,
        workspaceName: ws?.name ?? 'Workspace',
        isSuperAdmin,
        accountType: (ws?.account_type as 'team' | 'personal') ?? 'team',
        teamId: member.workspace_id,
      });
      setLoaded();
      // Super admin on normal app → redirect to admin panel
      if (isSuperAdmin && pathname === '/') router.replace('/admin');
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [isAuthPage, isAdminPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auth + Admin pages: render trực tiếp, không cần sidebar/auth check ở đây
  if (isAuthPage || isAdminPage) return <>{children}</>;

  // Loading splash
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-bg-0 grid place-items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange grid place-items-center font-display font-extrabold text-white text-3xl shadow-[0_8px_24px_rgba(241,100,30,0.35)] animate-pulse">
            T
          </div>
          <div className="font-mono text-[12px] text-text-2 tracking-[0.2em] uppercase animate-pulse">
            Đang tải...
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <>
      <div className="fixed left-0 top-0 h-screen w-[260px] z-20 overflow-y-auto">
        <Sidebar />
      </div>
      <div className="pl-[260px] pt-[68px] min-h-screen flex flex-col relative z-[2]">
        <Topbar />
        <main className="flex-1">{children}</main>
      </div>
    </>
  );
}
