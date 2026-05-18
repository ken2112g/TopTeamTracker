'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Bell, Check, CheckCheck, TrendingUp, TrendingDown, Eye,
  BarChart2, Package, RefreshCw, Inbox,
} from 'lucide-react';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '@/lib/actions/notifications';
import type { Notification } from '@/lib/actions/notifications';
import { useAppStore } from '@/lib/store/useAppStore';
import { useRouter } from 'next/navigation';

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  listing_saved:  { icon: '📦', color: '#f1641e', label: 'Sản phẩm mới' },
  price_change:   { icon: '💰', color: '#f97316', label: 'Thay đổi giá'  },
  sales_spike:    { icon: '🚀', color: '#84cc16', label: 'Bùng nổ doanh số' },
  views_spike:    { icon: '👁',  color: '#60a5fa', label: 'Lượt xem tăng' },
  cvr_drop:       { icon: '📉', color: '#ef4444', label: 'CVR giảm'      },
  info:           { icon: '🔔', color: '#facc15', label: 'Hệ thống'      },
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

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useAppStore();
  const router = useRouter();

  const load = () => {
    setLoading(true);
    getNotifications().then((data) => { setItems(data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const unreadCount = items.filter((n) => !n.isRead).length;
  const visible = filter === 'unread' ? items.filter((n) => !n.isRead) : items;

  const handleMarkOne = (id: string) => {
    startTransition(async () => {
      await markAsRead(id);
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    });
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllAsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      showToast('Đã đọc tất cả', `${unreadCount} thông báo đã được đánh dấu`, 'success');
      router.refresh();
    });
  };

  return (
    <div className="p-8 xl:p-10">
      {/* Header */}
      <div className="font-mono text-[11px] text-orange tracking-[0.2em] uppercase mb-3 flex items-center gap-2.5">
        <span className="w-6 h-0.5 bg-orange" />
        Hệ thống
      </div>
      <div className="flex items-end justify-between gap-6 mb-7 pb-6 border-b border-line flex-wrap">
        <div>
          <h1 className="font-display text-[42px] font-bold tracking-tight leading-tight mb-2">
            Thông <em className="text-orange not-italic">báo</em>
          </h1>
          <p className="text-[14px] text-text-2">
            Hoạt động từ extension, cập nhật dữ liệu và cảnh báo tự động.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={load}
            disabled={loading}
            className="btn py-2 px-3 text-[12px]"
            title="Tải lại"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={isPending}
              className="btn py-2 px-4 text-[13px]"
            >
              <CheckCheck size={14} /> Đọc tất cả ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Tổng thông báo', value: items.length, color: '#f1641e' },
          { label: 'Chưa đọc',       value: unreadCount,  color: '#ef4444' },
          { label: 'Hôm nay',
            value: items.filter((n) => {
              const d = Date.now() - new Date(n.createdAt).getTime();
              return d < 86400_000;
            }).length,
            color: '#84cc16',
          },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-4">
            <div className="font-display text-[28px] font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-[12.5px] text-text-2">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-bg-1 border border-line rounded-xl w-fit mb-5">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
              filter === f ? 'bg-orange text-white' : 'text-text-2 hover:text-text-1'
            }`}
          >
            {f === 'all' ? 'Tất cả' : `Chưa đọc ${unreadCount > 0 ? `(${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-text-2" />
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-16 text-center">
          <Inbox size={48} className="mx-auto text-text-2 mb-4" />
          <div className="font-display text-lg font-bold mb-1">
            {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo'}
          </div>
          <div className="text-[13px] text-text-2">
            {filter === 'unread'
              ? 'Tất cả thông báo đã được đọc.'
              : 'Thông báo sẽ xuất hiện khi bạn thêm sản phẩm qua extension hoặc có biến động dữ liệu.'}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.info;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all group ${
                  n.isRead
                    ? 'border-line bg-bg-0 hover:bg-bg-1'
                    : 'border-orange/30 bg-orange/5 hover:bg-orange/8'
                }`}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl grid place-items-center text-xl shrink-0 mt-0.5"
                  style={{ background: meta.color + '15' }}
                >
                  {n.icon || meta.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span
                      className={`font-display text-[14px] font-semibold ${n.isRead ? 'text-text-1' : 'text-orange'}`}
                    >
                      {n.title}
                    </span>
                    <span
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded-full border"
                      style={{ color: meta.color, borderColor: meta.color + '40', background: meta.color + '15' }}
                    >
                      {meta.label}
                    </span>
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-orange shrink-0" />
                    )}
                  </div>
                  <div className="text-[13px] text-text-2 leading-relaxed">{n.body}</div>

                  {/* Extra data for listing_saved */}
                  {n.type === 'listing_saved' && n.data && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {n.data.saved > 0 && (
                        <span className="font-mono text-[10.5px] px-2 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20">
                          +{n.data.saved} mới
                        </span>
                      )}
                      {n.data.duplicates > 0 && (
                        <span className="font-mono text-[10.5px] px-2 py-0.5 rounded bg-bg-2 text-text-2 border border-line">
                          {n.data.duplicates} trùng
                        </span>
                      )}
                      {n.data.collectionName && (
                        <span className="font-mono text-[10.5px] px-2 py-0.5 rounded bg-orange/10 text-orange border border-orange/20">
                          {n.data.collectionName}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="font-mono text-[11px] text-text-2">{timeAgo(n.createdAt)}</span>
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkOne(n.id)}
                      title="Đánh dấu đã đọc"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:text-accent-green hover:bg-accent-green/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Check size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
