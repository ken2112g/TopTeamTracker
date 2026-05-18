'use server';

import { getSupabaseServer, getSupabaseAuth } from '@/lib/supabase/server';

async function getCallerWorkspace() {
  const supabaseAuth = await getSupabaseAuth();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;

  const db = getSupabaseServer();
  const { data: member } = await db
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .single();

  if (!member) return null;
  return { userId: user.id, workspaceId: member.workspace_id, role: member.role as string };
}

export async function fetchTeamMembers() {
  const ctx = await getCallerWorkspace();
  if (!ctx) return { ok: false, members: [], error: 'Chưa đăng nhập' };

  const db = getSupabaseServer();
  const { data, error } = await db
    .from('workspace_members')
    .select('id, user_id, role, joined_at')
    .eq('workspace_id', ctx.workspaceId)
    .order('joined_at', { ascending: true });

  if (error) return { ok: false, members: [], error: error.message };

  // Fetch profiles separately
  const userIds = (data ?? []).map((m) => m.user_id);
  const { data: profiles } = await db
    .from('profiles')
    .select('id, email, full_name, avatar_url, username, suspended')
    .in('id', userIds);

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const members = (data ?? []).map((m) => ({
    id: m.id as string,
    userId: m.user_id as string,
    role: m.role as 'owner' | 'admin' | 'member',
    joinedAt: m.joined_at as string,
    email: profileMap[m.user_id]?.email ?? '',
    name: profileMap[m.user_id]?.full_name ?? '',
    avatarUrl: profileMap[m.user_id]?.avatar_url as string | undefined,
    username: profileMap[m.user_id]?.username as string | undefined,
    suspended: profileMap[m.user_id]?.suspended ?? false,
  }));

  return { ok: true, members, workspaceId: ctx.workspaceId };
}

export async function createTeamMember(data: {
  name: string;
  email: string;
  username?: string;
  password: string;
  role: 'admin' | 'member';
}) {
  const ctx = await getCallerWorkspace();
  if (!ctx) return { ok: false, error: 'Chưa đăng nhập' };
  if (ctx.role !== 'owner' && ctx.role !== 'admin') return { ok: false, error: 'Không có quyền' };

  const db = getSupabaseServer();

  // Create auth user without email confirmation
  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email: data.email.trim(),
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.name.trim() },
  });

  if (createErr) {
    return {
      ok: false,
      error: createErr.message.includes('already registered') || createErr.message.includes('already been registered')
        ? 'Email này đã được đăng ký'
        : createErr.message,
    };
  }

  const newUserId = created.user.id;

  // Upsert profile
  await db.from('profiles').upsert({
    id: newUserId,
    email: data.email.trim(),
    full_name: data.name.trim(),
    ...(data.username ? { username: data.username.trim() } : {}),
  }, { onConflict: 'id' });

  // Add to workspace
  const { error: memberErr } = await db.from('workspace_members').insert({
    workspace_id: ctx.workspaceId,
    user_id: newUserId,
    role: data.role,
  });

  if (memberErr) {
    // Rollback: delete auth user
    await db.auth.admin.deleteUser(newUserId);
    return { ok: false, error: 'Không thêm được vào workspace' };
  }

  return { ok: true };
}

export async function setMemberRole(memberId: string, role: 'admin' | 'member') {
  const ctx = await getCallerWorkspace();
  if (!ctx || ctx.role !== 'owner') return { ok: false, error: 'Không có quyền' };

  const db = getSupabaseServer();
  const { error } = await db
    .from('workspace_members')
    .update({ role })
    .eq('id', memberId)
    .eq('workspace_id', ctx.workspaceId);

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteMember(memberId: string) {
  const ctx = await getCallerWorkspace();
  if (!ctx || (ctx.role !== 'owner' && ctx.role !== 'admin')) return { ok: false, error: 'Không có quyền' };

  const db = getSupabaseServer();
  const { error } = await db
    .from('workspace_members')
    .delete()
    .eq('id', memberId)
    .eq('workspace_id', ctx.workspaceId);

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function toggleSuspend(userId: string, suspend: boolean) {
  const ctx = await getCallerWorkspace();
  if (!ctx || (ctx.role !== 'owner' && ctx.role !== 'admin')) return { ok: false, error: 'Không có quyền' };

  const db = getSupabaseServer();

  // Ban/unban via admin API
  const { error } = suspend
    ? await db.auth.admin.updateUserById(userId, { ban_duration: '876600h' })
    : await db.auth.admin.updateUserById(userId, { ban_duration: 'none' });

  if (error) return { ok: false, error: error.message };

  // Also update profiles.suspended for display
  await db.from('profiles').update({ suspended: suspend }).eq('id', userId);

  return { ok: true };
}

export async function resetMemberPassword(userId: string, newPassword: string) {
  const ctx = await getCallerWorkspace();
  if (!ctx || (ctx.role !== 'owner' && ctx.role !== 'admin')) return { ok: false, error: 'Không có quyền' };

  const db = getSupabaseServer();
  const { error } = await db.auth.admin.updateUserById(userId, { password: newPassword });

  return error ? { ok: false, error: error.message } : { ok: true };
}
