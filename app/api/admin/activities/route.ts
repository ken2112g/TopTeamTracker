import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api/admin-auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '200'), 500);
  const wsId  = searchParams.get('workspace_id') ?? null;
  const action = searchParams.get('action') ?? null;

  const db = getSupabaseServer();

  let q = db
    .from('activities')
    .select('id, workspace_id, action, target_type, target_id, target_name, meta, created_at, workspaces(name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (wsId)   q = q.eq('workspace_id', wsId);
  if (action) q = q.eq('action', action);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      workspaceName: r.workspaces?.name ?? '—',
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id ?? null,
      targetName: r.target_name ?? null,
      meta: r.meta ?? null,
      createdAt: r.created_at,
    }))
  );
}
