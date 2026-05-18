import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { validateHarvestToken, CORS_HEADERS, unauthorized } from '@/lib/api/harvest-auth';

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const auth = await validateHarvestToken(req);
  if (!auth) return unauthorized();

  try {
    const db = getSupabaseServer();

    // Super admin → lấy TẤT CẢ listings của mọi workspace
    // Workspace owner thường → chỉ lấy listings của workspace mình
    let query = db
      .from('listings')
      .select('etsy_listing_id, url, last_snapshot_at')
      .not('etsy_listing_id', 'is', null)
      .not('url', 'is', null)
      .eq('is_active', true)
      .order('last_snapshot_at', { ascending: true, nullsFirst: true });

    if (!auth.isSuperAdmin) {
      query = query.eq('workspace_id', auth.workspaceId) as typeof query;
    }

    const { data } = await query;
    if (!data) return NextResponse.json([], { headers: CORS_HEADERS });

    // Deduplicate theo etsy_listing_id
    const seen = new Set<string>();
    const unique = data.filter((l: any) => {
      if (seen.has(l.etsy_listing_id)) return false;
      seen.add(l.etsy_listing_id);
      return true;
    });

    return NextResponse.json(
      unique.map((l: any) => ({
        etsyListingId: l.etsy_listing_id,
        url: l.url,
        lastSnapshotAt: l.last_snapshot_at,
      })),
      { headers: CORS_HEADERS }
    );
  } catch {
    return NextResponse.json([], { headers: CORS_HEADERS });
  }
}
