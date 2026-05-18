import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api/admin-auth';
import { getSupabaseServer } from '@/lib/supabase/server';

// POST /api/admin/harvest/trigger
// Body: { workspaceId?: string }  — omit to trigger for all active listings
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const workspaceId: string | null = body.workspaceId ?? null;

  const db = getSupabaseServer();

  let q = db.from('listings').update({ last_snapshot_at: null }).eq('is_active', true);
  if (workspaceId) q = q.eq('workspace_id', workspaceId);

  const { error, count } = await (q as any).select('id', { count: 'exact', head: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fallback: count separately if needed
  let affected = count ?? 0;
  if (!affected) {
    let cq = db.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true);
    if (workspaceId) cq = cq.eq('workspace_id', workspaceId);
    const { count: c } = await cq;
    affected = c ?? 0;
  }

  return NextResponse.json({ ok: true, queued: affected });
}
