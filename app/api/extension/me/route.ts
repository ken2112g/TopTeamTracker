import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAuth, getSupabaseServer } from '@/lib/supabase/server';

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const supabase = await getSupabaseAuth();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ user: null }, { headers });

    const db = getSupabaseServer();
    const [{ data: member }, { data: profile }] = await Promise.all([
      db.from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: true })
        .limit(1)
        .single(),
      db.from('profiles')
        .select('is_super_admin, full_name')
        .eq('id', user.id)
        .single(),
    ]);

    const { data: ws } = member?.workspace_id
      ? await db.from('workspaces').select('name').eq('id', member.workspace_id).single()
      : { data: null };

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email ?? '',
        name: profile?.full_name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
        avatarUrl: user.user_metadata?.avatar_url ?? null,
        role: member?.role ?? 'member',
        workspaceName: ws?.name ?? null,
        isSuperAdmin: profile?.is_super_admin ?? false,
      },
    }, { headers });
  } catch {
    return NextResponse.json({ user: null }, { headers });
  }
}
