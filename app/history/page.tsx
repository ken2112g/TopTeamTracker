'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock, RefreshCw, Inbox, Package, Folder, Trash2,
  PlusCircle, Camera, Filter,
} from 'lucide-react';
import { getActivities } from '@/lib/actions/activities';
import type { Activity } from '@/lib/actions/activities';
import { ACTION_META } from '@/lib/activity-meta';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  listing_added:      <Package    size={16} />,
  listing_deleted:    <Trash2     size={16} />,
  collection_created: <PlusCircle size={16} />,
  collection_deleted: <Trash2     size={16} />,
  snapshot_captured:  <Camera     size={16} />,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return `${Math.floor(d / 30)} tháng trước`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function groupByDay(items: Activity[]): { day: string; items: Activity[] }[] {
  const map = new Map<string, Activity[]>();
  for (const a of items) {
    const key = new Date(a.createdAt).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

const FILTER_OPTIONS = [
  { value: 'all',               label: 'Tất cả'         },
  { value: 'listing_added',     label: 'Thêm SP'        },
  { value: 'listing_deleted',   label: 'Xóa SP'         },
  { value: 'collection_created',label: 'Tạo BST'        },
  { value: 'collection_deleted',label: 'Xóa BST'        },
];

export default function HistoryPage() {
  const [items, setItems]   = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  const load = () => {
    setLoading(true);
    getActivities(200).then((data) => { setItems(data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? items : items.filter((a) => a.action === filter);
  const groups   = groupByDay(filtered);

  const today     = items.filter((a) => Date.now() - new Date(a.createdAt).getTime() < 86400_000).length;
  const addCount  = items.filter((a) => a.action === 'listing_added').length;
  const delCount  = items.filter((a) => a.action.includes('deleted')).length;

  return (
    <div className="p-8 xl:p-10">
      {/* Header */}
      <div className="font-mono text-[11px] text-orange tracking-[0.2em] uppercase mb-3 flex items-center gap-2.5">
        <span className="w-6 h-0.5 bg-orange" />
        Lịch sử hoạt động
      </div>
      <div className="flex items-end justify-between gap-6 mb-7 pb-6 border-b border-line flex-wrap">
        <div>
          <h1 className="font-display text-[42px] font-bold tracking-tight leading-tight mb-2">
            Lịch sử <em className="text-orange not-italic">dữ liệu</em>
          </h1>
          <p className="text-[14px] text-text-2">
            Toàn bộ hoạt động thêm / xóa sản phẩm và bộ sưu tập trong workspace.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn py-2 px-3 text-[12px]">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Tổng hành động', value: items.length, color: '#f1641e' },
          { label: 'Hôm nay',        value: today,         color: '#84cc16' },
          { label: 'Đã xóa',         value: delCount,      color: '#ef4444' },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-4">
            <div className="font-display text-[28px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[12.5px] text-text-2">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 items-center mb-5 flex-wrap">
        <Filter size={13} className="text-text-2 shrink-0" />
        <div className="flex gap-1 p-1 bg-bg-1 border border-line rounded-xl">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all ${
                filter === f.value ? 'bg-orange text-white' : 'text-text-2 hover:text-text-1'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] text-text-2 ml-1">
          {filtered.length} bản ghi
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-text-2" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Inbox size={48} className="mx-auto text-text-2 mb-4" />
          <div className="font-display text-lg font-bold mb-1">Chưa có hoạt động nào</div>
          <div className="text-[13px] text-text-2">
            Thêm sản phẩm qua extension hoặc tạo bộ sưu tập để bắt đầu ghi nhật ký.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(({ day, items: dayItems }) => (
            <div key={day}>
              {/* Day divider */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 font-mono text-[11px] text-text-2 uppercase tracking-[0.15em]">
                  <Clock size={11} />
                  {day}
                </div>
                <div className="flex-1 h-px bg-line" />
                <span className="font-mono text-[10px] text-text-2 bg-bg-1 border border-line px-2 py-0.5 rounded-full">
                  {dayItems.length} hành động
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {dayItems.map((a) => {
                  const meta  = ACTION_META[a.action] ?? ACTION_META['listing_added'];
                  const isAdd = a.action === 'listing_added';
                  const isDel = a.action.includes('deleted');
                  const isCol = a.targetType === 'collection';

                  return (
                    <div
                      key={a.id}
                      className="card px-5 py-4 flex items-center gap-4 hover:border-line-strong transition-all group"
                    >
                      {/* Icon */}
                      <div
                        className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                        style={{ background: meta.color + '18', color: meta.color }}
                      >
                        {ACTION_ICONS[a.action] ?? <Clock size={16} />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded border font-semibold"
                            style={{ color: meta.color, borderColor: meta.color + '40', background: meta.color + '12' }}
                          >
                            {meta.label}
                          </span>
                          {isCol && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-line text-text-2 bg-bg-1">
                              BST
                            </span>
                          )}
                        </div>

                        <div className={`font-display text-[14px] font-semibold truncate ${isDel ? 'line-through text-text-2' : 'text-text-0'}`}>
                          {a.targetName || a.targetId || '—'}
                        </div>

                        {/* Meta details */}
                        {a.meta && (
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {isAdd && a.meta.saved != null && (
                              <span className="font-mono text-[10.5px] text-accent-green">
                                +{a.meta.saved} sản phẩm
                              </span>
                            )}
                            {isAdd && a.meta.duplicates > 0 && (
                              <span className="font-mono text-[10.5px] text-text-2">
                                · {a.meta.duplicates} trùng bỏ qua
                              </span>
                            )}
                            {isAdd && a.meta.collectionName && (
                              <span className="font-mono text-[10.5px] text-orange flex items-center gap-1">
                                <Folder size={9} /> {a.meta.collectionName}
                              </span>
                            )}
                            {isDel && isCol && a.meta.listingsCount != null && (
                              <span className="font-mono text-[10.5px] text-text-2">
                                {a.meta.listingsCount} SP bị xóa theo
                              </span>
                            )}
                            {isDel && !isCol && a.meta.shopName && (
                              <span className="font-mono text-[10.5px] text-text-2">
                                by {a.meta.shopName}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: link nếu là listing hoặc collection còn tồn tại */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-[11px] text-text-2" title={fmtDate(a.createdAt)}>
                          {timeAgo(a.createdAt)}
                        </span>
                        {!isDel && a.targetType === 'collection' && a.targetId && (
                          <Link
                            href={`/collections/${a.targetId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-0 group-hover:opacity-100 font-mono text-[11px] text-orange hover:underline transition-opacity"
                          >
                            Xem →
                          </Link>
                        )}
                        {!isDel && a.targetType === 'listing' && a.meta?.collectionId && (
                          <Link
                            href={`/collections/${a.meta.collectionId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-0 group-hover:opacity-100 font-mono text-[11px] text-orange hover:underline transition-opacity"
                          >
                            Xem BST →
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
