import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api/admin-auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const db = getSupabaseServer();
  const since24h = new Date(Date.now() - 86_400_000).toISOString();

  const [
    { count: usersCount },
    { count: workspacesCount },
    { count: listingsCount },
    { count: snapshotsToday },
    { count: activeListings },
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('workspaces').select('*', { count: 'exact', head: true }),
    db.from('listings').select('*', { count: 'exact', head: true }),
    db.from('snapshots').select('*', { count: 'exact', head: true }).gte('captured_at', since24h),
    db.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  // Listings with snapshots in last 24h
  const { data: recentSnaps } = await db
    .from('snapshots')
    .select('listing_id')
    .gte('captured_at', since24h);
  const harvestedToday = new Set(recentSnaps?.map((s: any) => s.listing_id) ?? []).size;

  // Last snapshot time
  const { data: lastSnap } = await db
    .from('snapshots')
    .select('captured_at')
    .order('captured_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    usersCount: usersCount ?? 0,
    workspacesCount: workspacesCount ?? 0,
    listingsCount: listingsCount ?? 0,
    activeListings: activeListings ?? 0,
    snapshotsToday: snapshotsToday ?? 0,
    harvestedToday,
    lastHarvestAt: lastSnap?.captured_at ?? null,
  });
}
