'use client';

import { useRouter } from 'next/navigation';
import CollectionView from '@/components/CollectionView';
import type { Collection, Listing } from '@/types';

interface Props {
  collection: Collection;
  listings: Listing[];
}

export default function CollectionPageClient({ collection, listings }: Props) {
  const router = useRouter();
  return (
    <CollectionView
      listings={listings}
      title={collection.name}
      eyebrow={`Bộ sưu tập${collection.keyword ? ` · ${collection.keyword}` : ''}`}
      collectionColor={collection.color}
      collectionId={collection.id}
    />
  );
}
