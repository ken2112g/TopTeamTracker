import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api/admin-auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const db = getSupabaseServer();

  const { data: listing } = await db
    .from('listings')
    .select('*')
    .eq('id', id)
    .single();

  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const since = new Date(Date.now() - 180 * 86400_000).toISOString();
  const { data: snapshots } = await db
    .from('snapshots')
    .select('*')
    .eq('listing_id', id)
    .gte('captured_at', since)
    .order('captured_at', { ascending: true });

  return NextResponse.json({ listing, snapshots: snapshots ?? [] });
}
