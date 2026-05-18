'use server';

import { getSupabaseServer } from '@/lib/supabase/server';
import { getServerWorkspaceId } from '@/lib/auth';
import { logActivity } from '@/lib/actions/activities';
import type { Listing, Snapshot } from '@/types';

function mapListing(r: any): Listing {
  return {
    id: r.id,
    etsyListingId: r.etsy_listing_id,
    url: r.url,
    title: r.title,
    shopName: r.shop_name,
    emoji: r.emoji ?? undefined,
    imageUrl: r.image_url ?? undefined,
    currentPrice: r.current_price ?? undefined,
    oldPrice: r.old_price ?? undefined,
    rating: r.rating ?? undefined,
    reviewsCount: r.reviews_count ?? 0,
    isActive: r.is_active,
    snapshotMode: r.snapshot_mode,
    collectionId: r.collection_id ?? undefined,
    firstTrackedAt: r.first_tracked_at,
    lastSnapshotAt: r.last_snapshot_at ?? undefined,
    etsyCreatedAt: r.etsy_created_at ?? undefined,
    etsyUpdatedAt: r.etsy_updated_at ?? undefined,
    favoritesCount: r.favorites_count ?? undefined,
    country: r.country ?? 'US',
    currency: r.currency ?? 'USD',
  };
}

