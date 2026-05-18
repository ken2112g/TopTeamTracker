import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { validateHarvestToken, CORS_HEADERS as CORS, unauthorized } from '@/lib/api/harvest-auth';

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function POST(req: NextRequest) {
  const auth = await validateHarvestToken(req);
  if (!auth) return unauthorized();
  try {
    const body = await req.json();
    const {
      etsyListingId,
      soldDaily = 0, viewsDaily = 0,
      soldTotal = 0, viewsTotal = 0,
      revenueUsd = 0, price = 0,
      favorites, rating, reviewsCount,
      source = 'heyetsy', confidence = 0.9,
    } = body;

    if (!etsyListingId) {
      return NextResponse.json({ error: 'Missing etsyListingId' }, { status: 400, headers: CORS });
    }

    // Sanitize + clamp to fit column precision (prevents numeric field overflow)
    // numeric(3,2) = max 9.99 | numeric(5,2) = max 999.99 | numeric(12,2) = max 9_999_999_999.99
    const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
    const safeRow = {
      sold_total:    Math.round(clamp(Number(soldTotal)  || 0, 2_147_483_647)),
      sold_daily:    Math.round(clamp(Number(soldDaily)  || 0, 2_147_483_647)),
      views_total:   Math.round(clamp(Number(viewsTotal) || 0, 2_147_483_647)),
      views_daily:   Math.round(clamp(Number(viewsDaily) || 0, 2_147_483_647)),
      revenue_usd:   Math.round(clamp(Number(revenueUsd) || 0, 9_999_999_999.99) * 100) / 100,
      price:         Math.round(clamp(Number(price)      || 0, 99_999_999.99)     * 100) / 100,
      favorites:     favorites    != null ? Math.round(clamp(Number(favorites)    || 0, 2_147_483_647)) : null,
      reviews_count: reviewsCount != null ? Math.round(clamp(Number(reviewsCount) || 0, 2_147_483_647)) : null,
      rating:        rating       != null ? Math.round(clamp(Number(rating)       || 0, 9.99)           * 100) / 100 : null,
      confidence:    Math.round(clamp(Number(confidence) || 0, 999.99) * 100) / 100,
      source:        ['heyetsy', 'estimate', 'etsy_scrape'].includes(source) ? source : 'estimate',
    };

    const db = getSupabaseServer();
    const now = new Date().toISOString();

    const { data: listings } = await db
      .from('listings')
      .select('id')
      .eq('etsy_listing_id', String(etsyListingId));

    if (!listings || listings.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404, headers: CORS });
    }

    const rows = listings.map((l: any) => ({
      listing_id: l.id,
      captured_at: now,
      ...safeRow,
    }));

    const { error } = await db.from('snapshots').insert(rows);
    if (error) {
      console.error('[snapshot] insert error:', error.message, JSON.stringify(safeRow));
      throw new Error(error.message);
    }

    const updatePayload: Record<string, unknown> = { last_snapshot_at: now };
    if (safeRow.price > 0) updatePayload.current_price = safeRow.price;
    const { error: updateErr } = await db
      .from('listings')
      .update(updatePayload)
      .eq('etsy_listing_id', String(etsyListingId));
    if (updateErr) console.error('[snapshot] update error:', updateErr.message);

    return NextResponse.json({ saved: listings.length }, { headers: CORS });
  } catch (e: any) {
    console.error('[snapshot] 500 error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500, headers: CORS });
  }
}
