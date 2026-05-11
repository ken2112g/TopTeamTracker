'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler } from 'chart.js';
import { ArrowLeft, ExternalLink, Plus, Download, Tag, X, GitCompare, Star, Eye, ShoppingBag, DollarSign } from 'lucide-react';
import RangePicker from '@/components/ui/RangePicker';
import { useAppStore } from '@/lib/store/useAppStore';
import type { Listing, DateRange } from '@/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

export default function ListingDetailClient({ listing }: { listing: Listing }) {
  const [range, setRange] = useState<DateRange>('30d');
  const [granularity, setGranularity] = useState<'daily' | 'weekly'>('daily');
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const tagRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { listingTags, addListingTag, removeListingTag, showToast } = useAppStore();

  const days = parseInt(range) || 30;
  const rawSnapshots = (listing.snapshots || []).slice(-days);

  // Aggregate weekly if needed
  const { snapshots, labels } = buildData(rawSnapshots, granularity);

  const totalSold = rawSnapshots.reduce((sum, s) => sum + s.soldDaily, 0);
  const totalViews = rawSnapshots.reduce((sum, s) => sum + s.viewsDaily, 0);
  const totalRevenue = rawSnapshots.reduce((sum, s) => sum + s.revenueUsd, 0);
  const avgCvr = totalViews > 0 ? (totalSold / totalViews) * 100 : 0;
  const dayCount = rawSnapshots.length || 1;

  // HeyEtsy-style metrics from last snapshot
  const lastSnap = listing.snapshots?.[listing.snapshots.length - 1];
  const heySoldDaily = lastSnap?.soldDaily ?? 0;
  const heyViewsDaily = lastSnap?.viewsDaily ?? 0;
  const heySoldTotal = lastSnap?.soldTotal ?? 0;
  const heyViewsTotal = lastSnap?.viewsTotal ?? 0;
  const heyFavorites = listing.favoritesCount ?? lastSnap?.favorites ?? 0;
  // Use reviewsCount * 150 as proxy for all-time views (snapshot viewsTotal is only 30-day cumulative)
  const heyViewsAllTime = listing.reviewsCount * 150;
  const heyFavRate = heyViewsAllTime > 0 ? +((heyFavorites / heyViewsAllTime) * 100).toFixed(2) : 0;
  const heyRevenue = totalRevenue;
  const isHot = heySoldTotal > 2500 || heySoldDaily > 10;
  const currency = listing.currency ?? 'USD';
  const country = listing.country ?? 'US';

  const COUNTRY_FLAGS: Record<string, string> = {
    US: '🇺🇸', VN: '🇻🇳', CA: '🇨🇦', GB: '🇬🇧', AU: '🇦🇺',
    DE: '🇩🇪', FR: '🇫🇷', JP: '🇯🇵', KR: '🇰🇷',
  };

  const tags = listingTags[listing.id] || [];

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) {
      showToast('⚠️ Tag đã tồn tại', `"${t}" đã được thêm rồi`, 'error');
      return;
    }
    addListingTag(listing.id, t);
    setTagInput('');
    showToast('✅ Đã thêm tag', `"${t}"`, 'success');
  };

  const handleExport = () => {
    const headers = ['Ngày', 'Đã bán', 'Views', 'Doanh thu ($)', 'CVR (%)'];
    const rows = rawSnapshots.map((s) => {
      const d = new Date(s.capturedAt);
      const date = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      const cvr = s.viewsDaily > 0 ? ((s.soldDaily / s.viewsDaily) * 100).toFixed(2) : '0';
      return [date, s.soldDaily, s.viewsDaily, s.revenueUsd.toFixed(2), cvr];
    });
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etsypulse-${listing.id}-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Đã xuất CSV', `${rawSnapshots.length} ngày dữ liệu`, 'success');
  };

  const handleCompare = () => {
    router.push(`/compare?ids=${listing.id}`);
  };

  return (
    <div className="p-8 xl:p-10">
      <div className="flex items-center gap-2.5 mb-6 text-[13px] text-text-2">
        <Link href="/" className="text-orange hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Quay lại
        </Link>
        <span>/</span>
        <span className="truncate">{listing.title.slice(0, 60)}...</span>
      </div>

      {/* Header */}
      <div className="flex gap-7 mb-8 p-7 bg-gradient-to-br from-bg-1 to-bg-2 border border-line rounded-[20px] relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-orange/20 blur-3xl pointer-events-none" />
        <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-[#3a2f27] to-[#1f1a16] grid place-items-center text-[72px] flex-shrink-0 shadow-2xl">
          {listing.emoji || '📦'}
        </div>
        <div className="flex-1 relative z-10">
          <h2 className="font-display text-[26px] font-bold tracking-tight leading-tight mb-2.5">{listing.title}</h2>
          <div className="text-[14px] text-text-1 mb-4 flex items-center gap-2.5 flex-wrap">
            <span className="text-[18px] leading-none">{COUNTRY_FLAGS[country] ?? '🌐'}</span>
            <span>by</span>
            <span className="text-orange font-semibold">{listing.shopName}</span>
            <span className="font-mono text-[11px] text-text-2 bg-bg-2 px-1.5 py-0.5 rounded">{currency}</span>
            <span>·</span>
            <span>⭐ {listing.rating?.toFixed(1) || '5.0'} ({listing.reviewsCount.toLocaleString()})</span>
            <span>·</span>
            <a href={listing.url} target="_blank" rel="noreferrer" className="text-orange font-semibold hover:text-orange-bright flex items-center gap-1">
              Mở trên Etsy <ExternalLink size={12} />
            </a>
            {isHot && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white font-mono text-[10px] font-bold">
                🔥 HOT
              </span>
            )}
          </div>

          {/* Tags */}
          <div className="flex gap-2 flex-wrap items-center mb-5">
            {listing.collection && (
              <span
                className="px-3 py-1 rounded-full text-[12px] font-medium border"
                style={{ borderColor: listing.collection.color, color: listing.collection.color, background: listing.collection.color + '20' }}
              >
                {listing.collection.name}
              </span>
            )}
            {tags.map((tag) => (
              <span key={tag} className="group flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-medium border border-line bg-bg-2 text-text-1 hover:border-orange transition-all">
                <Tag size={10} className="text-text-2" />
                {tag}
                <button
                  onClick={() => removeListingTag(listing.id, tag)}
                  className="opacity-0 group-hover:opacity-100 text-text-2 hover:text-accent-red transition-all ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            {showTagInput ? (
              <div className="flex items-center gap-1">
                <input
                  ref={tagRef}
                  autoFocus
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTag();
                    if (e.key === 'Escape') { setShowTagInput(false); setTagInput(''); }
                  }}
                  placeholder="Nhập tag..."
                  className="px-2.5 py-1 rounded-full text-[12px] border border-orange bg-bg-2 text-text-1 outline-none w-28"
                />
                <button onClick={handleAddTag} className="text-orange hover:text-orange-bright text-[12px] font-semibold px-1">+</button>
                <button onClick={() => { setShowTagInput(false); setTagInput(''); }} className="text-text-2 hover:text-accent-red">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="px-3 py-1 rounded-full text-[12px] font-medium border border-dashed border-line-strong text-text-2 hover:border-orange hover:text-orange transition-all flex items-center gap-1"
              >
                <Plus size={11} /> Thêm tag
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-5 pt-5 border-t border-dashed border-line-strong">
            <QuickStat label={`Đã bán · ${range}`} value={totalSold.toLocaleString()} delta={12.4} />
            <QuickStat label={`Lượt xem · ${range}`} value={`${(totalViews / 1000).toFixed(1)}K`} delta={8.1} />
            <QuickStat label={`Doanh thu · ${range}`} value={`$${(totalRevenue / 1000).toFixed(1)}K`} delta={10.2} />
            <QuickStat label="CVR trung bình" value={`${avgCvr.toFixed(2)}%`} delta={-0.3} />
          </div>
        </div>
      </div>

      {/* HeyEtsy-style metrics panel */}
      <div className={`card p-5 mb-5 ${isHot ? 'border-red-500/60 bg-red-950/10 shadow-[0_0_0_1px_rgba(239,68,68,0.4)]' : ''}`}>
        <div className="font-mono text-[10px] text-text-2 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
          <span className={`w-4 h-0.5 ${isHot ? 'bg-red-500' : 'bg-orange'}`} />
          Chỉ số Etsy (snapshot mới nhất)
          {isHot && <span className="ml-1 px-2 py-0.5 rounded-full bg-red-500 text-white font-bold text-[9px]">🔥 HOT listing</span>}
        </div>
        <div className="flex gap-6 flex-wrap items-start">
          {/* 2×2 badge grid — shrink-0 so it never expands */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <HeyBadge icon={<Star size={11} />} label={`${heySoldDaily}+ Sold`} color="#22c55e" />
            <HeyBadge icon={<Eye size={11} />} label={`${heyViewsDaily}+ Views`} color="#f97316" />
            <HeyBadge icon={<ShoppingBag size={11} />} label={heySoldTotal.toLocaleString() + ' Sold'} color="#3b82f6" />
            <HeyBadge icon={<DollarSign size={11} />} label={fmtRevenueByCurrency(heyRevenue, currency)} color="#a855f7" />
          </div>

          {/* Stats rows — fixed max-width so right values stay close */}
          <div className="border-l border-line pl-6 flex flex-col gap-2 min-w-[240px] max-w-[360px]">
            <DetailStatRow label="Views"     left={`${heyViewsDaily} (Avg)`}  right={heyViewsTotal.toLocaleString()} color="#ef4444" />
            <DetailStatRow label="Favorites" left={`${heyFavRate}%`}           right={heyFavorites.toLocaleString()} color="#3b82f6" />
            {listing.etsyCreatedAt && (
              <DetailStatRow label="Created" left={etsyAge(listing.etsyCreatedAt)} color="#3b82f6" />
            )}
            {listing.etsyUpdatedAt && (
              <DetailStatRow label="Updated" left={relativeDate(listing.etsyUpdatedAt)} color="#22c55e" />
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 mb-5 items-center flex-wrap">
        <RangePicker value={range} onChange={setRange} />
        <div className="flex gap-0 bg-bg-1 border border-line rounded-xl p-1">
          {([
            { key: 'daily' as const, label: 'Theo ngày' },
            { key: 'weekly' as const, label: 'Theo tuần' },
          ]).map((g) => (
            <button
              key={g.key}
              onClick={() => setGranularity(g.key)}
              className={`px-3.5 py-2 rounded-[9px] text-[12.5px] font-mono font-semibold transition-all ${
                granularity === g.key ? 'bg-orange text-white shadow-md shadow-orange/30' : 'text-text-1 hover:text-text-0'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2.5">
          <button onClick={handleCompare} className="btn">
            <GitCompare size={14} /> So sánh với SP khác
          </button>
          <button onClick={handleExport} className="btn">
            <Download size={14} /> Xuất CSV
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <ChartCard
          title="Số đơn bán"
          stats={[
            { label: 'Tổng', value: `${totalSold.toLocaleString()} đơn` },
            { label: 'TB/ngày', value: `${(totalSold / dayCount).toFixed(1)}` },
          ]}
          tag="SOLD"
          tagColor="orange"
        >
          <Bar data={chartData(labels, snapshots.map((s) => s.soldDaily), 'sold')} options={chartOptions('sold')} />
        </ChartCard>
        <ChartCard
          title="Lượt xem"
          stats={[
            { label: 'Tổng', value: `${totalViews.toLocaleString()} view` },
            { label: 'TB/ngày', value: `${Math.floor(totalViews / dayCount).toLocaleString()}` },
          ]}
          tag="VIEWS"
          tagColor="orange"
        >
          <Line data={chartData(labels, snapshots.map((s) => s.viewsDaily), 'views')} options={chartOptions('views')} />
        </ChartCard>
        <ChartCard
          title="Doanh thu (USD)"
          stats={[
            { label: 'Tổng', value: `$${totalRevenue.toLocaleString('en', { maximumFractionDigits: 0 })}` },
            { label: 'Giá TB', value: `$${listing.currentPrice?.toFixed(2) || '—'}` },
          ]}
          tag="REVENUE"
          tagColor="green"
        >
          <Line data={chartData(labels, snapshots.map((s) => s.revenueUsd), 'revenue')} options={chartOptions('revenue')} />
        </ChartCard>
        <ChartCard
          title="Tỷ lệ chuyển đổi"
          stats={[
            { label: 'TB', value: `${avgCvr.toFixed(2)}%` },
            { label: 'Cao nhất', value: `${Math.max(...rawSnapshots.map((s) => s.viewsDaily > 0 ? (s.soldDaily / s.viewsDaily) * 100 : 0)).toFixed(2)}%` },
          ]}
          tag="CVR"
          tagColor="amber"
        >
          <Line data={chartData(labels, snapshots.map((s) => s.viewsDaily > 0 ? (s.soldDaily / s.viewsDaily) * 100 : 0), 'cvr')} options={chartOptions('cvr')} />
        </ChartCard>
      </div>
    </div>
  );
}

function buildData(
  snapshots: NonNullable<Listing['snapshots']>,
  granularity: 'daily' | 'weekly'
): { snapshots: NonNullable<Listing['snapshots']>; labels: string[] } {
  if (granularity === 'daily' || snapshots.length === 0) {
    return {
      snapshots,
      labels: snapshots.map((s) => {
        const d = new Date(s.capturedAt);
        return `${d.getDate()}/${d.getMonth() + 1}`;
      }),
    };
  }
  // Weekly: group by ISO week
  const weekMap = new Map<string, NonNullable<Listing['snapshots']>>();
  for (const s of snapshots) {
    const d = new Date(s.capturedAt);
    const dayOfWeek = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek + 1);
    const key = `${monday.getDate()}/${monday.getMonth() + 1}`;
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(s);
  }
  const weeklySnaps: NonNullable<Listing['snapshots']> = [];
  const weeklyLabels: string[] = [];
  for (const [label, group] of weekMap.entries()) {
    const merged = { ...group[0] };
    merged.soldDaily = group.reduce((s, x) => s + x.soldDaily, 0);
    merged.viewsDaily = group.reduce((s, x) => s + x.viewsDaily, 0);
    merged.revenueUsd = group.reduce((s, x) => s + x.revenueUsd, 0);
    weeklySnaps.push(merged);
    weeklyLabels.push(`T ${label}`);
  }
  return { snapshots: weeklySnaps, labels: weeklyLabels };
}

function QuickStat({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <div>
      <div className="font-mono text-[10px] text-text-2 uppercase tracking-[0.12em] font-semibold mb-1.5">{label}</div>
      <div className="font-display text-[28px] font-bold flex items-baseline gap-2 tracking-tight">
        {value}
        {delta !== undefined && (
          <span className={`font-mono text-[12px] ${delta > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {delta > 0 ? '↑' : '↓'}{Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

const tagStyles: Record<string, string> = {
  orange: 'bg-orange/10 text-orange',
  green: 'bg-accent-green/10 text-accent-green',
  amber: 'bg-amber-400/10 text-amber-400',
};

function ChartCard({
  title, stats, tag, tagColor, children,
}: {
  title: string;
  stats: { label: string; value: string }[];
  tag: string;
  tagColor: 'orange' | 'green' | 'amber';
  children: React.ReactNode;
}) {
  return (
    <div className="card relative overflow-hidden hover:border-orange transition-all duration-300 hover:-translate-y-0.5 group flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange to-transparent opacity-30 group-hover:opacity-100 transition-all" />
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4 border-b border-line">
        <div className="flex-1">
          <div className="font-display text-[17px] font-bold tracking-tight mb-3">{title}</div>
          <div className="flex gap-5 flex-wrap">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="font-mono text-[9.5px] text-text-2 uppercase tracking-[0.12em] mb-1">{s.label}</div>
                <div className="font-display text-[20px] font-bold tracking-tight leading-none">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
        <span className={`font-mono text-[10px] px-2.5 py-1 rounded-full tracking-wider font-semibold shrink-0 mt-1 ${tagStyles[tagColor]}`}>
          {tag}
        </span>
      </div>
      <div className="px-4 pt-4 pb-5 h-[230px] relative">{children}</div>
    </div>
  );
}

function fmtRevenueListing(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

const LISTING_CURRENCY_CFG: Record<string, (usd: number) => string> = {
  USD: (v) => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(1)}K` : `$${v.toFixed(0)}`,
  VND: (v) => { const vnd = v * 25400; return vnd >= 1e9 ? `${(vnd/1e9).toFixed(1)}T₫` : `${(vnd/1e6).toFixed(0)}M₫`; },
  CAD: (v) => { const c = v * 1.37; return c >= 1e3 ? `CA$${(c/1e3).toFixed(1)}K` : `CA$${c.toFixed(0)}`; },
  GBP: (v) => { const g = v * 0.79; return g >= 1e3 ? `£${(g/1e3).toFixed(1)}K` : `£${g.toFixed(0)}`; },
  AUD: (v) => { const a = v * 1.53; return a >= 1e3 ? `A$${(a/1e3).toFixed(1)}K` : `A$${a.toFixed(0)}`; },
};

function fmtRevenueByCurrency(usd: number, currency: string) {
  return (LISTING_CURRENCY_CFG[currency] ?? LISTING_CURRENCY_CFG['USD'])(usd);
}

function relativeDate(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return '1 ngày trước';
  if (diff < 30) return `${diff} ngày trước`;
  if (diff < 365) return `${Math.floor(diff / 30)} tháng trước`;
  return `${Math.floor(diff / 365)} năm trước`;
}

function etsyAge(iso: string) {
  const d = new Date(iso);
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000));
  const suffix = years > 0 ? ` (${years} năm)` : '';
  return `${dd}/${mm}/${yyyy}${suffix}`;
}

function HeyBadge({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[11.5px] font-mono font-semibold whitespace-nowrap"
      style={{ background: color }}
    >
      {icon}
      {label}
    </div>
  );
}

function DetailStatRow({ label, left, right, color }: {
  label: string;
  left: string;
  right?: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-[12.5px]">
      <span className="text-text-2 font-mono w-[72px] shrink-0">{label}</span>
      <span className="font-mono font-semibold flex-1" style={{ color }}>{left}</span>
      {right && <span className="font-mono font-bold shrink-0" style={{ color }}>{right}</span>}
    </div>
  );
}

function chartData(labels: string[], data: number[], type: string) {
  const colors: Record<string, { border: string; bg: string }> = {
    sold: { border: '#f1641e', bg: 'rgba(241,100,30,0.3)' },
    views: { border: '#f1641e', bg: 'rgba(241,100,30,0.15)' },
    revenue: { border: '#84cc16', bg: 'rgba(132,204,22,0.18)' },
    cvr: { border: '#facc15', bg: 'rgba(250,204,21,0.1)' },
  };
  const c = colors[type];
  return {
    labels,
    datasets: [{
      data,
      borderColor: c.border,
      backgroundColor: c.bg,
      fill: type !== 'cvr',
      tension: 0.4,
      borderWidth: 2.5,
      pointRadius: type === 'cvr' ? 3 : 0,
      pointBackgroundColor: c.border,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: c.border,
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2,
      borderRadius: type === 'sold' ? 4 : 0,
    }],
  };
}

function chartOptions(type: string): any {
  const borderColors: Record<string, string> = {
    sold: '#f1641e', views: '#f1641e', revenue: '#84cc16', cvr: '#facc15',
  };
  const border = borderColors[type] || '#f1641e';
  const labelFn = (val: number) => {
    if (type === 'revenue') return `$${val.toFixed(0)}`;
    if (type === 'cvr') return `${val.toFixed(2)}%`;
    return val.toLocaleString();
  };
  return {
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f1a16',
        borderColor: border,
        borderWidth: 1,
        padding: { x: 14, y: 10 },
        cornerRadius: 10,
        titleFont: { family: 'Bricolage Grotesque', size: 13, weight: '700' },
        bodyFont: { family: 'DM Mono', size: 12 },
        titleColor: '#fff',
        bodyColor: '#c4a882',
        displayColors: false,
        callbacks: { label: (ctx: any) => ` ${labelFn(ctx.parsed.y)}` },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    scales: {
      x: {
        grid: { color: '#2a221d', drawTicks: false },
        border: { display: false },
        ticks: { color: '#6b5744', font: { size: 10, family: 'DM Mono' }, maxTicksLimit: 8, maxRotation: 0, padding: 6 },
      },
      y: {
        grid: { color: '#2a221d', drawTicks: false },
        border: { display: false },
        ticks: { color: '#6b5744', font: { size: 10, family: 'DM Mono' }, padding: 8, callback: (val: number) => labelFn(val) },
      },
    },
    interaction: { intersect: false, mode: 'index' },
  };
}