function dedupeSnapsByDay(snaps: Snapshot[]): Snapshot[] {
  const map = new Map<string, Snapshot>();
  for (const s of snaps) {
    const key = `${s.listingId}_${s.capturedAt.slice(0, 10)}`;
    const prev = map.get(key);
    if (!prev || s.capturedAt > prev.capturedAt) map.set(key, s);
  }
  return Array.from(map.values()).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

function mapSnapshot(r: any): Snapshot {
  return {
    id: r.id,
    listingId: r.listing_id,
    capturedAt: r.captured_at,
    source: r.source,
    soldTotal: r.sold_total ?? 0,
    soldDaily: r.sold_daily ?? 0,
    viewsTotal: r.views_total ?? 0,
    viewsDaily: r.views_daily ?? 0,
    revenueUsd: r.revenue_usd ?? 0,
    price: r.price ?? 0,
    favorites: r.favorites ?? undefined,
    reviewsCount: r.reviews_count ?? undefined,
    rating: r.rating ?? undefined,
    confidence: r.confidence ?? undefined,
  };
}

export async function getListings(collectionId?: string): Promise<Listing[]> {
  const db = getSupabaseServer();
  const wsId = await getServerWorkspaceId();

  if (!wsId) return [];
  let q = db.from('listings').select('*').order('first_tracked_at', { ascending: false });
  q = q.eq('workspace_id', wsId);
  if (collectionId) q = q.eq('collection_id', collectionId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const listings = (data ?? []).map(mapListing);
  if (listings.length === 0) return listings;

  const ids = listings.map((l) => l.id);
  const since = new Date(Date.now() - 90 * 86400_000).toISOString();
  const { data: snapsData } = await db
    .from('snapshots').select('*').in('listing_id', ids)
    .gte('captured_at', since).order('captured_at', { ascending: true });

  const rawSnaps = (snapsData ?? []).map(mapSnapshot);
  const snapMap = new Map<string, Snapshot[]>();
  for (const s of dedupeSnapsByDay(rawSnaps)) {
    if (!snapMap.has(s.listingId)) snapMap.set(s.listingId, []);
    snapMap.get(s.listingId)!.push(s);
  }
  return listings.map((l) => ({ ...l, snapshots: snapMap.get(l.id) ?? [] }));
}

export async function getListingByEtsyId(etsyListingId: string): Promise<Listing | null> {
  const db = getSupabaseServer();
  const wsId = await getServerWorkspaceId();
  if (!wsId) return null;
  const { data } = await db.from('listings').select('*')
    .eq('etsy_listing_id', etsyListingId).eq('workspace_id', wsId).limit(1);
  if (!data || data.length === 0) return null;
  return mapListing(data[0]);
}

export async function getListingByEtsyIdInCollection(etsyListingId: string, collectionId: string): Promise<Listing | null> {
  const db = getSupabaseServer();
  const { data } = await db.from('listings').select('*')
    .eq('etsy_listing_id', etsyListingId).eq('collection_id', collectionId).limit(1);
  if (!data || data.length === 0) return null;
  return mapListing(data[0]);
}

export async function getTrackedListings(): Promise<Array<{
  etsyListingId: string; collectionId: string; collectionName: string; collectionColor: string;
}>> {
  const db = getSupabaseServer();
  const wsId = await getServerWorkspaceId();

  let q = db.from('listings').select('etsy_listing_id, collection_id')
    .not('etsy_listing_id', 'is', null).not('collection_id', 'is', null);
  if (wsId) q = q.eq('workspace_id', wsId);
  const { data: listings } = await q;
  if (!listings || listings.length === 0) return [];

  const collectionIds = [...new Set(listings.map((l: any) => l.collection_id))];
  const { data: collections } = await db.from('collections').select('id, name, color').in('id', collectionIds);
  const colMap = new Map((collections ?? []).map((c: any) => [c.id, c]));

  return listings.map((l: any) => {
    const col: any = colMap.get(l.collection_id) ?? { name: 'Unknown', color: '#f1641e' };
    return { etsyListingId: l.etsy_listing_id, collectionId: l.collection_id, collectionName: col.name, collectionColor: col.color };
  });
}

export async function getListingById(id: string): Promise<Listing | null> {
  const db = getSupabaseServer();
  const { data, error } = await db.from('listings').select('*').eq('id', id).single();
  if (error) return null;
  return mapListing(data);
}

export async function createListing(input: Partial<Listing> & {
  etsyListingId: string; url: string; title: string; shopName: string;
}): Promise<Listing> {
  const db = getSupabaseServer();
  const wsId = await getServerWorkspaceId();
  const row = {
    id: `lst_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    etsy_listing_id: input.etsyListingId,
    url: input.url,
    title: input.title,
    shop_name: input.shopName,
    emoji: input.emoji ?? null,
    image_url: input.imageUrl ?? null,
    current_price: input.currentPrice ?? null,
    old_price: input.oldPrice ?? null,
    rating: input.rating ?? null,
    reviews_count: input.reviewsCount ?? 0,
    is_active: input.isActive ?? true,
    snapshot_mode: input.snapshotMode ?? 'daily',
    collection_id: input.collectionId ?? null,
    etsy_created_at: input.etsyCreatedAt ?? null,
    etsy_updated_at: input.etsyUpdatedAt ?? null,
    favorites_count: input.favoritesCount ?? null,
    country: input.country ?? 'US',
    currency: input.currency ?? 'USD',
    workspace_id: wsId ?? null,
  };
  const { data, error } = await db.from('listings').insert(row).select().single();
  if (error) { const err = new Error(error.message) as any; err.pgCode = error.code; throw err; }
  return mapListing(data);
}

export async function updateListing(id: string, input: Partial<Listing>): Promise<Listing> {
  const db = getSupabaseServer();
  const updates: any = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.currentPrice !== undefined) updates.current_price = input.currentPrice;
  if (input.oldPrice !== undefined) updates.old_price = input.oldPrice;
  if (input.rating !== undefined) updates.rating = input.rating;
  if (input.reviewsCount !== undefined) updates.reviews_count = input.reviewsCount;
  if (input.isActive !== undefined) updates.is_active = input.isActive;
  if (input.snapshotMode !== undefined) updates.snapshot_mode = input.snapshotMode;
  if (input.collectionId !== undefined) updates.collection_id = input.collectionId;
  if (input.imageUrl !== undefined) updates.image_url = input.imageUrl;
  if (input.favoritesCount !== undefined) updates.favorites_count = input.favoritesCount;
  if (input.lastSnapshotAt !== undefined) updates.last_snapshot_at = input.lastSnapshotAt;
  const { data, error } = await db.from('listings').update(updates).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return mapListing(data);
}

export async function deleteListing(id: string): Promise<void> {
  const db = getSupabaseServer();
  const wsId = await getServerWorkspaceId();

  // Lấy tên listing trước khi xóa để log
  const { data: row } = await db.from('listings').select('title, shop_name, collection_id').eq('id', id).single();

  await db.from('snapshots').delete().eq('listing_id', id);
  const { error } = await db.from('listings').delete().eq('id', id);
  if (error) throw new Error(error.message);

  if (wsId && row) {
    await logActivity(wsId, 'listing_deleted', 'listing', id, row.title, {
      shopName: row.shop_name,
      collectionId: row.collection_id,
    });
  }
}

export async function getSnapshots(listingId: string, days = 30): Promise<Snapshot[]> {
  const db = getSupabaseServer();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data, error } = await db.from('snapshots').select('*').eq('listing_id', listingId)
    .gte('captured_at', since).order('captured_at', { ascending: true });
  if (error) throw new Error(error.message);
  return dedupeSnapsByDay((data ?? []).map(mapSnapshot));
}

export async function saveSnapshot(snap: Omit<Snapshot, 'id'>): Promise<Snapshot> {
  const db = getSupabaseServer();
  const { data, error } = await db.from('snapshots').insert({
    listing_id: snap.listingId, captured_at: snap.capturedAt, source: snap.source,
    sold_total: snap.soldTotal, sold_daily: snap.soldDaily, views_total: snap.viewsTotal,
    views_daily: snap.viewsDaily, revenue_usd: snap.revenueUsd, price: snap.price,
    favorites: snap.favorites ?? null, reviews_count: snap.reviewsCount ?? null,
    rating: snap.rating ?? null, confidence: snap.confidence ?? null,
  }).select().single();
  if (error) throw new Error(error.message);
  return mapSnapshot(data);
}
