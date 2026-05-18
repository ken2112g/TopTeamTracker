'use client';

import { useEffect, useState } from 'react';
import { Users, Building2, List, Database, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface Stats {
  usersCount: number;
  workspacesCount: number;
  listingsCount: number;
  activeListings: number;
  snapshotsToday: number;
  harvestedToday: number;
  lastHarvestAt: string | null;
}

function fmtDate(iso: string | null) {
  if (!iso) return 'Chưa có';
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} phút trước`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} giờ trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { label: 'Người dùng', value: stats.usersCount, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Workspace', value: stats.workspacesCount, icon: Building2, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Listings (tổng)', value: stats.listingsCount, icon: List, color: 'text-orange', bg: 'bg-orange/10' },
    { label: 'Listings đang theo dõi', value: stats.activeListings, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Snapshots hôm nay', value: stats.snapshotsToday, icon: Database, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Đã harvest hôm nay', value: `${stats.harvestedToday}/${stats.activeListings}`, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  ] : [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-text-0 mb-1">Tổng quan hệ thống</h1>
        <p className="text-text-2 text-[13.5px]">
          Lần harvest cuối:{' '}
          <span className="text-text-1 font-medium">{loading ? '...' : fmtDate(stats?.lastHarvestAt ?? null)}</span>
        </p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 w-24 bg-bg-3 rounded mb-3" />
              <div className="h-8 w-16 bg-bg-3 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {cards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-mono uppercase tracking-[0.12em] text-text-2">{label}</span>
                <div className={`w-8 h-8 rounded-lg ${bg} grid place-items-center`}>
                  <Icon size={15} className={color} />
                </div>
              </div>
              <div className={`font-display text-3xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-4">
        <QuickCard href="/admin/harvest" title="Harvest Control" desc="Theo dõi và kiểm soát quá trình thu thập dữ liệu hàng ngày" icon="🌾" />
        <QuickCard href="/admin/users" title="Quản lý người dùng" desc="Xem, suspend hoặc cấp quyền cho tài khoản" icon="👥" />
        <QuickCard href="/admin/workspaces" title="Quản lý Workspace" desc="Xem tất cả workspace và harvest token" icon="🏢" />
        <QuickCard href="/admin/listings" title="Tất cả Listings" desc="Xem trạng thái harvest của mọi listing trong hệ thống" icon="📦" />
      </div>
    </div>
  );
}

function QuickCard({ href, title, desc, icon }: { href: string; title: string; desc: string; icon: string }) {
  return (
    <a href={href} className="card p-5 hover:border-orange/40 transition-all hover:-translate-y-0.5 group">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-orange/10 border border-orange/20 grid place-items-center text-xl flex-shrink-0 group-hover:bg-orange/15 transition-colors">
          {icon}
        </div>
        <div>
          <div className="font-semibold text-text-0 text-[14.5px] mb-1">{title}</div>
          <div className="text-text-2 text-[12.5px] leading-relaxed">{desc}</div>
        </div>
      </div>
    </a>
  );
}
