'use server';

import { getSupabaseServer, getSupabaseAuth } from '@/lib/supabase/server';
import { getServerWorkspaceId } from '@/lib/auth';

// Dành cho mọi user — chỉ lấy token của workspace mình
export async function getMyHarvestToken(): Promise<{ token: string | null; error?: string }> {
  const wsId = await getServerWorkspaceId();
  if (!wsId) return { token: null, error: 'Chưa đăng nhập' };
  const db = getSupabaseServer();
  const { data } = await db.from('workspaces').select('harvest_token').eq('id', wsId).single();
  return { token: data?.harvest_token ?? null };
}

export async function regenerateMyHarvestToken(): Promise<{ token: string | null; error?: string }> {
  const wsId = await getServerWorkspaceId();
  if (!wsId) return { token: null, error: 'Chưa đăng nhập' };
  const db = getSupabaseServer();
  const { data, error } = await db
    .from('workspaces')
    .update({ harvest_token: crypto.randomUUID() })
    .eq('id', wsId)
    .select('harvest_token')
    .single();
  if (error) return { token: null, error: error.message };
  return { token: data.harvest_token };
}

async function getSuperAdminWorkspace() {
  const supabaseAuth = await getSupabaseAuth();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;

  const db = getSupabaseServer();

  // Chỉ super admin mới được thao tác với harvest token
  const { data: profile } = await db
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_super_admin) return null;

  const { data: member } = await db
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single();

  return member?.workspace_id as string | null;
}

export async function getHarvestToken(): Promise<{ token: string | null; error?: string }> {
  const wsId = await getSuperAdminWorkspace();
  if (!wsId) return { token: null, error: 'Chỉ Server Admin mới xem được token này' };

  const db = getSupabaseServer();
  const { data } = await db.from('workspaces').select('harvest_token').eq('id', wsId).single();
  return { token: data?.harvest_token ?? null };
}

export async function regenerateHarvestToken(): Promise<{ token: string | null; error?: string }> {
  const wsId = await getSuperAdminWorkspace();
  if (!wsId) return { token: null, error: 'Chỉ Server Admin mới đổi được token này' };

  const db = getSupabaseServer();
  const { data, error } = await db
    .from('workspaces')
    .update({ harvest_token: crypto.randomUUID() })
    .eq('id', wsId)
    .select('harvest_token')
    .single();

  if (error) return { token: null, error: error.message };
  return { token: data.harvest_token };
}
