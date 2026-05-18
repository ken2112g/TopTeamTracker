import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Harvest-Token',
};

export type HarvestAuth = {
  workspaceId: string;
  isSuperAdmin: boolean;
};

/** Validate X-Harvest-Token header. Returns HarvestAuth on success, null on fail. */
export async function validateHarvestToken(req: NextRequest): Promise<HarvestAuth | null> {
  const token = req.headers.get('X-Harvest-Token') ?? '';
  if (!token) return null;

  const db = getSupabaseServer();

  // Tìm workspace có token này
  const { data: ws } = await db
    .from('workspaces')
    .select('id, owner_id')
    .eq('harvest_token', token)
    .single();

  if (!ws) return null;

  // Kiểm tra owner của workspace có phải super admin không
  const { data: profile } = await db
    .from('profiles')
    .select('is_super_admin')
    .eq('id', ws.owner_id)
    .single();

  return {
    workspaceId: ws.id,
    isSuperAdmin: profile?.is_super_admin === true,
  };
}

export function unauthorized() {
  return NextResponse.json(
    { error: 'Harvest token không hợp lệ. Lấy token trong Cài đặt → Extension.' },
    { status: 401, headers: CORS_HEADERS }
  );
}
