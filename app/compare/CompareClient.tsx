'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend } from 'chart.js';
import { X, Plus } from 'lucide-react';
import RangePicker from '@/components/ui/RangePicker';
import type { Listing, DateRange } from '@/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

const COLORS = ['#f1641e', '#a78bfa', '#84cc16', '#60a5fa', '#facc15', '#ec4899'];

function upscaleImg(url?: string) {
  if (!url) return url;
  return url.replace(/il_(?:fullxfull|\d+x\w+)\./i, 'il_794xN.');
}

function ListingThumb({ listing, size = 28 }: { listing: Listing; size?: number }) {
  const dim = `${size}px`;
  if (listing.imageUrl) {
    return (
      <img
        src={upscaleImg(listing.imageUrl)}
        alt=""
        className="rounded-md object-cover shrink-0"
        style={{ width: dim, height: dim }}
      />
    );
  }
  return (
    <div
      className="rounded-md bg-gradient-to-br from-[#3a2f27] to-[#1f1a16] grid place-items-center shrink-0 text-sm"
      style={{ width: dim, height: dim }}
    >
      {listing.emoji || '📦'}
    </div>
  );
}

export default function CompareClient({ allListings }: { allListings: Listing[] }) {
  const searchParams = useSearchParams();
  const [range, setRange] = useState<DateRange>('30d');
  const [showPicker, setShowPicker] = useState(false);

  // Pre-select from ?ids=id1,id2 or ?ids=id1
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const param = searchParams.get('ids');
    if (param) {
      const ids = param.split(',').filter((id) => allListings.some((l) => l.id === id));
      if (ids.length > 0) return ids;
    }
    return allListings.slice(0, 3).map((l) => l.id);
  });

  useEffect(() => {
    const param = searchParams.get('ids');
    if (param) {
      const ids = param.split(',').filter((id) => allListings.some((l) => l.id === id));
      if (ids.length > 0) setSelectedIds(ids);
    }
  }, [searchParams, allListings]);

  const selected = allListings.filter((l) => selectedIds.includes(l.id));

  const removeId = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    setShowPicker(false);
  };

  const addId = (id: string) => {
    if (selectedIds.length >= 6) return;
    setSelectedIds((prev) => [...prev, id]);
    setShowPicker(false);
  };

  return (
    <div className="p-8 xl:p-10">
      <div className="font-mono text-[11px] text-orange tracking-[0.2em] uppercase mb-3 flex items-center gap-2.5">
        <span className="w-6 h-0.5 bg-orange" />
        So sánh sản phẩm
      </div>
      <h1 className="font-display text-[42px] font-bold tracking-tight leading-tight mb-3">
        Đối chiếu <em className="text-orange not-italic">nhiều sản phẩm</em>
      </h1>
      <p className="text-[15px] text-text-2 max-w-[600px] leading-relaxed mb-7">
        Chọn các sản phẩm bất kỳ để so sánh trực tiếp các chỉ số trên cùng biểu đồ. Mỗi SP một màu riêng.
      </p>

      {/* Product selector */}
      <div className="card flex items-center gap-3 p-5 mb-4 flex-wrap">
        <div className="flex gap-2 flex-wrap flex-1">
          {selected.map((l, i) => (
            <div
              key={l.id}
              className="flex items-center gap-2 px-3 py-2 bg-bg-2 border border-line rounded-[10px] hover:border-orange transition-all"
              style={{ borderLeftColor: COLORS[i % COLORS.length], borderLeftWidth: 3 }}
            >
              <ListingThumb listing={l} size={28} />
              <div className="text-[12.5px] font-medium max-w-[140px] truncate">{l.title}</div>
              <button
                onClick={() => removeId(l.id)}
                className="text-text-2 hover:text-accent-red transition-colors ml-0.5"
              >
                <X size={13} />
              </button>
            </div>
          ))}
          {selected.length < 6 && (
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="px-3 py-2 rounded-[10px] bg-bg-2 border border-dashed border-line-strong text-text-1 hover:border-orange hover:text-orange hover:border-solid text-[12.5px] font-semibold transition-all flex items-center gap-1.5"
            >
              <Plus size={13} /> Thêm SP
            </button>
          )}
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      {/* Product picker dropdown */}
      {showPicker && (
        <div className="card p-4 mb-5 max-h-[280px] overflow-y-auto">
          <div className="font-mono text-[10.5px] text-text-2 uppercase tracking-[0.1em] font-semibold mb-3">
            Chọn sản phẩm để thêm vào so sánh:
          </div>
          {allListings.filter((l) => !selectedIds.includes(l.id)).length === 0 ? (
            <div className="text-[13px] text-text-2 text-center py-4">Tất cả sản phẩm đã được chọn</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {allListings.filter((l) => !selectedIds.includes(l.id)).map((l) => (
                <button
                  key={l.id}
                  onClick={() => addId(l.id)}
                  className="text-left p-3 rounded-[10px] bg-bg-2 hover:bg-bg-3 hover:border-orange border border-line transition-all flex items-center gap-2.5"
                >
                  <ListingThumb listing={l} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{l.title}</div>
                    <div className="text-[11px] text-text-2 truncate">{l.shopName}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Color legend */}
      {selected.length >= 2 && (
        <div className="flex gap-3 flex-wrap mb-5">
          {selected.map((l, i) => (
            <div key={l.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-bg-1 rounded-lg border border-line text-[12px]">
              <ListingThumb listing={l} size={22} />
              <div className="w-6 h-1 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="font-medium truncate max-w-[160px]">{l.title.slice(0, 30)}</span>
            </div>
          ))}
        </div>
      )}

      {selected.length < 2 ? (
        <div className="card p-12 text-center">
          <div className="font-display text-xl font-semibold mb-2">Cần ít nhất 2 sản phẩm</div>
          <div className="text-text-2 text-[13px]">Thêm sản phẩm để bắt đầu so sánh</div>
        </div>
      ) : (
        <CompareCharts listings={selected} range={range} />
      )}
    </div>
  );
}

function CompareCharts({ listings, range }: { listings: Listing[]; range: DateRange }) {
  const days = parseInt(range) || 30;
  const labels = (listings[0]?.snapshots || []).slice(-days).map((s) => {
    const d = new Date(s.capturedAt);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  const buildChart = (key: 'soldDaily' | 'viewsDaily' | 'revenueUsd') => ({
    labels,
    datasets: listings.map((l, i) => ({
      label: l.title.slice(0, 30),
      data: (l.snapshots || []).slice(-days).map((s) => s[key]),
      borderColor: COLORS[i % COLORS.length],
      backgroundColor: COLORS[i % COLORS.length] + '18',
      borderWidth: 2.5,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: COLORS[i % COLORS.length],
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2,
      fill: false,
    })),
  });

  const opts = (labelFn: (v: number) => string): any => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f1a16',
        borderColor: '#f1641e',
        borderWidth: 1,
        padding: { x: 14, y: 10 },
        cornerRadius: 10,
        titleFont: { family: 'Bricolage Grotesque', size: 13, weight: '700' },
        bodyFont: { family: 'DM Mono', size: 12 },
        titleColor: '#fff',
        displayColors: true,
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label?.slice(0, 20)}: ${labelFn(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#2a221d', drawTicks: false },
        border: { display: false },
        ticks: { color: '#6b5744', font: { size: 10, family: 'DM Mono' }, maxTicksLimit: 8, maxRotation: 0, padding: 6 },
      },
      y: {
        grid: { color: '#2a221d', drawTicks: false },
        border: { display: false },
        ticks: {
          color: '#6b5744',
          font: { size: 10, family: 'DM Mono' },
          padding: 8,
          callback: (val: number) => labelFn(val),
        },
      },
    },
    interaction: { intersect: false, mode: 'index' },
    animation: { duration: 600 },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <CompareCard title="Số đơn bán theo ngày" subtitle="So sánh tốc độ bán hàng" listings={listings}>
        <Line data={buildChart('soldDaily')} options={opts((v) => v.toLocaleString())} />
      </CompareCard>
      <CompareCard title="Doanh thu theo ngày (USD)" subtitle="Doanh thu mỗi sản phẩm" listings={listings}>
        <Line data={buildChart('revenueUsd')} options={opts((v) => `$${v.toFixed(0)}`)} />
      </CompareCard>
      <CompareCard title="Lượt xem theo ngày" subtitle="Mức độ quan tâm từ người mua" listings={listings}>
        <Line data={buildChart('viewsDaily')} options={opts((v) => v.toLocaleString())} />
      </CompareCard>
    </div>
  );
}

function CompareCard({
  title, subtitle, listings, children,
}: {
  title: string;
  subtitle: string;
  listings: Listing[];
  children: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col overflow-hidden hover:border-orange transition-all duration-300 hover:-translate-y-0.5">
      <div className="px-6 pt-5 pb-4 border-b border-line">
        <div className="font-display text-[17px] font-bold tracking-tight mb-1">{title}</div>
        <div className="text-[12.5px] text-text-2">{subtitle}</div>
        {/* Mini legend */}
        <div className="flex gap-2 flex-wrap mt-3">
          {listings.map((l, i) => (
            <div key={l.id} className="flex items-center gap-1.5 text-[11px] text-text-2">
              <div className="w-3 h-1 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="truncate max-w-[80px]">{l.shopName}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 pt-4 pb-5 h-[260px] xl:h-[300px]">{children}</div>
    </div>
  );
}
