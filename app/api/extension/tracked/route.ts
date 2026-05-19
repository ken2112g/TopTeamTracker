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
      .from('listings')
      .select('id, etsy_listing_id, collection_id, collections(name, color)')
      .eq('workspace_id', member.workspace_id)
      .eq('is_active', true);

    const result = (data ?? []).map((l: any) => ({
      etsyListingId: l.etsy_listing_id,
      collectionId: l.collection_id,
      collectionName: l.collections?.name ?? null,
      collectionColor: l.collections?.color ?? null,
    }));

    return NextResponse.json(result, { headers });
  } catch {
    return NextResponse.json([], { headers });
  }
}
