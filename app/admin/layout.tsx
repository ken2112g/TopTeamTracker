import { redirect } from 'next/navigation';
import { getSupabaseAuth, getSupabaseServer } from '@/lib/supabase/server';
import AdminSidebar from './AdminSidebar';

export const metadata = { title: 'Admin — TopTeamTracker' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseAuth();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const db = getSupabaseServer();
  const { data: profile } = await db
    .from('profiles')
    .select('is_super_admin, full_name, email')
    .eq('id', user.id)
    .single();

  if (!profile?.is_super_admin) redirect('/');

  return (
    <div className="flex h-screen bg-bg-0 overflow-hidden">
      <div className="flex-shrink-0">
        <AdminSidebar />
      </div>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
