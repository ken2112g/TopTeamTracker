'use server';

import { getSupabaseServer } from '@/lib/supabase/server';
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

function mapSnapshot(r: any): Snapshot {
  return {
    id: r.id,
    listingId: r.listing_id,
    capturedAt: r.captured_at,
    source: r.source,
    soldTotal: r.sold_total,
    soldDaily: r.sold_daily,
    viewsTotal: r.views_total,
    viewsDaily: r.views_daily,
    revenueUsd: r.revenue_usd,
    price: r.price,
    favorites: r.favorites ?? undefined,
    reviewsCount: r.reviews_count ?? undefined,
    rating: r.rating ?? undefined,
    confidence: r.confidence ?? undefined,
  };
}

export async function getListings(collectionId?: string): Promise<Listing[]> {
  const db = getSupabaseServer();
  let q = db.from('listings').select('*').order('first_tracked_at', { ascending: false });
  if (collectionId) q = q.eq('collection_id', collectionId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapListing);
}

export async function getListingById(id: string): Promise<Listing | null> {
  const db = getSupabaseServer();
  const { data, error } = await db.from('listings').select('*').eq('id', id).single();
  if (error) return null;
  return mapListing(data);
}

export async function createListing(input: Partial<Listing> & {
  etsyListingId: string;
  url: string;
  title: string;
  shopName: string;
}): Promise<Listing> {
  const db = getSupabaseServer();
  const row = {
    id: `lst_${Date.now().toString(36)}`,
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
  };
  const { data, error } = await db.from('listings').insert(row).select().single();
  if (error) throw new Error(error.message);
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
  const { error } = await db.from('listings').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getSnapshots(listingId: string, days = 30): Promise<Snapshot[]> {
  const db = getSupabaseServer();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data, error } = await db
    .from('snapshots')
    .select('*')
    .eq('listing_id', listingId)
    .gte('captured_at', since)
    .order('captured_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSnapshot);
}

export async function saveSnapshot(snap: Omit<Snapshot, 'id'>): Promise<Snapshot> {
  const db = getSupabaseServer();
  const { data, error } = await db
    .from('snapshots')
    .insert({
      listing_id: snap.listingId,
      captured_at: snap.capturedAt,
      source: snap.source,
      sold_total: snap.soldTotal,
      sold_daily: snap.soldDaily,
      views_total: snap.viewsTotal,
      views_daily: snap.viewsDaily,
      revenue_usd: snap.revenueUsd,
      price: snap.price,
      favorites: snap.favorites ?? null,
      reviews_count: snap.reviewsCount ?? null,
      rating: snap.rating ?? null,
      confidence: snap.confidence ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapSnapshot(data);
}
