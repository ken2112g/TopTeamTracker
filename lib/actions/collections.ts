'use server';

import { getSupabaseServer } from '@/lib/supabase/server';
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
  const { data, error } = await db
    .from('collections')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function getCollectionById(id: string): Promise<Collection | null> {
  const db = getSupabaseServer();
  const { data, error } = await db.from('collections').select('*').eq('id', id).single();
  if (error) return null;
  return mapRow(data);
}

export async function createCollection(input: {
  name: string;
  keyword?: string;
  color?: string;
  description?: string;
}): Promise<Collection> {
  const db = getSupabaseServer();
  const { data, error } = await db
    .from('collections')
    .insert({
      id: `coll_${Date.now().toString(36)}`,
      name: input.name,
      keyword: input.keyword ?? null,
      color: input.color ?? '#f1641e',
      description: input.description ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function updateCollection(
  id: string,
  input: { name?: string; keyword?: string; color?: string; description?: string }
): Promise<Collection> {
  const db = getSupabaseServer();
  const { data, error } = await db
    .from('collections')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function deleteCollection(id: string): Promise<void> {
  const db = getSupabaseServer();
  const { error } = await db.from('collections').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
