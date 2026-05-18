import { NextRequest, NextResponse } from 'next/server';
import { validateHarvestToken, CORS_HEADERS, unauthorized } from '@/lib/api/harvest-auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const auth = await validateHarvestToken(req);
  if (!auth) return unauthorized();

  const db = getSupabaseServer();
  const { data: ws } = await db.from('workspaces').select('name').eq('id', auth.workspaceId).single();

  // Super admin → đếm tất cả listings; ngược lại chỉ đếm workspace
  let countQuery = db.from('listings').select('id', { count: 'exact', head: true }).eq('is_active', true);
  if (!auth.isSuperAdmin) countQuery = countQuery.eq('workspace_id', auth.workspaceId) as typeof countQuery;
  const { count } = await countQuery;

  return NextResponse.json(
    {
      ok: true,
      workspaceName: ws?.name ?? '',
      listingCount: count ?? 0,
      isSuperAdmin: auth.isSuperAdmin,
    },
    { headers: CORS_HEADERS }
  );
}
