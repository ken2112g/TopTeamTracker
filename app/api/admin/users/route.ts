import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api/admin-auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const db = getSupabaseServer();

  const { data: profiles } = await db
    .from('profiles')
    .select('id, email, full_name, username, is_super_admin, suspended, created_at')
    .order('created_at', { ascending: false });

  if (!profiles) return NextResponse.json([]);

  // Get workspace membership for each user
  const { data: members } = await db
    .from('workspace_members')
    .select('user_id, role, workspace_id, workspaces(name)');

  const memberMap = new Map<string, { role: string; workspaceName: string }[]>();
  for (const m of (members ?? []) as any[]) {
    if (!memberMap.has(m.user_id)) memberMap.set(m.user_id, []);
    memberMap.get(m.user_id)!.push({ role: m.role, workspaceName: m.workspaces?.name ?? '' });
  }

  return NextResponse.json(
    profiles.map((p: any) => ({
      id: p.id,
      email: p.email,
      name: p.full_name,
      username: p.username,
      isSuperAdmin: p.is_super_admin,
      suspended: p.suspended,
      createdAt: p.created_at,
      workspaces: memberMap.get(p.id) ?? [],
    }))
  );
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  // Prevent modifying yourself
  if (userId === auth.userId) {
    return NextResponse.json({ error: 'Không thể tự sửa chính mình' }, { status: 400 });
  }

  const db = getSupabaseServer();
  const updates: Record<string, unknown> = {};

  if ('suspended' in body)    updates.suspended = Boolean(body.suspended);
  if ('isSuperAdmin' in body) updates.is_super_admin = Boolean(body.isSuperAdmin);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { error } = await db.from('profiles').update(updates).eq('id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
