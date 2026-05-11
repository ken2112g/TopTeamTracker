'use client';

import { Database, AlertTriangle, Bell, Check, Users, ArrowRight, Link2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCookieStatus, type CookieStatus } from '@/lib/actions/cookie-status';

export default function SettingsPage() {
  const { showToast, settings, updateSetting, resetAllData } = useAppStore();
  const { currentUser, currentTeam, currentTeamMembers } = useAuthStore();
  const router = useRouter();
  const isTeamOwnerOrAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';
  const [cookieStatus, setCookieStatus] = useState<CookieStatus | null>(null);

  useEffect(() => {
    getCookieStatus().then(setCookieStatus).catch(() => {});
  }, []);

  const handleResetAll = () => {
    if (confirm('Xóa toàn bộ dữ liệu? Tất cả collections, tags, lịch sử tìm kiếm và cài đặt sẽ bị xóa.')) {
      resetAllData();
      showToast('🗑 Đã reset', 'Toàn bộ dữ liệu đã được xóa về mặc định', 'success');
      router.push('/');
    }
  };

  return (
    <div className="p-8 xl:p-10">
      <div className="font-mono text-[11px] text-orange tracking-[0.2em] uppercase mb-3 flex items-center gap-2.5">
        <span className="w-6 h-0.5 bg-orange" />
        Cấu hình hệ thống
      </div>
      <h1 className="font-display text-[42px] font-bold tracking-tight leading-tight mb-3">
        Cài đặt <em className="text-orange not-italic">EtsyPulse</em>
      </h1>
      <p className="text-[15px] text-text-2 leading-relaxed mb-8">
        Tùy chỉnh tracker, cảnh báo, team và các thiết lập khác. Hiện đang ở chế độ Demo (mock data).
      </p>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* ── Etsy Connection ─────────────────────────── */}
          <Section icon={<Link2 size={20} className="text-orange" />} title="Kết nối Etsy">

            {/* Daemon status */}
            <Row label="Scraper Daemon" hint="Process giữ Chrome mở 24/7, tự refresh cookie mỗi 90 phút">
              <div className="flex items-center gap-2">
                {cookieStatus === null ? (
                  <span className="text-text-2 font-mono text-[12px]">Đang kiểm tra...</span>
                ) : cookieStatus.daemonRunning ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-green" />
                    </span>
                    <span className="font-mono text-[12px] text-accent-green font-semibold">Đang chạy</span>
                    {cookieStatus.daemonRefreshCount > 0 && (
                      <span className="font-mono text-[10px] text-text-2 bg-bg-2 px-2 py-0.5 rounded">
                        {cookieStatus.daemonRefreshCount}× refresh
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-text-2" />
                    <span className="font-mono text-[12px] text-text-2">Chưa chạy</span>
                  </>
                )}
              </div>
            </Row>

            {/* Cookie status */}
            <Row label="DataDome Cookie" hint="Cookie từ browser thật để bypass DataDome">
              <div className="flex items-center gap-2">
                {cookieStatus === null ? (
                  <span className="text-text-2 font-mono text-[12px]">...</span>
                ) : cookieStatus.hasCookie ? (
                  <>
                    <CheckCircle2 size={15} className="text-accent-green" />
                    <span className="font-mono text-[11px] text-accent-green font-semibold">
                      {cookieStatus.source === 'daemon' ? 'Auto (daemon)' : 'Thủ công (env)'}
                    </span>
                    <span className="font-mono text-[10px] text-text-2 bg-bg-2 px-2 py-0.5 rounded">
                      {cookieStatus.cookiePreview}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle size={15} className="text-accent-red" />
                    <span className="font-mono text-[12px] text-accent-red font-semibold">Chưa có cookie</span>
                  </>
                )}
              </div>
            </Row>

            {/* Start daemon instructions */}
            <div className="mt-2 pt-3 border-t border-dashed border-line">
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-2 mb-2">
                {cookieStatus?.daemonRunning ? 'Daemon đang chạy ✓' : 'Khởi động daemon'}
              </div>
              {!cookieStatus?.daemonRunning && (
                <>
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-bg-0 border border-line font-mono text-[13px] mb-2">
                    <RefreshCw size={13} className="text-orange flex-shrink-0" />
                    <span className="text-orange select-all">npm run daemon</span>
                    <span className="text-text-2 text-[10px] ml-auto">terminal riêng</span>
                  </div>
                  <div className="text-[11.5px] text-text-2 leading-relaxed">
                    Mở Chrome, vào etsy.com, tự lấy cookie. Tắt PC → mất session. Với VPS sẽ chạy 24/7.
                  </div>
                </>
              )}
              {cookieStatus?.daemonRunning && cookieStatus.daemonLastRefresh && (
                <div className="text-[11.5px] text-text-2">
                  Lần refresh gần nhất:{' '}
                  <span className="font-mono text-accent-green">
                    {new Date(cookieStatus.daemonLastRefresh).toLocaleTimeString('vi-VN')}
                  </span>
                  {' '}— tự refresh sau{' '}
                  <span className="font-mono">90 phút</span>
                </div>
              )}
            </div>
          </Section>

          <Section icon={<Database size={20} className="text-orange" />} title="Database & Storage">
            <Row label="Database hiện tại" hint="Đang chạy với mock data trong RAM. Phase 2 sẽ kết nối Supabase PostgreSQL.">
              <span className="px-3 py-1.5 rounded-lg bg-bg-2 text-orange font-mono text-[12px] font-semibold">Demo Mode</span>
            </Row>
            <Row label="Phiên bản" hint="EtsyPulse Phase 1 — Mock Data">
              <span className="px-3 py-1.5 rounded-lg bg-bg-2 text-text-2 font-mono text-[12px]">v0.1.0</span>
            </Row>
          </Section>

          <Section icon={<Bell size={20} className="text-orange" />} title="Thông báo & Cảnh báo">
            <Row label="Đối thủ giảm giá" hint="Báo khi 1 SP bạn track giảm giá ≥10%">
              <Toggle
                checked={settings.priceDropAlert}
                onChange={(v) => {
                  updateSetting('priceDropAlert', v);
                  showToast(v ? '🔔 Đã bật' : '🔕 Đã tắt', 'Cảnh báo giảm giá', 'success');
                }}
              />
            </Row>
            <Row label="Bùng nổ doanh số" hint="Báo khi 1 SP bán tăng x2 so với trung bình">
              <Toggle
                checked={settings.salesBoomAlert}
                onChange={(v) => {
                  updateSetting('salesBoomAlert', v);
                  showToast(v ? '🔔 Đã bật' : '🔕 Đã tắt', 'Cảnh báo bùng nổ doanh số', 'success');
                }}
              />
            </Row>
            <Row label="Email digest hàng ngày" hint="Nhận email tóm tắt biến động trong ngày (Phase 2)">
              <Toggle
                checked={settings.emailDigest}
                onChange={(v) => {
                  updateSetting('emailDigest', v);
                  showToast(v ? '📧 Đã bật' : '📧 Đã tắt', 'Email digest — sẽ active ở Phase 2', 'info');
                }}
              />
            </Row>

            <div className="mt-4 pt-4 border-t border-dashed border-line">
              <div className="font-mono uppercase tracking-[0.08em] text-[10px] text-text-2 mb-2">Đang bật</div>
              <div className="flex gap-2 flex-wrap">
                {settings.priceDropAlert && <ActiveChip label="Giảm giá" />}
                {settings.salesBoomAlert && <ActiveChip label="Bùng nổ sales" />}
                {settings.emailDigest && <ActiveChip label="Email digest" />}
                {!settings.priceDropAlert && !settings.salesBoomAlert && !settings.emailDigest && (
                  <span className="text-[12.5px] text-text-2 italic">Tất cả thông báo đang tắt</span>
                )}
              </div>
            </div>
          </Section>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <Section icon={<Users size={20} className="text-orange" />} title="Tài khoản & Nhóm">
            <Row label="Loại tài khoản">
              <span className="px-3 py-1.5 rounded-lg bg-orange/10 text-orange font-mono text-[12px] font-semibold">
                {currentUser?.accountType === 'team' ? 'Team' : 'Cá nhân'}
              </span>
            </Row>
            <Row label="Vai trò">
              <span className="px-3 py-1.5 rounded-lg bg-bg-2 text-text-1 font-mono text-[12px]">
                {currentUser?.role === 'owner' ? 'Trưởng nhóm' : currentUser?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
              </span>
            </Row>
            {currentUser?.accountType === 'team' && (
              <>
                <Row label="Workspace">
                  <span className="px-3 py-1.5 rounded-lg bg-bg-2 text-text-1 font-mono text-[12px]">
                    {currentTeam?.name ?? '—'}
                  </span>
                </Row>
                <Row label="Số thành viên">
                  <span className="px-3 py-1.5 rounded-lg bg-bg-2 text-text-1 font-mono text-[12px]">
                    {currentTeamMembers.length} người
                  </span>
                </Row>
                {isTeamOwnerOrAdmin && (
                  <Row label="Quản lý nhóm" hint="Tạo tài khoản thành viên, phân quyền, tạm khóa">
                    <Link
                      href="/team"
                      className="btn btn-primary text-[13px] flex items-center gap-2"
                    >
                      Đến trang quản lý <ArrowRight size={14} />
                    </Link>
                  </Row>
                )}
              </>
            )}
          </Section>

          <div className="border border-accent-red rounded-2xl p-6 bg-accent-red/5">
            <div className="text-accent-red font-display text-base font-bold mb-1 flex items-center gap-2">
              <AlertTriangle size={18} /> Vùng nguy hiểm
            </div>
            <div className="text-[13.5px] text-text-2 mb-5">Hành động không thể hoàn tác.</div>
            <Row label="Xóa toàn bộ dữ liệu" hint="Xóa tất cả collections, tags, lịch sử, cài đặt về mặc định" border={false}>
              <button
                onClick={handleResetAll}
                className="btn bg-accent-red text-white border-accent-red hover:bg-red-600"
              >
                🗑 Xóa tất cả
              </button>
            </Row>
          </div>
        </div>
      </div>

      <div className="mt-8 text-[12px] text-text-2 italic text-center">
        EtsyPulse Web v0.1.0 · Phase 1 · Mock Data Mode
      </div>
    </div>
  );
}

function ActiveChip({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-green/10 text-accent-green text-[11.5px] font-semibold">
      <Check size={10} /> {label}
    </span>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-7">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <div className="font-display text-2xl font-bold">{title}</div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Row({ label, hint, children, border = true }: { label: string; hint?: string; children: React.ReactNode; border?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-4 gap-6 ${border ? 'border-b border-dashed border-line last:border-0 last:pb-0' : ''}`}>
      <div className="flex-1">
        <div className="font-display text-[15px] font-semibold mb-1">{label}</div>
        {hint && <div className="text-[12.5px] text-text-2 leading-relaxed">{hint}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-block w-12 h-7 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="absolute inset-0 bg-bg-3 rounded-full transition-all peer-checked:bg-orange peer-checked:shadow-lg peer-checked:shadow-orange/30" />
      <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-text-1 rounded-full transition-all peer-checked:translate-x-5 peer-checked:bg-white" />
    </label>
  );
}
