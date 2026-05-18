import { fetchListings } from '@/lib/data';
import CollectionView from '@/components/CollectionView';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const all = await fetchListings();

  // Deduplicate: cùng etsyListingId hiện ở nhiều collection → chỉ giữ 1 (bản có snapshot gần nhất)
  const seen = new Map<string, typeof all[number]>();
  for (const l of all) {
    const key = l.etsyListingId;
    const prev = seen.get(key);
    if (!prev) { seen.set(key, l); continue; }
    const prevSnap = prev.snapshots?.at(-1)?.capturedAt ?? prev.firstTrackedAt ?? '';
    const curSnap  = l.snapshots?.at(-1)?.capturedAt  ?? l.firstTrackedAt  ?? '';
    if (curSnap > prevSnap) seen.set(key, l);
  }
  const listings = Array.from(seen.values());

  return (
    <CollectionView
      listings={listings}
      title="Tất cả sản phẩm"
      subtitle={`${listings.length} sản phẩm trong tất cả bộ sưu tập`}
      eyebrow="Bảng theo dõi tổng hợp"
    />
  );
}
