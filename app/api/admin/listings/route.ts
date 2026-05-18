import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api/admin-auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const pageSize = 50;
  const offset = (page - 1) * pageSize;
  const workspaceId = searchParams.get('workspace_id');
  const filterStatus = searchParams.get('status'); // 'ok' | 'warn' | 'error' | 'never'

  const db = getSupabaseServer();

  let query = db
    .from('listings')
    .select(
      'id, etsy_listing_id, title, shop_name, url, is_active, workspace_id, last_snapshot_at, current_price, rating, reviews_count, workspaces(name)',
      { count: 'exact' }
    )
    .order('last_snapshot_at', { ascending: true, nullsFirst: true })
    .range(offset, offset + pageSize - 1);

  if (workspaceId) query = query.eq('workspace_id', workspaceId) as typeof query;

  const { data, count } = await query;
  if (!data) return NextResponse.json({ listings: [], total: 0, page, pageSize });

  // Lấy snapshot mới nhất của mỗi listing trong trang này
  const listingIds = data.map((l: any) => l.id);
  const { data: snaps } = await db
    .from('snapshots')
    .select('listing_id, captured_at, source, confidence, sold_total, views_total, price')
    .in('listing_id', listingIds)
    .order('captured_at', { ascending: false });

  // Giữ snapshot mới nhất cho mỗi listing
  const snapMap = new Map<string, any>();
  for (const s of (snaps ?? []) as any[]) {
    if (!snapMap.has(s.listing_id)) snapMap.set(s.listing_id, s);
  }

  const listings = (data as any[]).map((l) => {
    const snap = snapMap.get(l.id) ?? null;
    let status: 'never' | 'ok' | 'warn' | 'error' = 'never';
    if (snap) {
      if (snap.source === 'heyetsy' && snap.confidence >= 0.8) status = 'ok';
      else if (snap.confidence >= 0.5) status = 'warn';
      else status = 'error';
    }

    return {
      id: l.id,
      etsyListingId: l.etsy_listing_id,
      title: l.title,
      shopName: l.shop_name,
      url: l.url,
      isActive: l.is_active,
      workspaceId: l.workspace_id,
      workspaceName: l.workspaces?.name ?? '',
      lastSnapshotAt: snap?.captured_at ?? l.last_snapshot_at,
      price: l.current_price,
      rating: l.rating,
      reviewsCount: l.reviews_count,
      // Snapshot info
      snapSource: snap?.source ?? null,
      snapConfidence: snap?.confidence ?? null,
      snapSoldTotal: snap?.sold_total ?? null,
      snapViewsTotal: snap?.views_total ?? null,
      status,
    };
  });

  // Dedup theo etsy_listing_id — giữ bản có status tốt nhất
  const STATUS_RANK: Record<string, number> = { ok: 0, warn: 1, error: 2, never: 3 };
  const dedupMap = new Map<string, typeof listings[0]>();
  for (const l of listings) {
    const existing = dedupMap.get(l.etsyListingId);
    if (!existing || STATUS_RANK[l.status] < STATUS_RANK[existing.status]) {
      dedupMap.set(l.etsyListingId, l);
    }
  }
  const deduped = [...dedupMap.values()];

  // Filter theo status nếu có
  const filtered = filterStatus
    ? deduped.filter((l) => l.status === filterStatus)
    : deduped;

  return NextResponse.json({
    listings: filtered,
    total: dedupMap.size,
    page,
    pageSize,
  });
}
