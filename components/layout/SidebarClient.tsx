'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, BarChart3, Scale, Plus, Bell, Settings as SettingsIcon, Clock, Folder, ChevronRight, Users, Puzzle, UserPlus } from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { useAuthStore } from '@/lib/store/useAuthStore';
import InstallExtensionModal from '@/components/modals/InstallExtensionModal';
import type { Collection } from '@/types';

const SIDEBAR_LIMIT = 8;

export default function SidebarClient({ collections, unreadCount = 0 }: { collections: Collection[]; unreadCount?: number }) {
  const pathname = usePathname();
  const { setAddModalOpen, userCollections, deletedCollectionIds } = useAppStore();
  const { currentUser } = useAuthStore();
  const isTeamOwnerOrAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';
  const [collectionSearch, setCollectionSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [showExtModal, setShowExtModal] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  // Merge mock + user-created collections, filter deleted
  const allCollections = useMemo(() => {
    const userCols: Collection[] = userCollections.map((uc) => ({
      id: uc.id,
      name: uc.name,
      color: uc.color,
      keyword: uc.keyword,
      createdAt: uc.createdAt,
      listingsCount: uc.listingsCount,
    }));
    return [...collections, ...userCols].filter((c) => !deletedCollectionIds.includes(c.id));
  }, [collections, userCollections, deletedCollectionIds]);

  const filtered = useMemo(() => {
    const q = collectionSearch.trim().toLowerCase();
    if (!q) return allCollections;
    return allCollections.filter(
      (c) => c.name.toLowerCase().includes(q) || c.keyword?.toLowerCase().includes(q)
    );
  }, [allCollections, collectionSearch]);

  const visible = collectionSearch || showAll ? filtered : filtered.slice(0, SIDEBAR_LIMIT);
  const hiddenCount = filtered.length - SIDEBAR_LIMIT;

  return (
    <>
    <aside className="w-[260px] bg-bg-1/85 backdrop-blur-xl border-r border-line p-7 px-4 flex flex-col gap-1 min-h-screen">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-3 px-2 pb-7 cursor-pointer group">
        <div className="w-10 h-10 rounded-xl bg-orange grid place-items-center font-display font-extrabold text-white text-xl shadow-[0_6px_16px_rgba(241,100,30,0.3)] -rotate-[4deg] transition-transform duration-500 group-hover:rotate-[8deg] group-hover:scale-110">
          T
        </div>
        <div>
          <div className="font-display font-bold text-[22px] tracking-tight leading-none">
            TopTeam<span className="text-orange italic">Tracker</span>
          </div>
          <div className="font-mono text-[9.5px] text-text-2 tracking-[0.15em] uppercase mt-1">
            Track · Compare · Win
          </div>
        </div>
      </Link>

      <NavSection>Khám phá</NavSection>
      <NavItem href="/" icon={<BarChart3 size={16} />} active={isActive('/')}>Bảng theo dõi</NavItem>
      <NavItem href="/compare" icon={<Scale size={16} />} active={isActive('/compare')}>So sánh nhiều SP</NavItem>

      {/* Collections section */}
      <div className="flex items-center justify-between pr-1 pt-4 pb-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-2 px-3 font-medium">
          Collections
        </div>
        <Link
          href="/collections"
          className="font-mono text-[9.5px] text-text-2 hover:text-orange transition-colors flex items-center gap-0.5"
        >
          Tất cả <ChevronRight size={11} />
        </Link>
      </div>

      {/* Search box - hiện khi có >4 collections */}
      {allCollections.length > 4 && (
        <div className="relative mx-1 mb-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none" />
          <input
            type="text"
            value={collectionSearch}
            onChange={(e) => { setCollectionSearch(e.target.value); setShowAll(true); }}
            placeholder="Tìm collection..."
            className="w-full pl-8 pr-3 py-2 rounded-[9px] bg-bg-2 border border-line text-[12.5px] text-text-0 placeholder:text-text-2 outline-none focus:border-orange transition-colors"
          />
        </div>
      )}

      {allCollections.length === 0 ? (
        <div className="px-3 py-2 text-[12.5px] text-text-2 italic">Chưa có collections</div>
      ) : filtered.length === 0 ? (
        <div className="px-3 py-2 text-[12.5px] text-text-2 italic">Không tìm thấy</div>
      ) : (
        <>
          {visible.map((col) => (
            <Link
              key={col.id}
              href={`/collections/${col.id}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-all text-[13.5px] font-medium ${
                isActive(`/collections/${col.id}`)
                  ? 'text-orange-bright bg-orange/10'
                  : 'text-text-1 hover:text-text-0 hover:bg-bg-2 hover:translate-x-1'
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.color }} />
              <span className="flex-1 truncate">{col.name}</span>
              <span className="font-mono text-[10.5px] text-text-2 bg-bg-2 px-1.5 py-0.5 rounded tabular-nums">
                {col.listingsCount}
              </span>
            </Link>
          ))}

          {/* Show more / less */}
          {!collectionSearch && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-text-2 hover:text-orange hover:bg-bg-2 transition-all text-[12.5px] font-medium w-full"
            >
              <Folder size={14} />
              {showAll ? 'Thu gọn' : `+${hiddenCount} collections khác`}
            </button>
          )}

          {/* Quản lý tất cả */}
          <Link
            href="/collections"
            className={`flex items-center gap-2 px-3 py-2 rounded-[10px] transition-all text-[12.5px] font-medium ${
              pathname === '/collections'
                ? 'text-orange-bright bg-orange/10'
                : 'text-text-2 hover:text-orange hover:bg-bg-2'
            }`}
          >
            <BarChart3 size={14} />
            Quản lý tất cả ({allCollections.length})
          </Link>
        </>
      )}

      <NavSection>Hệ thống</NavSection>
      <button
        onClick={() => setAddModalOpen(true)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-text-1 hover:text-text-0 hover:bg-bg-2 hover:translate-x-1 transition-all text-[14px] font-medium text-left w-full"
      >
        <Plus size={16} />
        <span>Thêm SP thủ công</span>
      </button>
      <button
        onClick={() => setShowExtModal(true)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-text-1 hover:text-orange hover:bg-orange/8 hover:translate-x-1 transition-all text-[14px] font-medium text-left w-full group"
      >
        <Puzzle size={16} className="group-hover:rotate-12 transition-transform duration-300" />
        <span>Cài Extension Chrome</span>
        <span className="ml-auto font-mono text-[9.5px] bg-orange/15 text-orange px-1.5 py-0.5 rounded-full border border-orange/25 shrink-0">
          NEW
        </span>
      </button>
      <NavItem
        href="/alerts"
        icon={<Bell size={16} />}
        active={isActive('/alerts')}
        badge={unreadCount > 0 ? unreadCount : undefined}
      >
        Thông báo
      </NavItem>
      <NavItem href="/history" icon={<Clock size={16} />} active={isActive('/history')}>Lịch sử hoạt động</NavItem>
      {currentUser?.accountType === 'team' && isTeamOwnerOrAdmin && (
        <NavItem href="/team" icon={<Users size={16} />} active={isActive('/team')}>Quản lý nhóm</NavItem>
      )}
      {currentUser?.accountType === 'personal' && currentUser?.role === 'owner' && (
        <NavItem href="/settings?upgrade=team" icon={<UserPlus size={16} />} active={false}>
          <span className="flex items-center gap-1.5">
            Tạo team
            <span className="font-mono text-[9.5px] bg-orange/15 text-orange px-1.5 py-0.5 rounded-full border border-orange/25">
              Nâng cấp
            </span>
          </span>
        </NavItem>
      )}
      <NavItem href="/settings" icon={<SettingsIcon size={16} />} active={isActive('/settings')}>Cài đặt</NavItem>
    </aside>

    {showExtModal && <InstallExtensionModal onClose={() => setShowExtModal(false)} />}
  </>
  );
}

function NavSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-2 px-3 pt-4 pb-2 font-medium">
      {children}
    </div>
  );
}

function NavItem({ href, icon, active, badge, children }: {
  href: string;
  icon: React.ReactNode;
  active: boolean;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-all text-[14px] font-medium ${
        active ? 'text-orange-bright bg-orange/10' : 'text-text-1 hover:text-text-0 hover:bg-bg-2 hover:translate-x-1'
      }`}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {badge != null && (
        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent-red text-white min-w-[18px] text-center leading-none">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
