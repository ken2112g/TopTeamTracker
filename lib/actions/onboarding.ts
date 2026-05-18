'use server';

import { getSupabaseServer, getSupabaseAuth } from '@/lib/supabase/server';

function slugify(text: string) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50) || `workspace-${Date.now()}`;
}

export async function createWorkspace(
  name: string,
  accountType: 'personal' | 'team' = 'team',
): Promise<{ ok: boolean; error?: string }> {
  const supabaseAuth = await getSupabaseAuth();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return { ok: false, error: 'Chưa đăng nhập' };

  const db = getSupabaseServer(); // service role — bypass RLS

  // Đảm bảo profile tồn tại
  await db.from('profiles').upsert({
    id: user.id,
    email: user.email ?? '',
    full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
    avatar_url: user.user_metadata?.avatar_url ?? null,
  }, { onConflict: 'id' });

  // Không tạo duplicate — nếu đã có workspace thì trả về ok luôn
  const { data: existing } = await db
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();
  if (existing) return { ok: true };

  // Tạo workspace
  const slug = slugify(name);
  const { data: ws, error: wsErr } = await db
    .from('workspaces')
    .insert({
      name: name.trim(),
      slug,
      owner_id: user.id,
      account_type: accountType,
      harvest_token: crypto.randomUUID(),
    })
    .select()
    .single();

  if (wsErr) {
    if (wsErr.code === '23505') return { ok: false, error: 'Tên workspace đã tồn tại. Thử tên khác.' };
    return { ok: false, error: 'Không tạo được workspace. Thử lại.' };
  }

  // Thêm owner vào workspace_members
  await db.from('workspace_members').insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: 'owner',
  });

  return { ok: true };
}
