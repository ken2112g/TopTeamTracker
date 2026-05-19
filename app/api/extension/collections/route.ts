import { NextRequest, NextResponse } from 'next/server';
import { getExtensionUser } from '@/lib/api/extension-auth';
import { getSupabaseServer } from '@/lib/supabase/server';

function cors(req: NextRequest) {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': origin.startsWith('chrome-extension://') ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...(origin.startsWith('chrome-extension://') ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { headers: cors(req) });
}

export async function GET(req: NextRequest) {
  const headers = cors(req);
  try {
    const userId = await getExtensionUser(req);
    if (!userId) return NextResponse.json([], { headers });

    const db = getSupabaseServer();
    const { data: member } = await db
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })
      .limit(1)
      .single();

    if (!member?.workspace_id) return NextResponse.json([], { headers });

    const { data } = await db
      .from('collections')
      .select('id, name, color, keyword')
      .eq('workspace_id', member.workspace_id)
      .order('created_at', { ascending: false });

    return NextResponse.json(data ?? [], { headers });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers });
  }
}
