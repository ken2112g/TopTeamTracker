'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ListingDetailClient from '@/app/listings/[id]/ListingDetailClient';
import type { Listing, Snapshot } from '@/types';

function mapListing(r: any): Listing {
  return {
    id: r.id,
    etsyListingId: r.etsy_listing_id,
    url: r.url,
    title: r.title,
    shopName: r.shop_name,
    emoji: r.emoji ?? undefined,
    imageUrl: r.image_url ?? undefined,
    currentPrice: r.current_price ?? undefined,
    oldPrice: r.old_price ?? undefined,
    rating: r.rating ?? undefined,
    reviewsCount: r.reviews_count ?? 0,
    isActive: r.is_active,
    snapshotMode: r.snapshot_mode ?? 'daily',
    collectionId: r.collection_id ?? undefined,
    firstTrackedAt: r.first_tracked_at,
    lastSnapshotAt: r.last_snapshot_at ?? undefined,
    etsyCreatedAt: r.etsy_created_at ?? undefined,
    etsyUpdatedAt: r.etsy_updated_at ?? undefined,
    favoritesCount: r.favorites_count ?? undefined,
    country: r.country ?? 'US',
    currency: r.currency ?? 'USD',
  };
}

function mapSnapshot(r: any): Snapshot {
  return {
    id: r.id,
    listingId: r.listing_id,
    capturedAt: r.captured_at,
    source: r.source,
    soldTotal: r.sold_total ?? 0,
    soldDaily: r.sold_daily ?? 0,
    viewsTotal: r.views_total ?? 0,
    viewsDaily: r.views_daily ?? 0,
    revenueUsd: r.revenue_usd ?? 0,
    price: r.price ?? 0,
    favorites: r.favorites ?? undefined,
    reviewsCount: r.reviews_count ?? undefined,
    rating: r.rating ?? undefined,
    confidence: r.confidence ?? undefined,
  };
}

export default function AdminListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/listings/${id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        const l = mapListing(data.listing);
        const snaps = (data.snapshots ?? []).map(mapSnapshot);
        setListing({ ...l, snapshots: snaps });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 mb-8 text-[13px]">
          <Link href="/admin/listings" className="text-orange hover:underline flex items-center gap-1">
            <ArrowLeft size={14} /> Danh sách listings
          </Link>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-6 bg-bg-2 rounded-lg animate-pulse" style={{ width: `${50 + i * 8}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="p-8">
        <Link href="/admin/listings" className="text-orange hover:underline flex items-center gap-1 text-[13px] mb-6">
          <ArrowLeft size={14} /> Danh sách listings
        </Link>
        <p className="text-text-2 text-[14px]">Không tìm thấy listing này.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="px-8 pt-6 pb-0 flex items-center gap-2 text-[13px]">
        <Link
          href="/admin/listings"
          className="text-orange hover:underline flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Danh sách listings
        </Link>
        <span className="text-text-2">/</span>
        <span className="text-text-2 truncate max-w-[400px]">
          {listing.title.slice(0, 60)}{listing.title.length > 60 ? '...' : ''}
        </span>
      </div>
      <ListingDetailClient listing={listing} />
    </div>
  );
}
