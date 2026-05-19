import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getExtensionUser } from '@/lib/api/extension-auth';
import { createNotification } from '@/lib/actions/notifications';
import { logActivity } from '@/lib/actions/activities';

function cors(req: NextRequest) {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': origin.startsWith('chrome-extension://') ? origin : '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Harvest-Token',
    ...(origin.startsWith('chrome-extension://') ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { headers: cors(req) });
}

async function resolveWorkspaceId(req: NextRequest, body: any): Promise<string | null> {
  // 1. workspaceId tường minh từ body
  if (body.workspaceId) return body.workspaceId;

  // 2. Harvest token từ header (dành cho VPS daemon)
  const harvestToken = req.headers.get('x-harvest-token');
  if (harvestToken) {
    const db = getSupabaseServer();
    const { data } = await db.from('workspaces').select('id').eq('harvest_token', harvestToken).single();
    if (data?.id) return data.id;
  }

  // 3. Bearer token từ extension → lookup workspace của user
  const userId = await getExtensionUser(req);
  if (userId) {
    const db = getSupabaseServer();
    const { data } = await db
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })
      .limit(1)
      .single();
    if (data?.workspace_id) return data.workspace_id;
  }

  return null;
}

export async function POST(req: NextRequest) {
  const headers = cors(req);
  try {
    const body = await req.json();
    const { collectionId, collectionName, keyword, color, listings } = body;

    const db = getSupabaseServer();
    const workspaceId = await resolveWorkspaceId(req, body);

    // Tìm hoặc tạo collection
    let colId: string = collectionId;
    let colName: string = collectionName;

    if (!colId) {
      const targetName = colName || keyword || 'TopTeamTracker Search';

      // Tìm collection theo tên trong workspace (hoặc null workspace)
      const { data: existing } = await db
        .from('collections')
        .select('id, name')
        .ilike('name', targetName)
        .or(workspaceId
          ? `workspace_id.eq.${workspaceId},workspace_id.is.null`
          : 'workspace_id.is.null')
        .limit(1)
        .maybeSingle();

      if (existing) {
        colId = existing.id;
        colName = existing.name;
      } else {
        const { data: newCol, error } = await db
          .from('collections')
          .insert({
            id: `coll_${Date.now().toString(36)}`,
            name: targetName,
            keyword: keyword || null,
            color: color || '#f1641e',
            workspace_id: workspaceId ?? null,
          })
          .select()
          .single();

        if (error || !newCol) throw new Error(error?.message ?? 'Cannot create collection');
        colId = newCol.id;
        colName = newCol.name;
      }
    }

    let saved = 0;
    let duplicates = 0;
    let failed = 0;

    for (const item of listings ?? []) {
      try {
        if (!item.etsyListingId) { failed++; continue; }

        // Check trùng trong collection này
        const { data: existing } = await db
          .from('listings')
          .select('id')
          .eq('etsy_listing_id', item.etsyListingId)
          .eq('collection_id', colId)
          .maybeSingle();

        if (existing) { duplicates++; continue; }

        // Tạo listing với workspace_id đúng
        const { data: listing, error: lstErr } = await db
          .from('listings')
          .insert({
            id: `lst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
            etsy_listing_id: item.etsyListingId,
            url: item.url,
            title: item.title,
            shop_name: item.shopName,
            emoji: item.emoji ?? null,
            image_url: item.imageUrl ?? null,
            current_price: item.price ?? null,
            rating: item.rating ?? null,
            reviews_count: item.reviewsCount ?? 0,
            is_active: true,
            snapshot_mode: 'daily',
            collection_id: colId,
            country: item.country ?? 'US',
            currency: item.currency ?? 'USD',
            favorites_count: item.heyEtsy?.favorites ?? null,
            etsy_created_at: item.etsyCreatedAt ?? null,
            etsy_updated_at: item.etsyUpdatedAt ?? null,
            workspace_id: workspaceId ?? null,
          })
          .select()
          .single();

        if (lstErr || !listing) {
          console.error('Insert listing failed:', item.etsyListingId, lstErr?.code, lstErr?.message);
          failed++;
          continue;
        }

        // Chỉ lưu snapshot khi có data thật từ HeyEtsy
        if (item.hasHeyEtsy && item.heyEtsy) {
          const hey = item.heyEtsy;
          // Xóa snapshot cùng ngày (nếu quét lại trong ngày thì ghi đè)
          const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
          const todayEnd = new Date(); todayEnd.setUTCHours(23, 59, 59, 999);
          await db.from('snapshots').delete()
            .eq('listing_id', listing.id)
            .gte('captured_at', todayStart.toISOString())
            .lte('captured_at', todayEnd.toISOString());

          const { error: snapErr } = await db.from('snapshots').insert({
            listing_id: listing.id,
            captured_at: new Date().toISOString(),
            source: 'heyetsy',
            sold_total: hey.soldTotal ?? 0,
            sold_daily: hey.soldDaily ?? 0,
            views_total: hey.viewsTotal ?? 0,
            views_daily: hey.viewsDaily ?? 0,
            revenue_usd: hey.revenue ?? 0,
            price: item.price || 0,
            favorites: hey.favorites ?? null,
            reviews_count: item.reviewsCount ?? null,
            rating: item.rating ?? null,
            confidence: 0.9,
          });
          if (snapErr) console.warn('saveSnapshot failed', listing.id, snapErr.message);
        }

        saved++;
      } catch (e: any) {
        console.error('Extension save listing error:', item.etsyListingId, e?.message);
        failed++;
      }
    }

    // Log activity + tạo thông báo nếu có SP mới được lưu
    if (saved > 0 && workspaceId) {
      await logActivity(workspaceId, 'listing_added', 'listing', colId, colName, {
        saved, duplicates, failed, collectionId: colId, collectionName: colName,
      });
      const parts = [`Đã thêm **${saved} sản phẩm** vào _${colName}_`];
      if (duplicates > 0) parts.push(`${duplicates} trùng lặp bỏ qua`);
      if (failed > 0) parts.push(`${failed} lỗi`);
      await createNotification(
        workspaceId,
        'listing_saved',
        `Thêm sản phẩm qua Extension`,
        parts.join(' · '),
        '📦',
        { saved, duplicates, failed, collectionId: colId, collectionName: colName },
      );
    }

    return NextResponse.json(
      { saved, duplicates, failed, collectionName: colName, collectionId: colId },
      { headers }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: CORS });
  }
}
