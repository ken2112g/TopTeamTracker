'use client';

import { useEffect, useState, useRef } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, Database, Zap, Play, ChevronDown } from 'lucide-react';

interface HarvestStats {
  totalListings: number;
  activeListings: number;
  snapshotsLast24h: number;
  heyetsyLast24h: number;
  staleListings: number;
  lastHarvestAt: string | null;
  timeline: { day: string; total: number; heyetsy: number }[];
  staleRows: { id: string; etsyListingId: string; title: string; lastSnapshotAt: string | null; workspaceName: string }[];
}

function fmtDateTime(iso: string | null) {
  if (!iso) return 'Chưa có dữ liệu';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const hrs = Math.round(diff / 3_600_000);
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins} phút trước`;
  if (hrs < 24) return `${hrs} giờ trước`;
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtDay(day: string) {
  const d = new Date(day + 'T00:00:00');
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Hôm nay';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function HarvestStatusDot({ lastAt }: { lastAt: string | null }) {
  if (!lastAt) return <span className="w-2 h-2 rounded-full bg-red-500" />;
  const diff = Date.now() - new Date(lastAt).getTime();
  if (diff < 86_400_000) return <span className="w-2 h-2 rounded-full bg-green-400" />;
  if (diff < 2 * 86_400_000) return <span className="w-2 h-2 rounded-full bg-amber-400" />;
  return <span className="w-2 h-2 rounded-full bg-red-500" />;
}

export default function AdminHarvestPage() {
  const [stats, setStats] = useState<HarvestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const load = () => {
    fetch('/api/admin/harvest')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 30_000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const coverage = stats
    ? stats.activeListings > 0
      ? Math.round(((stats.activeListings - stats.staleListings) / stats.activeListings) * 100)
      : 100
    : 0;

  const maxTimeline = Math.max(...(stats?.timeline.map(t => t.total) ?? [1]), 1);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-0">Harvest Control</h1>
          <p className="text-text-2 text-[13px] mt-0.5">
            Lần harvest cuối:{' '}
            <span className="text-text-1 font-medium">{loading ? '...' : fmtDateTime(stats?.lastHarvestAt ?? null)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Trigger harvest */}
          <button
            onClick={async () => {
              if (!confirm('Reset last_snapshot_at cho tất cả listings đang active? Daemon sẽ harvest lại toàn bộ trong lần chạy tiếp theo.')) return;
              setTriggering(true);
              setTriggerResult(null);
              try {
                const res = await fetch('/api/admin/harvest/trigger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                const data = await res.json();
                setTriggerResult(data.ok ? `Đã queue ${data.queued ?? '?'} listings — daemon sẽ harvest trong lần chạy tiếp.` : (data.error ?? 'Lỗi'));
              } catch { setTriggerResult('Lỗi kết nối'); }
              setTriggering(false);
            }}
            disabled={triggering}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange/10 border border-orange/30 text-orange hover:bg-orange/18 transition-all text-[13px] font-medium disabled:opacity-50"
          >
            {triggering ? <span className="w-3.5 h-3.5 border-2 border-orange/30 border-t-orange rounded-full animate-spin" /> : <Play size={13} />}
            Trigger Harvest
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-2 border border-line text-text-1 hover:border-orange/40 hover:text-orange transition-all text-[13px] font-medium"
          >
            <RefreshCw size={14} />
            Làm mới
          </button>
        </div>
      </div>

      {triggerResult && (
        <div className={`mb-5 px-4 py-2.5 rounded-xl border text-[12.5px] ${
          triggerResult.startsWith('Đã') ? 'border-green-500/30 bg-green-500/8 text-green-400' : 'border-red-500/30 bg-red-500/8 text-red-400'
        }`}>
          {triggerResult}
        </div>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Listings đang theo dõi"
          value={stats?.activeListings ?? 0}
          icon={Database}
          color="text-orange"
          loading={loading}
        />
        <StatCard
          label="Snapshots 24h qua"
          value={stats?.snapshotsLast24h ?? 0}
          icon={CheckCircle}
          color="text-green-400"
          loading={loading}
        />
        <StatCard
          label="HeyEtsy 24h qua"
          value={stats?.heyetsyLast24h ?? 0}
          icon={Zap}
          color="text-amber-400"
          loading={loading}
        />
        <StatCard
          label="Chưa harvest 24h"
          value={stats?.staleListings ?? 0}
          icon={AlertTriangle}
          color={stats?.staleListings ? 'text-red-400' : 'text-green-400'}
          loading={loading}
        />
      </div>

      {/* Coverage bar */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium text-text-1">Độ phủ harvest 24h</span>
          <span className={`font-display text-xl font-bold ${coverage >= 90 ? 'text-green-400' : coverage >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
            {coverage}%
          </span>
        </div>
        <div className="h-3 bg-bg-3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${coverage >= 90 ? 'bg-green-400' : coverage >= 70 ? 'bg-amber-400' : 'bg-red-500'}`}
            style={{ width: `${coverage}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[11px] font-mono text-text-2">
          <span>{stats ? stats.activeListings - stats.staleListings : 0} đã harvest</span>
          <span>{stats?.staleListings ?? 0} chưa harvest</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Timeline chart */}
        <div className="card p-5">
          <h2 className="text-[13px] font-semibold text-text-1 mb-5">Snapshots 7 ngày qua</h2>
          {loading ? (
            <div className="flex items-end gap-2 h-28">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 bg-bg-3 rounded-t animate-pulse" style={{ height: `${30 + Math.random() * 70}%` }} />
              ))}
            </div>
          ) : (
            <div className="flex items-end gap-2 h-28">
              {(stats?.timeline ?? []).slice(-7).map(({ day, total, heyetsy }) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full relative" style={{ height: `${Math.round((total / maxTimeline) * 100)}%`, minHeight: 4 }}>
                    <div className="absolute inset-0 bg-orange/30 rounded-t" />
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-orange rounded-t"
                      style={{ height: `${total > 0 ? Math.round((heyetsy / total) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-[9.5px] font-mono text-text-2 group-hover:text-text-1 transition-colors">{fmtDay(day)}</span>
                  <div className="hidden group-hover:block absolute -top-10 bg-bg-0 border border-line rounded-lg px-2 py-1 text-[10.5px] font-mono text-text-0 whitespace-nowrap z-10 pointer-events-none">
                    {total} snaps ({heyetsy} HeyEtsy)
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 mt-3 text-[11px] text-text-2">
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded bg-orange inline-block" />HeyEtsy</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded bg-orange/30 inline-block" />Estimate</span>
          </div>
        </div>

        {/* Stale listings */}
        <div className="card p-5">
          <h2 className="text-[13px] font-semibold text-text-1 mb-4">Listings lâu chưa harvest</h2>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-bg-3 rounded animate-pulse" />
              ))}
            </div>
          ) : (stats?.staleRows ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 text-text-2">
              <CheckCircle size={24} className="text-green-400 mb-2" />
              <span className="text-[13px]">Tất cả listings đã được harvest!</span>
            </div>
          ) : (
            <div className="space-y-2">
              {(stats?.staleRows ?? []).map(l => (
                <div key={l.id} className="flex items-center justify-between gap-2 px-3 py-2.5 bg-bg-1 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <HarvestStatusDot lastAt={l.lastSnapshotAt} />
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-medium text-text-0 truncate">{l.title}</div>
                      <div className="text-[10.5px] text-text-2">{l.workspaceName}</div>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-text-2 flex-shrink-0">
                    <Clock size={11} className="inline mr-1 mb-0.5" />
                    {l.lastSnapshotAt ? fmtDateTime(l.lastSnapshotAt) : 'Chưa có'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daemon instructions — Windows VPS */}
      <div className="card p-6 mt-6 border-orange/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange/10 border border-orange/25 grid place-items-center flex-shrink-0">
            <Zap size={18} className="text-orange" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-semibold text-text-0 text-[14.5px]">Chạy Harvest Daemon (Windows VPS)</h2>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">Windows</span>
            </div>
            <p className="text-text-2 text-[12.5px] leading-relaxed mb-5">
              Daemon dùng Playwright mở Chrome thật (có HeyEtsy extension) để đọc data. Không cần Xvfb hay display ảo — Windows chạy thẳng luôn.
            </p>

            {/* Setup steps */}
            <div className="mb-4">
              <div className="text-[10.5px] font-mono text-text-2 uppercase tracking-wide mb-2">Bước 1 — Cài đặt lần đầu (chạy 1 lần)</div>
              <code className="block bg-bg-0 border border-line rounded-xl px-4 py-3 text-[12px] font-mono text-text-1 leading-relaxed whitespace-pre">
                {'npm install\nnpx playwright install chromium\nnpm install -g pm2\nnpm install -g pm2-windows-startup\npm2-startup install'}
              </code>
            </div>

            {/* .env file */}
            <div className="mb-4">
              <div className="text-[10.5px] font-mono text-text-2 uppercase tracking-wide mb-2">Bước 2 — Tạo file .env trên VPS</div>
              <code className="block bg-bg-0 border border-line rounded-xl px-4 py-3 text-[12px] font-mono text-text-1 leading-relaxed whitespace-pre">
                {'ETSYPULSE_API_URL=https://your-domain.vercel.app\nHARVEST_TOKEN=<lấy từ Admin → Workspace>\nHEYETSY_EXT_PATH=C:\\heyetsy-ext\nN_WORKERS=3\nHARVEST_HOUR=2\nDELAY_MS=5000'}
              </code>
            </div>

            {/* Run commands */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-[10.5px] font-mono text-text-2 uppercase tracking-wide mb-1.5">Bước 3A — Test chạy 1 lần</div>
                <code className="block bg-bg-0 border border-line rounded-xl px-4 py-3 text-[12px] font-mono text-text-1">
                  node services/harvest-daemon.mjs
                </code>
              </div>
              <div>
                <div className="text-[10.5px] font-mono text-text-2 uppercase tracking-wide mb-1.5">Bước 3B — Bật daemon tự động</div>
                <code className="block bg-bg-0 border border-line rounded-xl px-4 py-3 text-[12px] font-mono text-text-1 leading-relaxed whitespace-pre">
                  {'pm2 start ecosystem.config.cjs\npm2 save'}
                </code>
              </div>
            </div>

            {/* HeyEtsy ext note */}
            <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl px-4 py-3 text-[12.5px] text-amber-300 leading-relaxed">
              <span className="font-semibold">Lưu ý HeyEtsy Extension:</span> Copy thư mục extension HeyEtsy đã unpack từ Chrome trên máy local vào VPS (VD: <code className="text-[11.5px] bg-bg-0 px-1.5 py-0.5 rounded mx-0.5">C:\heyetsy-ext</code>). Sau đó set <code className="text-[11.5px] bg-bg-0 px-1.5 py-0.5 rounded mx-0.5">HEYETSY_EXT_PATH</code> trỏ vào thư mục đó. Worker sẽ tự login HeyEtsy lần đầu — bạn cần RDP vào để đăng nhập 1 lần, sau đó profile được lưu lại.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, loading }: {
  label: string; value: number | string; icon: any; color: string; loading: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-text-2">{label}</span>
        <Icon size={14} className={color} />
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-bg-3 rounded animate-pulse" />
      ) : (
        <div className={`font-display text-2xl font-bold ${color}`}>{value}</div>
      )}
    </div>
  );
}
