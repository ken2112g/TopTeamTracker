'use server';

import { getSupabaseServer } from '@/lib/supabase/server';
import { getServerWorkspaceId } from '@/lib/auth';

export interface Activity {
  id: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  meta?: any;
  createdAt: string;
}

function mapRow(r: any): Activity {
  return {
    id: r.id,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id ?? undefined,
    targetName: r.target_name ?? undefined,
    meta: r.meta ?? null,
    createdAt: r.created_at,
  };
}

export async function getActivities(limit = 100): Promise<Activity[]> {
  const db = getSupabaseServer();
  const wsId = await getServerWorkspaceId();
  if (!wsId) return [];
  const { data } = await db
    .from('activities')
    .select('*')
    .eq('workspace_id', wsId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapRow);
}

// Dùng nội bộ từ các server actions — nhận wsId trực tiếp để không gọi lại getServerWorkspaceId
export async function logActivity(
  workspaceId: string,
  action: string,
  targetType: string,
  targetId?: string,
  targetName?: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  if (!workspaceId) return;
  const db = getSupabaseServer();
  await db.from('activities').insert({
    workspace_id: workspaceId,
    action,
    target_type: targetType,
    target_id: targetId ?? null,
    target_name: targetName ?? null,
    meta: meta ?? null,
  });
}
