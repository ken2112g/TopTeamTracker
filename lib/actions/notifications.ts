'use server';

import { getSupabaseServer } from '@/lib/supabase/server';
import { getServerWorkspaceId } from '@/lib/auth';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  icon: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

function mapRow(r: any): Notification {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    icon: r.icon ?? '🔔',
    data: r.data ?? null,
    isRead: r.is_read,
    createdAt: r.created_at,
  };
}

export async function getNotifications(limit = 60): Promise<Notification[]> {
  const db = getSupabaseServer();
  const wsId = await getServerWorkspaceId();
  if (!wsId) return [];
  const { data } = await db
    .from('notifications')
    .select('*')
    .eq('workspace_id', wsId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapRow);
}

export async function getUnreadCount(): Promise<number> {
  const db = getSupabaseServer();
  const wsId = await getServerWorkspaceId();
  if (!wsId) return 0;
  const { count } = await db
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', wsId)
    .eq('is_read', false);
  return count ?? 0;
}

export async function markAsRead(id: string): Promise<void> {
  const db = getSupabaseServer();
  const wsId = await getServerWorkspaceId();
  if (!wsId) return;
  await db.from('notifications').update({ is_read: true })
    .eq('id', id).eq('workspace_id', wsId);
}

export async function markAllAsRead(): Promise<void> {
  const db = getSupabaseServer();
  const wsId = await getServerWorkspaceId();
  if (!wsId) return;
  await db.from('notifications')
    .update({ is_read: true })
    .eq('workspace_id', wsId)
    .eq('is_read', false);
}

// Dùng nội bộ (từ API routes — không cần wsId từ cookie)
export async function createNotification(
  workspaceId: string,
  type: string,
  title: string,
  body: string,
  icon: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!workspaceId) return;
  const db = getSupabaseServer();
  await db.from('notifications').insert({
    workspace_id: workspaceId,
    type,
    title,
    body,
    icon,
    data: data ?? null,
  });
}
