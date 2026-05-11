'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download, ArrowUp, ArrowDown, Database, Trash2, X, Search, LayoutGrid, LayoutList } from 'lucide-react';
import RangePicker from '@/components/ui/RangePicker';
import Sparkline from '@/components/ui/Sparkline';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAppStore } from '@/lib/store/useAppStore';
import type { Listing, DateRange } from '@/types';

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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    showToast,
    hiddenListingIds,
    hideListingFromCollection,
    deletedCollectionIds,
    deleteCollection,
  } = useAppStore();
  const router = useRouter();

  const allVisible = listings.filter((l) => !hiddenListingIds.includes(l.id));
  const visibleListings = allVisible.filter((l) =>
    searchQuery.trim() === '' ||
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.shopName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const listingToRemove = allVisible.find((l) => l.id === confirmRemoveId);

  useEffect(() => {
    if (collectionId && deletedCollectionIds.includes(collectionId)) {
      router.push('/collections');
    }
  }, [collectionId, deletedCollectionIds, router]);

  const handleRemoveListing = () => {
    if (!confirmRemoveId) return;
    hideListingFromCollection(confirmRemoveId);
    setConfirmRemoveId(null);
    showToast('Đã xóa sản phẩm', 'Sản phẩm đã được xóa khỏi bộ sưu tập', 'success');
  };

  const handleDeleteCollection = () => {
    if (!collectionId) return;
    deleteCollection(collectionId);
    setConfirmDelete(false);
    showToast('Đã xóa bộ sưu tập', `"${title}" đã được xóa`, 'success');
    router.push('/collections');
  };

  if (allVisible.length === 0) {
    return (
      <div className="p-8 xl:p-10">
        <div className="card p-16 text-center">
          <Database size={56} className="mx-auto text-text-2 mb-5" />
          <div className="font-display text-2xl font-bold mb-2">Chưa có sản phẩm nào</div>
          <div className="text-text-2 text-[14px]">
            Bộ sưu tập này chưa có sản phẩm. Hãy tìm kiếm hoặc thêm thủ công.
          </div>
        </div>
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
                Cập nhật vài phút trước
              </span>
            </div>
          </div>

          <div className="flex gap-3.5 items-center flex-wrap justify-end">
            <RangePicker value={range} onChange={setRange} />
            <button
              onClick={() => {
                const days = parseInt(range) || 30;
                const headers = ['Tên sản phẩm', 'Shop', 'Giá ($)', 'Đã bán', 'Views', 'Doanh thu ($)', 'CVR (%)'];
                const rows = visibleListings.map((l) => {
                  const snaps = (l.snapshots || []).slice(-days);
                  const latest = snaps[snaps.length - 1];
                  const sold = latest?.soldTotal || 0;
                  const views = latest?.viewsTotal || 0;
                  const revenue = snaps.reduce((s, x) => s + x.revenueUsd, 0).toFixed(2);
                  const cvr = views > 0 ? ((sold / views) * 100).toFixed(2) : '0';
                  return [l.title, l.shopName, l.currentPrice?.toFixed(2) ?? '', sold, views, revenue, cvr];
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
                onRemove={collectionId ? () => setConfirmRemoveId(listing.id) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleListings.map((listing, i) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                index={i}
                range={range}
                onRemove={collectionId ? () => setConfirmRemoveId(listing.id) : undefined}
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
    </>
  );
}

function ListingRow({
  listing,
  index,
  range,
  onRemove,
}: {
  listing: Listing;
  index: number;
  range: DateRange;
  onRemove?: () => void;
}) {
  const router = useRouter();
  const days = parseInt(range) || 30;
  const snapshots = (listing.snapshots || []).slice(-days);
  const latest = snapshots[snapshots.length - 1];
  const earliest = snapshots[0];

  const soldTotal = latest?.soldTotal || 0;
  const viewsTotal = latest?.viewsTotal || 0;
  const cvr = viewsTotal > 0 ? (soldTotal / viewsTotal) * 100 : 0;
  const oldSold = earliest?.soldTotal || soldTotal;
  const trend = oldSold > 0 ? ((soldTotal - oldSold) / oldSold) * 100 : 0;
  const totalRevenue = snapshots.reduce((sum, s) => sum + s.revenueUsd, 0);
  const sparkData = snapshots.map((s) => s.soldDaily);

  return (
    <div
      onClick={() => router.push(`/listings/${listing.id}`)}
      style={{ animationDelay: `${index * 0.05}s` }}
      className="card p-5 px-5.5 grid grid-cols-[64px_minmax(0,1.6fr)_minmax(0,2fr)_minmax(200px,280px)_90px] gap-6 items-center cursor-pointer transition-all duration-400 hover:border-orange hover:bg-bg-2 hover:translate-x-2 hover:shadow-2xl hover:shadow-orange/10 animate-slide-up relative overflow-hidden group"
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-orange scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-400" />
      <div className="w-16 h-16 rounded-[14px] bg-gradient-to-br from-[#3a2f27] to-[#1f1a16] grid place-items-center text-[28px] transition-transform duration-400 group-hover:rotate-[-8deg] group-hover:scale-110">
        {listing.emoji || '📦'}
      </div>
      <div>
        <div className="font-display text-[15.5px] font-semibold mb-1 leading-snug line-clamp-2 group-hover:text-orange-bright transition-colors">
          {listing.title}
        </div>
        <div className="text-[12.5px] text-text-2 italic">
          by <em>{listing.shopName}</em> · ${listing.currentPrice?.toFixed(2) || '—'}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3.5">
        <Stat label="Đã bán" value={soldTotal.toLocaleString()} delta={trend} />
        <Stat
          label="Views"
          value={viewsTotal > 1000 ? `${(viewsTotal / 1000).toFixed(1)}K` : viewsTotal.toString()}
        />
        <Stat label="Doanh thu" value={`$${(totalRevenue / 1000).toFixed(1)}K`} />
        <Stat label="CVR" value={`${cvr.toFixed(2)}%`} />
      </div>
      <div className="h-14">
        <Sparkline data={sparkData} />
      </div>
      <div
        className={`font-display text-[18px] font-bold text-right transition-transform group-hover:scale-110 ${
          trend > 0 ? 'text-accent-green' : 'text-accent-red'
        }`}
      >
        {trend > 0 ? '+' : ''}
        {trend.toFixed(1)}%
      </div>

      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:text-accent-red hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
          title="Xóa khỏi bộ sưu tập"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

function ListingCard({
  listing,
  index,
  range,
  onRemove,
}: {
  listing: Listing;
  index: number;
  range: DateRange;
  onRemove?: () => void;
}) {
  const router = useRouter();
  const days = parseInt(range) || 30;
  const snapshots = (listing.snapshots || []).slice(-days);
  const latest = snapshots[snapshots.length - 1];
  const earliest = snapshots[0];

  const soldTotal = latest?.soldTotal || 0;
  const viewsTotal = latest?.viewsTotal || 0;
  const cvr = viewsTotal > 0 ? (soldTotal / viewsTotal) * 100 : 0;
  const oldSold = earliest?.soldTotal || soldTotal;
  const trend = oldSold > 0 ? ((soldTotal - oldSold) / oldSold) * 100 : 0;
  const totalRevenue = snapshots.reduce((sum, s) => sum + s.revenueUsd, 0);
  const sparkData = snapshots.map((s) => s.soldDaily);

  return (
    <div
      onClick={() => router.push(`/listings/${listing.id}`)}
      style={{ animationDelay: `${index * 0.05}s` }}
      className="card p-5 cursor-pointer transition-all duration-300 hover:border-orange hover:bg-bg-2 hover:-translate-y-1 hover:shadow-2xl hover:shadow-orange/10 animate-slide-up relative overflow-hidden group flex flex-col gap-4"
    >
      <div className="absolute left-0 top-0 right-0 h-[2px] bg-orange scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-[12px] bg-gradient-to-br from-[#3a2f27] to-[#1f1a16] grid place-items-center text-[22px] shrink-0 transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110">
          {listing.emoji || '📦'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-[14px] font-semibold leading-snug line-clamp-2 group-hover:text-orange-bright transition-colors mb-1">
            {listing.title}
          </div>
          <div className="text-[11.5px] text-text-2 italic truncate">
            by <em>{listing.shopName}</em> · ${listing.currentPrice?.toFixed(2) || '—'}
          </div>
        </div>
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-text-2 hover:text-accent-red hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="h-10">
        <Sparkline data={sparkData} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <CardStat label="Đã bán" value={soldTotal.toLocaleString()} delta={trend} />
        <CardStat label="Views" value={viewsTotal > 1000 ? `${(viewsTotal / 1000).toFixed(1)}K` : viewsTotal.toString()} />
        <CardStat label="Doanh thu" value={`$${(totalRevenue / 1000).toFixed(1)}K`} />
        <CardStat label="CVR" value={`${cvr.toFixed(2)}%`} />
      </div>

      <div className={`text-right font-display text-[16px] font-bold ${trend > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
        {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
      </div>
    </div>
  );
}

function CardStat({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <div className="bg-bg-0 rounded-lg px-3 py-2">
      <div className="font-mono text-[9px] text-text-2 uppercase tracking-[0.1em] mb-1">{label}</div>
      <div className="font-display text-[14px] font-bold flex items-baseline gap-1">
        {value}
        {delta !== undefined && (
          <span className={`font-mono text-[10px] ${delta > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {delta > 0 ? <ArrowUp size={9} className="inline" /> : <ArrowDown size={9} className="inline" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="font-mono text-[9.5px] text-text-2 uppercase tracking-[0.1em] font-semibold">
        {label}
      </div>
      <div className="font-display text-[15.5px] font-bold flex items-baseline gap-1">
        {value}
        {delta !== undefined && (
          <span
            className={`font-mono text-[10.5px] ${delta > 0 ? 'text-accent-green' : 'text-accent-red'}`}
          >
            {delta > 0 ? <ArrowUp size={10} className="inline" /> : <ArrowDown size={10} className="inline" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
