import { fetchListings } from '@/lib/data';
import CollectionView from '@/components/CollectionView';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const listings = await fetchListings();
  return (
    <CollectionView
      listings={listings}
      title="Tất cả sản phẩm"
      subtitle={`${listings.length} sản phẩm trong tất cả bộ sưu tập`}
      eyebrow="Bảng theo dõi tổng hợp"
    />
  );
}
