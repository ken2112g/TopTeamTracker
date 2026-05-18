import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api/admin-auth';
import { getSupabaseServer } from '@/lib/supabase/server';

// GET — harvest overview stats
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const db = getSupabaseServer();
  const since24h = new Date(Date.now() - 86_400_000).toISOString();
  const since7d  = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    { count: totalListings },
    { count: activeListings },
    { count: snaps24h },
    { count: snapsHeyetsy24h },
  ] = await Promise.all([
    db.from('listings').select('*', { count: 'exact', head: true }),
    db.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true),
    db.from('snapshots').select('*', { count: 'exact', head: true }).gte('captured_at', since24h),
    db.from('snapshots').select('*', { count: 'exact', head: true })
      .gte('captured_at', since24h).eq('source', 'heyetsy'),
  ]);

  // Listings not harvested in 24h
  const { data: recentSnaps } = await db
    .from('snapshots')
    .select('listing_id')
    .gte('captured_at', since24h);
  const harvestedIds = new Set((recentSnaps ?? []).map((s: any) => s.listing_id));
  const staleListing = (activeListings ?? 0) - harvestedIds.size;

  // Last 7 days harvest timeline
  const { data: timeline } = await db
    .from('snapshots')
    .select('captured_at, source')
    .gte('captured_at', since7d)
    .order('captured_at', { ascending: true });

  // Group by day
  const dayMap = new Map<string, { total: number; heyetsy: number }>();
  for (const s of (timeline ?? []) as any[]) {
    const day = s.captured_at.slice(0, 10);
    if (!dayMap.has(day)) dayMap.set(day, { total: 0, heyetsy: 0 });
    const d = dayMap.get(day)!;
    d.total++;
    if (s.source === 'heyetsy') d.heyetsy++;
  }

  // Listings with stalest snapshots
  const { data: staleRows } = await db
    .from('listings')
    .select('id, etsy_listing_id, title, last_snapshot_at, workspace_id, workspaces(name)')
    .eq('is_active', true)
    .order('last_snapshot_at', { ascending: true, nullsFirst: true })
    .limit(10);

  const { data: lastSnap } = await db
    .from('snapshots')
    .select('captured_at')
    .order('captured_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    totalListings: totalListings ?? 0,
    activeListings: activeListings ?? 0,
    snapshotsLast24h: snaps24h ?? 0,
    heyetsyLast24h: snapsHeyetsy24h ?? 0,
    staleListings: Math.max(0, staleListing),
    lastHarvestAt: lastSnap?.captured_at ?? null,
    timeline: [...dayMap.entries()].map(([day, v]) => ({ day, ...v })),
    staleRows: (staleRows ?? []).map((l: any) => ({
      id: l.id,
      etsyListingId: l.etsy_listing_id,
      title: l.title,
      lastSnapshotAt: l.last_snapshot_at,
      workspaceName: l.workspaces?.name ?? '',
    })),
  });
}
