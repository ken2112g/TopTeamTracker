import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api/admin-auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { workspaceId } = await req.json();
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });

  const db = getSupabaseServer();
  // Cascade deletes listings → snapshots via FK, collections, members, activities, notifications
  const { error } = await db.from('workspaces').delete().eq('id', workspaceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { workspaceId, plan } = await req.json();
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });

  const db = getSupabaseServer();
  const updates: Record<string, unknown> = {};
  if (plan) updates.plan = plan;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { error } = await db.from('workspaces').update(updates).eq('id', workspaceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const db = getSupabaseServer();

  const { data: workspaces } = await db
    .from('workspaces')
    .select('id, name, slug, plan, created_at, owner_id, harvest_token')
    .order('created_at', { ascending: false });

  if (!workspaces) return NextResponse.json([]);

  // Get listings count per workspace
  const { data: listingCounts } = await db
    .from('listings')
    .select('workspace_id');

  const countMap = new Map<string, number>();
  for (const l of (listingCounts ?? []) as any[]) {
    countMap.set(l.workspace_id, (countMap.get(l.workspace_id) ?? 0) + 1);
  }

  // Get owner email
  const ownerIds = [...new Set((workspaces as any[]).map((w) => w.owner_id).filter(Boolean))];
  const { data: owners } = ownerIds.length
    ? await db.from('profiles').select('id, email, full_name, is_super_admin').in('id', ownerIds)
    : { data: [] };

  const ownerMap = new Map((owners ?? []).map((o: any) => [o.id, o]));

  return NextResponse.json(
    (workspaces as any[]).map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      plan: w.plan,
      createdAt: w.created_at,
      harvestToken: w.harvest_token,
      listingsCount: countMap.get(w.id) ?? 0,
      owner: ownerMap.get(w.owner_id) ?? null,
    }))
  );
}
