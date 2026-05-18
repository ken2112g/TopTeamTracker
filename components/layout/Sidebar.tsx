'use client';

import { useEffect, useState } from 'react';
import { getCollections } from '@/lib/actions/collections';
import { getUnreadCount } from '@/lib/actions/notifications';
import SidebarClient from './SidebarClient';
import { useAppStore } from '@/lib/store/useAppStore';
import { usePathname } from 'next/navigation';
import type { Collection } from '@/types';

export default function Sidebar() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const sidebarRefreshKey = useAppStore((s) => s.sidebarRefreshKey);
  const pathname = usePathname();

  useEffect(() => {
    getCollections()
      .then(setCollections)
      .catch(() => setCollections([]));
  }, [sidebarRefreshKey]);

  useEffect(() => {
    getUnreadCount()
      .then(setUnreadCount)
      .catch(() => setUnreadCount(0));
  }, [pathname]);

  return <SidebarClient collections={collections} unreadCount={unreadCount} />;
}
