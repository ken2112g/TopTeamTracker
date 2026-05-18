'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, ChevronLeft, ChevronRight, RefreshCw, RotateCcw } from 'lucide-react';

interface ListingRow {
  id: string;
  etsyListingId: string;
  title: string;
  shopName: string;
  url: string;
  isActive: boolean;
  workspaceName: string;
  lastSnapshotAt: string | null;
  price: number | null;
  rating: number | null;
  reviewsCount: number;
  snapSource: 'heyetsy' | 'estimate' | 'etsy_scrape' | null;
  snapConfidence: number | null;
  snapSoldTotal: number | null;
  snapViewsTotal: number | null;
  status: 'never' | 'ok' | 'warn' | 'error';
}

// Format ngày giờ đầy đủ: 15/04 02:37
function fmtDatetime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hour  = String(d.getHours()).padStart(2, '0');
  const min   = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hour}:${min}`;
}

// Relative time ngắn gọn: "2h", "3d", "<1h"
function fmtRelative(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins}p`;
  const hrs = Math.round(diff / 3_600_000);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

type StatusFilter = 'all' | 'ok' | 'warn' | 'error' | 'never';

const STATUS_CONFIG = {
  never: { label: 'Chưa harvest', dot: 'bg-bg-3', text: 'text-text-2', badge: 'border-line text-text-2' },
  ok:    { label: 'HeyEtsy ✓',   dot: 'bg-green-400', text: 'text-green-400', badge: 'border-green-500/30 text-green-400 bg-green-500/8' },
  warn:  { label: 'Estimate',     dot: 'bg-amber-400', text: 'text-amber-400', badge: 'border-amber-500/30 text-amber-400 bg-amber-500/8' },
  error: { label: 'Lỗi / thấp',  dot: 'bg-red-500',   text: 'text-red-400',   badge: 'border-red-500/30 text-red-400 bg-red-500/8' },
};

const SOURCE_LABEL: Record<string, string> = {
  heyetsy:    'HeyEtsy',
  estimate:   'Estimate',
  etsy_scrape: 'Etsy',
};

