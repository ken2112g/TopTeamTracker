import type { Collection, Listing, Snapshot } from '@/types';

export async function fetchCollections(): Promise<Collection[]> {
  const { getCollections } = await import('./actions/collections');
  return getCollections();
}

export async function fetchCollectionById(id: string): Promise<Collection | null> {
  const { getCollectionById } = await import('./actions/collections');
  return getCollectionById(id);
}

export async function fetchListings(collectionId?: string): Promise<Listing[]> {
  const { getListings } = await import('./actions/listings');
  return getListings(collectionId);
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  const { getListingById } = await import('./actions/listings');
  return getListingById(id);
}

export async function fetchSnapshots(listingId: string, days = 30): Promise<Snapshot[]> {
  const { getSnapshots } = await import('./actions/listings');
  return getSnapshots(listingId, days);
}
