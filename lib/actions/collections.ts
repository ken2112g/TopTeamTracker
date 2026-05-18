'use server';

import { getSupabaseServer } from '@/lib/supabase/server';
import { getServerWorkspaceId } from '@/lib/auth';
import { logActivity } from '@/lib/actions/activities';
import type { Collection } from '@/types';

function mapRow(r: any): Collection {
  return {
    id: r.id,
    name: r.name,
    keyword: r.keyword ?? undefined,
    color: r.color,
    description: r.description ?? undefined,
    createdAt: r.created_at,
    listingsCount: r.listings_count ?? 0,
  };
}

export async function getCollections(): Promise<Collection[]> {
  const db = getSupabaseServer();
  const wsId = await getServerWorkspaceId();
  if (!wsId) return [];
  const { data, error } = await db
    .from('collections')
    .select('*')
    .eq('workspace_id', wsId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function getCollectionByName(name: string): Promise<Collection | null> {
  const db = getSupabaseServer();
  const wsId = await getServerWorkspaceId();
  const escaped = name.replace(/[%_\\]/g, '\\$&');
  if (!wsId) return null;
  let q = db.from('collections').select('*').ilike('name', escaped).eq('workspace_id', wsId);
  const { data } = await q.limit(1);
  if (!data || data.length === 0) return null;
  return mapRow(data[0]);
}

export async function getCollectionById(id: string): Promise<Collection | null> {
  const db = getSupabaseServer();
  const { data, error } = await db.from('collections').select('*').eq('id', id).single();
  if (error) return null;
  return mapRow(data);
}

export async function createCollection(input: {
  name: string; keyword?: string; color?: string; description?: string;
}): Promise<Collection> {
  const db = getSupabaseServer();
  const wsId = await getServerWorkspaceId();
  const { data, error } = await db.from('collections').insert({
    id: `coll_${Date.now().toString(36)}`,
    name: input.name,
    keyword: input.keyword ?? null,
    color: input.color ?? '#f1641e',
    description: input.description ?? null,
    workspace_id: wsId ?? null,
  }).select().single();
  if (error) throw new Error(error.message);
  if (wsId) {
    await logActivity(wsId, 'collection_created', 'collection', data.id, input.name, {
      keyword: input.keyword,
      color: input.color,
    });
  }
  return mapRow(data);
}

export async function updateCollection(
  id: string,
  input: { name?: string; keyword?: string; color?: string; description?: string },
): Promise<Collection> {
  const db = getSupabaseServer();
  const { data, error } = await db.from('collections').update(input).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function deleteCollection(id: string): Promise<void> {
  const db = getSupabaseServer();
  const wsId = await getServerWorkspaceId();

  const { data: col } = await db.from('collections').select('name, listings_count').eq('id', id).single();
  const { data: listings } = await db.from('listings').select('id').eq('collection_id', id);
  const listingIds = (listings ?? []).map((l: any) => l.id);
  if (listingIds.length > 0) await db.from('snapshots').delete().in('listing_id', listingIds);
  await db.from('listings').delete().eq('collection_id', id);
  const { error } = await db.from('collections').delete().eq('id', id);
  if (error) throw new Error(error.message);

  if (wsId && col) {
    await logActivity(wsId, 'collection_deleted', 'collection', id, col.name, {
      listingsCount: col.listings_count ?? listingIds.length,
    });
  }
}
