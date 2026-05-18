import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAuth, getSupabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await getSupabaseAuth();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check super admin → redirect to /admin
      const userId = data.user?.id;
      if (userId) {
        const db = getSupabaseServer();
        const { data: profile } = await db.from('profiles').select('is_super_admin').eq('id', userId).single();
        if (profile?.is_super_admin) {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
      }
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url));
}
