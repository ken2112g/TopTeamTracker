import { NextRequest, NextResponse } from 'next/server';
import { getExtensionUser } from '@/lib/api/extension-auth';
import { getSupabaseServer } from '@/lib/supabase/server';

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Origin': origin.startsWith('chrome-extension://') ? origin : '*',
    ...(origin.startsWith('chrome-extension://') ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const headers = corsHeaders(req);
  try {
    const userId = await getExtensionUser(req);
    if (!userId) return NextResponse.json({ user: null }, { headers });

    const db = getSupabaseServer();
    const [{ data: member }, { data: profile }, { data: authUser }] = await Promise.all([
      db.from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', userId)
        .order('joined_at', { ascending: true })
        .limit(1)
        .single(),
      db.from('profiles')
        .select('is_super_admin, full_name')
        .eq('id', userId)
        .single(),
      db.auth.admin.getUserById(userId),
    ]);

    const { data: ws } = member?.workspace_id
      ? await db.from('workspaces').select('name').eq('id', member.workspace_id).single()
      : { data: null };

    return NextResponse.json({
      user: {
        id: userId,
        email: authUser?.user?.email ?? '',
        name: profile?.full_name ?? authUser?.user?.user_metadata?.full_name ?? authUser?.user?.email?.split('@')[0] ?? 'User',
        avatarUrl: authUser?.user?.user_metadata?.avatar_url ?? null,
        role: member?.role ?? 'member',
        workspaceName: ws?.name ?? null,
        isSuperAdmin: profile?.is_super_admin ?? false,
      },
    }, { headers });
  } catch {
    return NextResponse.json({ user: null }, { headers });
  }
}
