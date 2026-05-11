/**
 * Unified data layer — dùng Supabase nếu credentials hợp lệ, fallback mock nếu chưa setup.
 * Import từ đây thay vì import thẳng mock hoặc supabase.
 */

import type { Collection, Listing, Snapshot } from '@/types';

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return (
    url.startsWith('https://') &&
    !url.includes('your-project') &&
    key.length > 20 &&
    !key.includes('your-anon-key')
  );
}

// ── Collections ─────────────────────────────────────────────

export async function fetchCollections(): Promise<Collection[]> {
  if (isSupabaseConfigured()) {
    const { getCollections } = await import('./actions/collections');
    return getCollections();
  }
  const { mockCollections } = await import('./mock/data');
  return mockCollections;
}

export async function fetchCollectionById(id: string): Promise<Collection | null> {
  if (isSupabaseConfigured()) {
    const { getCollectionById } = await import('./actions/collections');
    return getCollectionById(id);
  }
  const { mockCollections } = await import('./mock/data');
  return mockCollections.find((c) => c.id === id) ?? null;
}

// ── Listings ─────────────────────────────────────────────────

export async function fetchListings(collectionId?: string): Promise<Listing[]> {
  if (isSupabaseConfigured()) {
    const { getListings } = await import('./actions/listings');
    return getListings(collectionId);
  }
  const { mockListings } = await import('./mock/data');
  if (collectionId) return mockListings.filter((l) => l.collectionId === collectionId);
  return mockListings;
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  if (isSupabaseConfigured()) {
    const { getListingById } = await import('./actions/listings');
    return getListingById(id);
  }
  const { mockListingsById } = await import('./mock/data');
  return mockListingsById.get(id) ?? null;
}

// ── Snapshots ─────────────────────────────────────────────────

export async function fetchSnapshots(listingId: string, days = 30): Promise<Snapshot[]> {
  if (isSupabaseConfigured()) {
    const { getSnapshots } = await import('./actions/listings');
    return getSnapshots(listingId, days);
  }
  const { mockListingsById } = await import('./mock/data');
  const listing = mockListingsById.get(listingId);
  if (!listing) return [];
  return (listing.snapshots ?? []).slice(-days);
}
