'use server';

import { getSupabaseServer, getSupabaseAuth } from '@/lib/supabase/server';

export async function upgradeToTeam(): Promise<{ ok: boolean; error?: string }> {
  const supabaseAuth = await getSupabaseAuth();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return { ok: false, error: 'Chưa đăng nhập' };

  const db = getSupabaseServer();

  // Chỉ owner mới được đổi account_type
  const { data: member } = await db
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .single();

  if (!member || member.role !== 'owner') {
    return { ok: false, error: 'Chỉ Admin workspace mới có quyền này' };
  }

  const { error } = await db
    .from('workspaces')
    .update({ account_type: 'team' })
    .eq('id', member.workspace_id);

  return error ? { ok: false, error: error.message } : { ok: true };
}
