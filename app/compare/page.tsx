import { Suspense } from 'react';
import { mockListings } from '@/lib/mock/data';
import CompareClient from './CompareClient';

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-9 text-text-2 font-mono text-sm">Đang tải...</div>}>
      <CompareClient allListings={mockListings} />
    </Suspense>
  );
}
