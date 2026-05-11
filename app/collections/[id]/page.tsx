import { fetchCollectionById, fetchListings } from '@/lib/data';
import { notFound } from 'next/navigation';
import CollectionPageClient from './CollectionPageClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionPage({ params }: PageProps) {
  const { id } = await params;
  const [collection, listings] = await Promise.all([
    fetchCollectionById(id),
    fetchListings(id),
  ]);

  if (!collection) notFound();

  return (
    <CollectionPageClient
      collection={collection}
      listings={listings}
    />
  );
}
