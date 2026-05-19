import { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Xác thực request từ Chrome extension.
 * Ưu tiên: Authorization: Bearer <access_token> (vì extension không share cookies)
 */
export async function getExtensionUser(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    // Verify token với Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: { user } } = await supabase.auth.getUser(token);
    return user?.id ?? null;
  }

  // Fallback: cookie-based (khi dùng trên browser thường)
  const { getSupabaseAuth } = await import('@/lib/supabase/server');
  const supabase = await getSupabaseAuth();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
