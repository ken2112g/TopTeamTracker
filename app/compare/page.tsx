import { Suspense } from 'react';
import { getListings } from '@/lib/actions/listings';
import CompareClient from './CompareClient';

export const dynamic = 'force-dynamic';

export default async function ComparePage() {
  const listings = await getListings();
  return (
    <Suspense fallback={<div className="p-9 text-text-2 font-mono text-sm">Đang tải...</div>}>
      <CompareClient allListings={listings} />
    </Suspense>
  );
}
