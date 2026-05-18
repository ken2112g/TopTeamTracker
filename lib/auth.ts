import { cache } from 'react';
import { getSupabaseAuth, getSupabaseServer } from './supabase/server';

export const getServerUser = cache(async () => {
  const supabase = await getSupabaseAuth();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
});

export const getServerWorkspaceId = cache(async (): Promise<string | null> => {
  const user = await getServerUser();
  if (!user) return null;

  const db = getSupabaseServer();
  const { data } = await db
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data?.workspace_id) return data.workspace_id;

  // User chưa có workspace → tự tạo (xảy ra lần đầu đăng nhập)
  const displayName =
    user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'My Workspace';
  const slug =
    displayName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40)
    + '-' + Date.now().toString(36);

  const { data: ws } = await db
    .from('workspaces')
    .insert({
      name: displayName,
      slug,
      owner_id: user.id,
      account_type: 'personal',
      harvest_token: crypto.randomUUID(),
    })
    .select('id')
    .single();

  if (!ws) return null;

  await db.from('workspace_members').insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: 'owner',
  });

  return ws.id;
});
