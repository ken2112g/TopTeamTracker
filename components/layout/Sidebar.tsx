'use client';

import { useEffect, useState } from 'react';
import { getCollections } from '@/lib/actions/collections';
import SidebarClient from './SidebarClient';
import type { Collection } from '@/types';

export default function Sidebar() {
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    getCollections()
      .then(setCollections)
      .catch(() => {
        // Supabase chưa setup → dùng mock
        import('@/lib/mock/data').then((m) => setCollections(m.mockCollections));
      });
  }, []);

  return <SidebarClient collections={collections} />;
}
