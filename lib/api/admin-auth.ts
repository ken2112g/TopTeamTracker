import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAuth, getSupabaseServer } from '@/lib/supabase/server';

export async function requireSuperAdmin(req: NextRequest): Promise<{ userId: string } | NextResponse> {
  const supabase = await getSupabaseAuth();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabaseServer();
  const { data: profile } = await db
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { userId: user.id };
}