export default function AdminListingsPage() {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<number | null>(null);
  const router = useRouter();

  const load = useCallback((p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    fetch(`/api/admin/listings?${params}`)
      .then(r => r.json())
      .then(d => { setListings(d.listings ?? []); setTotal(d.total ?? 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const pageCount = Math.ceil(total / 50);

  const filtered = listings.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (!search) return true;
    return (
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.shopName.toLowerCase().includes(search.toLowerCase()) ||
      l.etsyListingId.includes(search) ||
      l.workspaceName.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Count per status
  const counts = listings.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const errorCount = listings.filter(l => l.status === 'error').length;

  const handleRetryErrors = async () => {
    setRetrying(true);
    setRetryResult(null);
    try {
      const res = await fetch('/api/admin/listings/retry', { method: 'POST' });
      const data = await res.json();
      setRetryResult(data.retried ?? 0);
      load(page);
    } catch {
      setRetryResult(-1);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-0">Tất cả Listings</h1>
          <p className="text-text-2 text-[13px] mt-0.5">{total} listings trong hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Tìm title, shop, ID, workspace..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-base w-64"
          />
          {errorCount > 0 && (
            <button
              onClick={handleRetryErrors}
              disabled={retrying}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-red-500/40 bg-red-500/8 text-red-400 text-[12.5px] font-medium hover:border-red-500/60 hover:bg-red-500/12 transition-all disabled:opacity-50 flex-shrink-0"
            >
              <RotateCcw size={13} className={retrying ? 'animate-spin' : ''} />
              Chạy lại lỗi ({errorCount})
            </button>
          )}
          <button
            onClick={() => load(page)}
            className="w-10 h-10 rounded-xl border border-line bg-bg-1 grid place-items-center text-text-2 hover:border-orange/40 hover:text-orange transition-all flex-shrink-0"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {retryResult !== null && (
        <div className={`mb-5 px-4 py-2.5 rounded-xl border text-[12.5px] ${
          retryResult >= 0
            ? 'border-green-500/30 bg-green-500/8 text-green-400'
            : 'border-red-500/30 bg-red-500/8 text-red-400'
        }`}>
          {retryResult >= 0
            ? `Đã đưa ${retryResult} listing vào queue — daemon sẽ xử lý trong lần chạy tiếp theo.`
            : 'Có lỗi khi gửi yêu cầu retry, thử lại sau.'}
        </div>
      )}

      {/* Status filter chips */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(['all', 'ok', 'warn', 'error', 'never'] as const).map(s => {
          const isAll = s === 'all';
          const cfg = isAll ? null : STATUS_CONFIG[s];
          const count = isAll ? listings.length : (counts[s] ?? 0);
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                active
                  ? 'bg-orange/15 border-orange/50 text-orange'
                  : 'border-line text-text-2 hover:border-line-strong hover:text-text-1'
              }`}
            >
              {cfg && <span className={`w-2 h-2 rounded-full ${cfg.dot} inline-block`} />}
              {isAll ? 'Tất cả' : cfg!.label}
              <span className={`font-mono text-[10.5px] ${active ? 'text-orange' : 'text-text-2'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-line bg-bg-1/50">
              <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-text-2">Listing</th>
              <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-text-2">Workspace</th>
              <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-text-2">Thời gian harvest</th>
              <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-text-2">Trạng thái</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <tr key={i} className="border-b border-line/40">
                  <td className="px-4 py-3" colSpan={5}>
                    <div className="h-4 bg-bg-3 rounded animate-pulse" style={{ width: `${60 + (i % 4) * 10}%` }} />
                  </td>
                </tr>
              ))
            ) : filtered.map(l => {
              const cfg = STATUS_CONFIG[l.status];
              const datetime = fmtDatetime(l.lastSnapshotAt);
              const relative = fmtRelative(l.lastSnapshotAt);
              return (
                <tr
                  key={l.id}
                  onClick={() => router.push(`/admin/listings/${l.id}`)}
                  className="border-b border-line/40 hover:bg-bg-1/60 transition-colors group cursor-pointer"
                >
                  {/* Listing info */}
                  <td className="px-4 py-3 max-w-[280px]">
                    <div className="font-medium text-text-0 truncate leading-snug" title={l.title}>{l.title}</div>
                    <div className="text-text-2 text-[11px] mt-0.5 font-mono">
                      {l.shopName} <span className="text-bg-3">·</span> #{l.etsyListingId}
                    </div>
                  </td>

                  {/* Workspace */}
                  <td className="px-4 py-3">
                    <span className="text-text-1 text-[12px]">{l.workspaceName || '—'}</span>
                  </td>

                  {/* Datetime */}
                  <td className="px-4 py-3">
                    {datetime ? (
                      <div>
                        <div className="font-mono text-[12px] text-text-0">{datetime}</div>
                        <div className="text-[10.5px] text-text-2 mt-0.5">{relative} trước</div>
                      </div>
                    ) : (
                      <span className="text-red-400 text-[12px]">Chưa có</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border w-fit ${cfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} inline-block`} />
                        {cfg.label}
                      </span>
                      {l.snapSource && (
                        <div className="text-[10.5px] text-text-2 font-mono pl-1">
                          {SOURCE_LABEL[l.snapSource] ?? l.snapSource}
                          {l.snapConfidence != null && ` · ${Math.round(Number(l.snapConfidence) * 100)}%`}
                        </div>
                      )}
                      {l.snapSoldTotal != null && Number(l.snapSoldTotal) > 0 && (
                        <div className="text-[10.5px] text-text-2 font-mono pl-1">
                          Sold {l.snapSoldTotal.toLocaleString()}
                          {l.snapViewsTotal != null && Number(l.snapViewsTotal) > 0 && ` · View ${Number(l.snapViewsTotal).toLocaleString()}`}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* External link */}
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-text-2 hover:text-orange transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && !loading && (
          <div className="py-16 text-center">
            <div className="text-text-2 text-[13px]">Không có listing nào</div>
            {statusFilter !== 'all' && (
              <button onClick={() => setStatusFilter('all')} className="mt-2 text-orange text-[12px] hover:underline">
                Xóa filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-text-2 text-[12.5px]">Trang {page}/{pageCount} · {total} listings</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg border border-line bg-bg-1 grid place-items-center text-text-2 hover:border-orange/40 disabled:opacity-40 transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page - 2 + i;
              if (p < 1 || p > pageCount) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg border text-[12px] font-mono transition-all ${
                    p === page
                      ? 'border-orange bg-orange/15 text-orange'
                      : 'border-line bg-bg-1 text-text-2 hover:border-line-strong'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
              className="w-8 h-8 rounded-lg border border-line bg-bg-1 grid place-items-center text-text-2 hover:border-orange/40 disabled:opacity-40 transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
