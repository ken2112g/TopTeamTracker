'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCollection as dbDeleteCollection } from '@/lib/actions/collections';
import { deleteListing as dbDeleteListing } from '@/lib/actions/listings';
import { Download, ArrowUp, ArrowDown, Database, Trash2, X, Search, LayoutGrid, LayoutList, Tag, Check } from 'lucide-react';
import RangePicker from '@/components/ui/RangePicker';
import Sparkline from '@/components/ui/Sparkline';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAppStore } from '@/lib/store/useAppStore';
import type { Listing, DateRange } from '@/types';

function upscaleImg(url?: string) {
  if (!url) return url;
  return url.replace(/il_(?:fullxfull|\d+x\w+)\./i, 'il_794xN.');
}

function fmtRev(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n > 0) return `$${n.toFixed(0)}`;
  return '$0';
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface Props {
  listings: Listing[];
  title: string;
  subtitle?: string;
  eyebrow: string;
  collectionColor?: string;
  collectionId?: string;
}

export default function CollectionView({
  listings,
  title,
  subtitle,
  eyebrow,
  collectionColor,
  collectionId,
}: Props) {
  const [range, setRange] = useState<DateRange>('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const {
    showToast,
    hiddenListingIds,
    hideListingFromCollection,
    deletedCollectionIds,
    deleteCollection,
    listingTags,
    refreshSidebar,
  } = useAppStore();
  const router = useRouter();

  const allVisible = listings.filter((l) => !hiddenListingIds.includes(l.id));
  const lastUpdated = allVisible.reduce((best, l) => {
    const t = l.lastSnapshotAt || l.firstTrackedAt || '';
    return t > best ? t : best;
  }, '');

  // Tất cả tags hiện có trên các listings trong collection này
  const allTags = Array.from(new Set(allVisible.flatMap((l) => listingTags[l.id] || [])));

  const visibleListings = allVisible.filter((l) => {
    const matchSearch = searchQuery.trim() === '' ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.shopName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTag = !selectedTag || (listingTags[l.id] || []).includes(selectedTag);
    return matchSearch && matchTag;
  });
  const listingToRemove = allVisible.find((l) => l.id === confirmRemoveId);

  useEffect(() => {
    if (collectionId && deletedCollectionIds.includes(collectionId)) {
      router.push('/collections');
    }
  }, [collectionId, deletedCollectionIds, router]);

  // Khôi phục scroll position khi quay lại từ listing detail
  useEffect(() => {
    const key = `ep_scroll_${window.location.pathname}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      sessionStorage.removeItem(key);
      requestAnimationFrame(() => window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' }));
    }
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = visibleListings.length > 0 && visibleListings.every((l) => selectedIds.has(l.id));
  const someSelected = selectedIds.size > 0;

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => dbDeleteListing(id)));
      ids.forEach((id) => hideListingFromCollection(id));
      setSelectedIds(new Set());
      setConfirmBulkDelete(false);
      showToast('Đã xóa', `${ids.length} sản phẩm đã được xóa`, 'success');
      refreshSidebar();
      router.refresh();
    } catch {
      showToast('Lỗi', 'Không thể xóa một số sản phẩm', 'error');
    }
  };

  const handleRemoveListing = async () => {
    if (!confirmRemoveId) return;
    try {
      await dbDeleteListing(confirmRemoveId);
      hideListingFromCollection(confirmRemoveId);
      setConfirmRemoveId(null);
      showToast('Đã xóa sản phẩm', 'Sản phẩm đã được xóa khỏi bộ sưu tập', 'success');
      refreshSidebar();
      router.refresh();
    } catch {
      showToast('Lỗi', 'Không thể xóa sản phẩm', 'error');
    }
  };

  const handleDeleteCollection = async () => {
    if (!collectionId) return;
    try {
      await dbDeleteCollection(collectionId);
      deleteCollection(collectionId);
      setConfirmDelete(false);
      showToast('Đã xóa bộ sưu tập', `"${title}" đã được xóa`, 'success');
      router.push('/collections');
    } catch {
      showToast('Lỗi', 'Không thể xóa bộ sưu tập', 'error');
    }
  };

  if (allVisible.length === 0) {
    return (
      <div className="p-8 xl:p-10">
        <div className="card p-16 text-center">
          <Database size={56} className="mx-auto text-text-2 mb-5" />
          <div className="font-display text-2xl font-bold mb-2">Chưa có sản phẩm nào</div>
          <div className="text-text-2 text-[14px] mb-6">
            Bộ sưu tập này chưa có sản phẩm. Hãy tìm kiếm hoặc thêm thủ công.
          </div>
          {collectionId && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn border-red-500/30 text-accent-red hover:bg-accent-red hover:text-white hover:border-accent-red"
            >
              <Trash2 size={14} /> Xóa bộ sưu tập này
            </button>
          )}
        </div>
        <ConfirmDialog
          open={confirmDelete}
          title="Xóa bộ sưu tập?"
          message={`Bộ sưu tập "${title}" sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.`}
          confirmLabel="Xóa bộ sưu tập"
          onConfirm={handleDeleteCollection}
          onCancel={() => setConfirmDelete(false)}
        />
      </div>
    );
  }

  const removeMessage = listingToRemove
    ? `Bạn có chắc muốn xóa "${
        listingToRemove.title.length > 60
          ? listingToRemove.title.slice(0, 60) + '...'
          : listingToRemove.title
      }" khỏi bộ sưu tập này không?`
    : '';

  return (
    <>
      <div className="p-8 xl:p-10">
        <div className="flex items-end justify-between gap-6 mb-7 pb-6 border-b border-line">
          <div>
            <div className="font-mono text-[11px] text-orange tracking-[0.2em] uppercase mb-3 flex items-center gap-2.5">
              <span className="w-6 h-0.5 bg-orange" />
              {eyebrow}
            </div>
            <h1 className="font-display text-[42px] font-bold tracking-tight leading-tight mb-3">
              <em
                className="text-orange not-italic"
                style={collectionColor ? { color: collectionColor } : undefined}
              >
                {title}
              </em>
            </h1>
            <div className="flex gap-4 items-center text-[13.5px] text-text-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-bg-2 border border-line font-mono text-[11.5px]">
                {allVisible.length} sản phẩm
              </span>
              <span>·</span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green relative">
                  <span className="absolute inset-[-4px] rounded-full border-2 border-accent-green animate-ping-slow" />
                </span>
                {lastUpdated ? `Cập nhật ${timeAgo(lastUpdated)}` : 'Chưa có snapshot'}
              </span>
            </div>
          </div>

          <div className="flex gap-3.5 items-center flex-wrap justify-end">
            <RangePicker value={range} onChange={setRange} />
            <button
              onClick={() => {
                const days = parseInt(range) || 30;
                const headers = ['Tên sản phẩm', 'Shop', 'Giá', 'Đã bán (tổng)', 'Views (tổng)', 'Doanh thu ($)', 'CVR (%)', 'Yêu thích'];
                const rows = visibleListings.map((l) => {
                  const snaps = (l.snapshots || []).slice(-days);
                  const latest = snaps[snaps.length - 1];
                  const sold = latest?.soldTotal || 0;
                  const views = latest?.viewsTotal || 0;
                  const revenue = (latest?.revenueUsd || 0).toFixed(2);
                  const cvr = views > 0 ? ((sold / views) * 100).toFixed(2) : '0';
                  const favs = latest?.favorites ?? l.favoritesCount ?? '';
                  return [l.title, l.shopName, l.currentPrice?.toFixed(2) ?? '', sold, views, revenue, cvr, favs];
                });
                const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `etsypulse-${title.toLowerCase().replace(/\s+/g, '-')}-${range}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('✅ Đã xuất CSV', `${visibleListings.length} sản phẩm đã tải về`, 'success');
              }}
              className="btn"
            >
              <Download size={14} /> Xuất CSV
            </button>
            {collectionId && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn border-red-500/30 text-accent-red hover:bg-accent-red hover:text-white hover:border-accent-red"
              >
                <Trash2 size={14} />
                Xóa BST
              </button>
            )}
          </div>
        </div>

        {/* Toolbar: search + view toggle */}
        <div className="flex gap-3 items-center mb-4">
          {collectionId && (
            <button
              onClick={() => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(visibleListings.map((l) => l.id)))}
              title={allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              className={`w-8 h-8 shrink-0 rounded-lg border-2 flex items-center justify-center transition-all ${
                allSelected ? 'bg-orange border-orange' : someSelected ? 'border-orange/60 bg-orange/10' : 'border-line bg-bg-1 hover:border-orange/60'
              }`}
            >
              {allSelected ? <Check size={13} className="text-white" /> : someSelected ? <span className="w-2 h-0.5 bg-orange rounded-full" /> : null}
            </button>
          )}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên sản phẩm hoặc shop..."
              className="w-full pl-9 pr-4 py-2.5 bg-bg-1 border border-line rounded-xl text-[13px] text-text-1 placeholder:text-text-2 focus:outline-none focus:border-orange focus:bg-bg-2 transition-all"
            />
          </div>
          <div className="flex gap-1 p-1 bg-bg-1 border border-line rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-orange text-white' : 'text-text-2 hover:text-text-1 hover:bg-bg-2'}`}
              title="Dạng danh sách"
            >
              <LayoutList size={15} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-orange text-white' : 'text-text-2 hover:text-text-1 hover:bg-bg-2'}`}
              title="Dạng lưới"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>

        {/* Tag filter — hiện khi có ít nhất 1 tag */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-2 uppercase tracking-[0.15em] shrink-0">
              <Tag size={11} /> Lọc theo tag:
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all ${
                !selectedTag ? 'border-orange text-orange bg-orange/10' : 'border-line text-text-2 hover:border-line-strong hover:text-text-1'
              }`}
            >
              Tất cả
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all flex items-center gap-1 ${
                  selectedTag === tag ? 'border-orange text-orange bg-orange/10' : 'border-line text-text-2 hover:border-line-strong hover:text-text-1'
                }`}
              >
                <Tag size={9} />
                {tag}
                {selectedTag === tag && (
                  <span className="ml-0.5 text-[10px]">
                    ({visibleListings.length})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="text-[13px] text-text-2 mb-5 flex items-center gap-2.5 px-4 py-3 bg-bg-1 border-l-[3px] border-orange rounded-[10px]">
          <span>💡</span>
          <span>
            Số liệu hiển thị <strong className="text-text-1">theo từng sản phẩm riêng lẻ</strong>{' '}
            trong {range.replace('d', ' ngày')} qua. Click dòng bất kỳ để xem chi tiết.
          </span>
        </div>

        {visibleListings.length === 0 && searchQuery.trim() !== '' ? (
          <div className="card p-12 text-center">
            <Search size={40} className="mx-auto text-text-2 mb-4" />
            <div className="font-display text-lg font-bold mb-1">Không tìm thấy sản phẩm</div>
            <div className="text-text-2 text-[13px]">Thử từ khóa khác hoặc tên shop.</div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="flex flex-col gap-3.5">
            {visibleListings.map((listing, i) => (
              <ListingRow
                key={listing.id}
                listing={listing}
                index={i}
                range={range}
                tags={listingTags[listing.id] || []}
                onRemove={collectionId ? () => setConfirmRemoveId(listing.id) : undefined}
                isSelected={selectedIds.has(listing.id)}
                onToggleSelect={collectionId ? () => toggleSelect(listing.id) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {visibleListings.map((listing, i) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                index={i}
                range={range}
                tags={listingTags[listing.id] || []}
                onRemove={collectionId ? () => setConfirmRemoveId(listing.id) : undefined}
                isSelected={selectedIds.has(listing.id)}
                onToggleSelect={collectionId ? () => toggleSelect(listing.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmRemoveId !== null}
        title="Xóa sản phẩm khỏi bộ sưu tập?"
        message={removeMessage}
        confirmLabel="Xóa sản phẩm"
        onConfirm={handleRemoveListing}
        onCancel={() => setConfirmRemoveId(null)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Xóa bộ sưu tập?"
        message={`Toàn bộ ${allVisible.length} sản phẩm trong "${title}" sẽ bị xóa khỏi theo dõi. Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa bộ sưu tập"
        onConfirm={handleDeleteCollection}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Xóa ${selectedIds.size} sản phẩm?`}
        message={`${selectedIds.size} sản phẩm đã chọn sẽ bị xóa vĩnh viễn khỏi bộ sưu tập. Hành động này không thể hoàn tác.`}
        confirmLabel={`Xóa ${selectedIds.size} sản phẩm`}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />

      {/* Bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-bg-2 border border-line rounded-2xl shadow-2xl shadow-black/50 animate-slide-up">
          <div className="w-6 h-6 rounded-md bg-orange flex items-center justify-center shrink-0">
            <Check size={13} className="text-white" />
          </div>
          <span className="font-mono text-[13px] text-text-1">
            Đã chọn <strong className="text-orange">{selectedIds.size}</strong> sản phẩm
          </span>
          <div className="w-px h-5 bg-line mx-1" />
          <button
            onClick={() => setSelectedIds(new Set())}
            className="btn py-1.5 px-3 text-[12px]"
          >
            <X size={12} /> Bỏ chọn
          </button>
          <button
            onClick={() => setConfirmBulkDelete(true)}
            className="btn py-1.5 px-3 text-[12px] border-red-500/30 text-accent-red hover:bg-accent-red hover:text-white hover:border-accent-red"
          >
            <Trash2 size={12} /> Xóa {selectedIds.size} SP
          </button>
        </div>
      )}
    </>
  );
}

function ListingRow({
  listing,
  index,
  range,
  tags,
  onRemove,
  isSelected,
  onToggleSelect,
}: {
  listing: Listing;
  index: number;
  range: DateRange;
  tags?: string[];
  onRemove?: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  const router = useRouter();
  const days = parseInt(range) || 30;
  const snapshots = (listing.snapshots || []).slice(-days);
  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];

  // Sold & Views = 24h rate; Revenue = lifetime total; CVR = soldTotal/viewsTotal
  const sold = latest?.soldDaily || 0;
  const views = latest?.viewsDaily || 0;
  const soldTotal = latest?.soldTotal || 0;
  const viewsTotal = latest?.viewsTotal || 0;
  const revenue = latest?.revenueUsd || 0;
  const cvr = viewsTotal > 0 ? (soldTotal / viewsTotal) * 100 : 0;
  const prevSold = prev?.soldDaily || 0;
  const prevViews = prev?.viewsDaily || 0;
  const prevSoldTotal = prev?.soldTotal || 0;
  const prevViewsTotal = prev?.viewsTotal || 0;
  const prevCvr = prevViewsTotal > 0 ? (prevSoldTotal / prevViewsTotal) * 100 : null;

  const calcTrend = (cur: number, p: number) =>
    p > 0 && prev != null ? ((cur - p) / p) * 100 : null;

  const soldTrend    = calcTrend(sold,    prevSold);
  const viewsTrend   = calcTrend(views,   prevViews);
  const revenueTrend = calcTrend(revenue, prev?.revenueUsd || 0);
  const cvrTrend     = calcTrend(cvr,     prevCvr ?? 0);
  const sparkData = snapshots.map((s) => s.soldDaily || 0);

  const priceDisplay = listing.currency && listing.currency !== 'USD'
    ? `${listing.currentPrice?.toLocaleString() || '—'} ${listing.currency}`
    : listing.currentPrice ? `$${listing.currentPrice.toFixed(2)}` : '—';

  return (
    <div
      onClick={() => {
        sessionStorage.setItem(`ep_scroll_${window.location.pathname}`, String(window.scrollY));
        router.push(`/listings/${listing.id}`);
      }}
      style={{ animationDelay: `${index * 0.05}s` }}
      className={`card p-5 px-5.5 grid grid-cols-[28px_64px_minmax(0,1.6fr)_minmax(0,2.4fr)_minmax(180px,240px)_72px_32px] gap-5 items-center cursor-pointer transition-all duration-400 hover:border-orange hover:bg-bg-2 hover:translate-x-2 hover:shadow-2xl hover:shadow-orange/10 animate-slide-up relative overflow-hidden group ${isSelected ? 'border-orange/50 bg-orange/5' : ''}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-orange transition-transform origin-top duration-400 ${isSelected ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'}`} />
      {/* Checkbox / index */}
      <div
        onClick={onToggleSelect ? (e) => { e.stopPropagation(); onToggleSelect(); } : undefined}
        className={`relative w-7 h-7 flex items-center justify-center ${onToggleSelect ? 'cursor-pointer' : ''}`}
      >
        <span className={`font-mono text-[12px] font-bold text-text-2 absolute transition-all select-none ${isSelected ? 'opacity-0' : 'group-hover:opacity-0 opacity-100'}`}>
          {index + 1}
        </span>
        {onToggleSelect && (
          <div className={`absolute w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'opacity-100 bg-orange border-orange'
              : 'opacity-0 group-hover:opacity-100 border-line bg-bg-0'
          }`}>
            {isSelected && <Check size={11} className="text-white" />}
          </div>
        )}
      </div>
      <div className="w-16 h-16 rounded-[14px] overflow-hidden shrink-0 transition-transform duration-400 group-hover:scale-110 bg-gradient-to-br from-[#3a2f27] to-[#1f1a16]">
        {listing.imageUrl ? (
          <img src={upscaleImg(listing.imageUrl)} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-[28px] group-hover:rotate-[-8deg] transition-transform duration-400">
            {listing.emoji || '📦'}
          </div>
        )}
      </div>
      <div>
        <div className="font-display text-[15.5px] font-semibold mb-1 leading-snug line-clamp-2 group-hover:text-orange-bright transition-colors">
          {listing.title}
        </div>
        <div className="text-[12.5px] text-text-2 italic mb-1.5">
          by <em>{listing.shopName}</em> · {priceDisplay}
        </div>
        {tags && tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-orange/10 text-orange border border-orange/20">
                <Tag size={8} />{tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-3.5">
        <Stat label="Sold/24h" value={sold > 0 ? `${sold}+` : '—'} delta={soldTrend} color="#22c55e" isEmpty={sold === 0} />
        <Stat label="Views/24h" value={views > 0 ? `${fmtNum(views)}+` : '—'} delta={viewsTrend} color="#f97316" isEmpty={views === 0} />
        <Stat label="Doanh thu" value={fmtRev(revenue)} delta={revenueTrend} color="#a855f7" isEmpty={revenue === 0} />
        <Stat label="CVR" value={`${cvr.toFixed(2)}%`} delta={cvrTrend} color="#facc15" isEmpty={cvr === 0} />
      </div>
      <div className="h-14">
        <Sparkline data={sparkData} />
      </div>

      {/* Tổng thể */}
      <div className="flex flex-col items-center gap-1 text-center">
        {soldTrend == null || soldTrend === 0 ? (
          <>
            <span className="font-display text-[22px] font-bold text-text-2">0%</span>
            <span className="font-mono text-[9px] text-text-2 uppercase tracking-wider">Tổng thể</span>
          </>
        ) : (
          <>
            <span className={`font-display text-[22px] font-bold leading-none ${soldTrend > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {soldTrend > 0 ? '+' : ''}{soldTrend.toFixed(1)}%
            </span>
            <span className={`font-mono text-[10px] font-semibold flex items-center gap-0.5 ${soldTrend > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {soldTrend > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              Tổng thể
            </span>
          </>
        )}
      </div>

      {/* Trash column — luôn có để giữ grid cân, ẩn nếu không có onRemove */}
      <div className="flex items-center justify-center">
        {onRemove ? (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-2 hover:text-accent-red hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
            title="Xóa khỏi bộ sưu tập"
          >
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return 'Vừa xong';
  if (h < 24) return `${h} giờ trước`;
  if (d < 30) return `${d} ngày trước`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} tháng trước`;
  return `${Math.floor(mo / 12)} năm trước`;
}

function formatCreated(isoDate: string): string {
  const dt = new Date(isoDate);
  const years = Math.floor((Date.now() - dt.getTime()) / (365.25 * 86400000));
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}${years > 0 ? ` (${years}n)` : ''}`;
}

function InfoRow({ label, left, right }: { label: string; left?: string; right: string }) {
  return (
    <div className="flex items-center py-[5px] border-b border-line last:border-0">
      <span className="text-[#6b5744] text-[10.5px] flex-1">{label}</span>
      {left && <span className="text-[10.5px] font-mono mr-2.5" style={{ color: '#e05c78' }}>{left}</span>}
      <span className="text-[10.5px] font-mono" style={{ color: '#2db87e' }}>{right}</span>
    </div>
  );
}

function ListingCard({
  listing,
  index,
  range,
  tags,
  onRemove,
  isSelected,
  onToggleSelect,
}: {
  listing: Listing;
  index: number;
  range: DateRange;
  tags?: string[];
  onRemove?: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  const router = useRouter();
  const days = parseInt(range) || 30;
  const snapshots = (listing.snapshots || []).slice(-days);
  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];

  // Sold & Views = 24h rate; Revenue = lifetime total; CVR = soldTotal/viewsTotal
  const sold = latest?.soldDaily || 0;
  const views = latest?.viewsDaily || 0;
  const soldTotal = latest?.soldTotal || 0;
  const viewsTotal = latest?.viewsTotal || 0;
  const viewsAvgDaily = latest?.viewsDaily || 0;
  const revenue = latest?.revenueUsd || 0;
  const cvr = viewsTotal > 0 ? (soldTotal / viewsTotal) * 100 : 0;
  const prevSold = prev?.soldDaily || 0;
  const prevViews = prev?.viewsDaily || 0;
  const prevSoldTotal = prev?.soldTotal || 0;
  const prevViewsTotal = prev?.viewsTotal || 0;
  const prevCvr = prevViewsTotal > 0 ? (prevSoldTotal / prevViewsTotal) * 100 : null;

  const favorites = latest?.favorites ?? listing.favoritesCount;
  const favPct = viewsTotal > 0 && favorites != null && favorites > 0
    ? ((favorites / viewsTotal) * 100).toFixed(1)
    : null;

  const calcTrend = (cur: number, p: number) =>
    p > 0 && prev != null ? ((cur - p) / p) * 100 : null;

  const soldTrend    = calcTrend(sold,    prevSold);
  const viewsTrend   = calcTrend(views,   prevViews);
  const revenueTrend = calcTrend(revenue, prev?.revenueUsd || 0);
  const cvrTrend     = calcTrend(cvr,     prevCvr ?? 0);

  const priceDisplay = listing.currency && listing.currency !== 'USD'
    ? `${listing.currentPrice?.toLocaleString() || '—'} ${listing.currency}`
    : `$${listing.currentPrice?.toFixed(2) || '—'}`;

  const updatedAt = listing.etsyUpdatedAt || listing.lastSnapshotAt;

  return (
    <div
      onClick={() => router.push(`/listings/${listing.id}`)}
      style={{ animationDelay: `${index * 0.05}s` }}
      className={`card cursor-pointer transition-all duration-300 hover:border-orange hover:bg-bg-2 hover:-translate-y-1 hover:shadow-2xl hover:shadow-orange/10 animate-slide-up relative overflow-hidden group flex flex-col ${isSelected ? 'border-orange/50 bg-orange/5' : ''}`}
    >
      <div className={`absolute left-0 top-0 right-0 h-[2px] bg-orange transition-transform origin-left duration-300 ${isSelected ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
      {onToggleSelect && (
        <div
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className="absolute top-2 left-2 z-10"
        >
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
            isSelected
              ? 'bg-orange border-orange'
              : 'opacity-0 group-hover:opacity-100 border-white/70 bg-black/40'
          }`}>
            {isSelected && <Check size={11} className="text-white" />}
          </div>
        </div>
      )}

      {listing.imageUrl ? (
        <div className="w-full aspect-[4/3] overflow-hidden">
          <img src={upscaleImg(listing.imageUrl)} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      ) : (
        <div className="w-full aspect-[4/3] bg-gradient-to-br from-[#3a2f27] to-[#1f1a16] grid place-items-center">
          <span className="text-4xl inline-block group-hover:rotate-[-8deg] group-hover:scale-110 transition-transform duration-300">
            {listing.emoji || '📦'}
          </span>
        </div>
      )}

      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-start gap-1.5">
          <div className="flex-1 min-w-0">
            <div className="font-display text-[12px] font-semibold leading-snug line-clamp-2 group-hover:text-orange-bright transition-colors mb-0.5">
              {listing.title}
            </div>
            <div className="text-[10px] text-text-2 truncate mb-1">
              <em>{listing.shopName}</em> · {priceDisplay}
            </div>
            {tags && tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-mono bg-orange/10 text-orange border border-orange/20">
                    <Tag size={7} />{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="w-5 h-5 rounded flex items-center justify-center text-text-2 hover:text-accent-red hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 mt-0.5"
            >
              <X size={11} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <CardStat label="Sold/24h" value={sold > 0 ? `${sold}+` : '—'} delta={soldTrend} color="#22c55e" isEmpty={sold === 0} />
          <CardStat label="Views/24h" value={views > 0 ? `${fmtNum(views)}+` : '—'} delta={viewsTrend} color="#f97316" isEmpty={views === 0} />
          <CardStat label="Doanh thu" value={fmtRev(revenue)} delta={revenueTrend} color="#a855f7" isEmpty={revenue === 0} />
          <CardStat label="CVR" value={`${cvr.toFixed(2)}%`} delta={cvrTrend} color="#facc15" isEmpty={cvr === 0} />
        </div>

        <div className="border-t border-line mt-auto">
          <InfoRow
            label="Views"
            left={viewsAvgDaily > 0 ? `${viewsAvgDaily.toLocaleString()} (Avg)` : undefined}
            right={viewsTotal > 0 ? viewsTotal.toLocaleString() : '—'}
          />
          {favorites != null && (
            <InfoRow
              label="Favorites"
              left={favPct ? `${favPct}%` : undefined}
              right={favorites.toLocaleString()}
            />
          )}
          <InfoRow label="Created" right={listing.etsyCreatedAt ? formatCreated(listing.etsyCreatedAt) : '—'} />
          <InfoRow label="Updated" right={updatedAt ? timeAgo(updatedAt) : '—'} />
        </div>
      </div>
    </div>
  );
}

function TrendBadge({ delta, size = 'sm' }: { delta?: number | null; size?: 'sm' | 'xs' }) {
  const sz = size === 'xs' ? 9 : 10;
  const cls = size === 'xs' ? 'font-mono text-[10px]' : 'font-mono text-[10.5px]';
  if (delta == null || delta === 0) {
    return <span className={`${cls} text-text-2`}>0%</span>;
  }
  return (
    <span className={`${cls} ${delta > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
      {delta > 0 ? <ArrowUp size={sz} className="inline" /> : <ArrowDown size={sz} className="inline" />}
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

function CardStat({ label, value, delta, color, isEmpty }: { label: string; value: string; delta?: number | null; color?: string; isEmpty?: boolean }) {
  return (
    <div
      className="bg-bg-0 rounded-lg px-3 py-2 transition-opacity"
      style={color ? { borderLeft: `2px solid ${isEmpty ? `${color}20` : `${color}50`}` } : undefined}
    >
      <div
        className="font-mono text-[9px] uppercase tracking-[0.1em] mb-1"
        style={{ color: isEmpty ? '#3a2a1e' : (color ? `${color}80` : undefined) }}
      >
        {label}
      </div>
      <div
        className={`font-display text-[14px] font-bold flex items-baseline gap-1 transition-all ${isEmpty ? 'opacity-25' : ''}`}
        style={!isEmpty && color ? { color } : undefined}
      >
        {value}
        {!isEmpty && delta !== undefined && <TrendBadge delta={delta} size="xs" />}
      </div>
    </div>
  );
}

function Stat({ label, value, delta, color, isEmpty }: { label: string; value: string; delta?: number | null; color?: string; isEmpty?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="font-mono text-[9.5px] uppercase tracking-[0.1em] font-semibold"
        style={{ color: isEmpty ? '#3a2a1e' : (color ? `${color}80` : '#6b5744') }}
      >
        {label}
      </div>
      <div
        className={`font-display text-[15.5px] font-bold flex items-baseline gap-1 transition-all ${isEmpty ? 'opacity-25' : ''}`}
        style={!isEmpty && color ? { color } : undefined}
      >
        {value}
        {!isEmpty && delta !== undefined && <TrendBadge delta={delta} />}
      </div>
    </div>
  );
}

