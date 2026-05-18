import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api/admin-auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const db = getSupabaseServer();

  // Get all active listing IDs
  const { data: listings } = await db
    .from('listings')
    .select('id')
    .eq('is_active', true);

  if (!listings?.length) return NextResponse.json({ retried: 0 });

  const listingIds = (listings as any[]).map((l) => l.id);

  // Get latest snapshot per listing (ordered desc → first occurrence = latest)
  const { data: snaps } = await db
    .from('snapshots')
    .select('listing_id, confidence, source, captured_at')
    .in('listing_id', listingIds)
    .order('captured_at', { ascending: false });

  const snapMap = new Map<string, any>();
  for (const s of (snaps ?? []) as any[]) {
    if (!snapMap.has(s.listing_id)) snapMap.set(s.listing_id, s);
  }

  // Collect listing IDs with error status (snap exists but confidence < 0.5)
  const erroredIds = listingIds.filter((id: string) => {
    const snap = snapMap.get(id);
    if (!snap) return false;
    if (snap.source === 'heyetsy' && snap.confidence >= 0.8) return false;
    if (snap.confidence >= 0.5) return false;
    return true;
  });

  if (!erroredIds.length) return NextResponse.json({ retried: 0 });

  // Reset last_snapshot_at → daemon picks them up first in next harvest run
  await db
    .from('listings')
    .update({ last_snapshot_at: null })
    .in('id', erroredIds);

  return NextResponse.json({ retried: erroredIds.length });
}
