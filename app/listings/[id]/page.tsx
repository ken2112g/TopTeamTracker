import { fetchListingById, fetchSnapshots } from '@/lib/data';
import { notFound } from 'next/navigation';
import ListingDetailClient from './ListingDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [listing, snapshots] = await Promise.all([
    fetchListingById(id),
    fetchSnapshots(id, 30),
  ]);
  if (!listing) notFound();

  return <ListingDetailClient listing={{ ...listing, snapshots }} />;
}
