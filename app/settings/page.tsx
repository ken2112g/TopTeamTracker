'use client';

import {
  Bell, Check, Users, ArrowRight, KeyRound, Eye, EyeOff, Copy,
  RotateCcw, UserPlus, LogOut, AlertTriangle, ShieldCheck, Puzzle, Download,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMyHarvestToken, regenerateMyHarvestToken } from '@/lib/actions/harvest-token';
import { upgradeToTeam } from '@/lib/actions/workspace';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { showToast, settings, updateSetting, resetAllData } = useAppStore();
  const { currentUser, currentTeam, currentTeamMembers, logout } = useAuthStore();
  const router = useRouter();

  const isTeamOwnerOrAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';
  const isPersonal = currentUser?.accountType === 'personal';

  const [harvestToken, setHarvestToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    getMyHarvestToken().then(({ token }) => setHarvestToken(token));
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    logout();
    router.push('/auth/login');
  };

  const handleResetAll = () => {
    if (confirm('Xóa toàn bộ dữ liệu cục bộ? Collections, cài đặt và lịch sử sẽ được reset.')) {
      resetAllData();
      showToast('Đã reset', 'Dữ liệu cục bộ đã được xóa về mặc định', 'success');
      router.push('/');
    }
  };

  const avatarLetter = (currentUser?.name ?? currentUser?.email ?? 'U')[0].toUpperCase();
  const roleLabel =
    currentUser?.isSuperAdmin ? 'Server Admin'
    : currentUser?.role === 'owner' ? 'Admin'
    : currentUser?.role === 'admin' ? 'Leader'
    : 'Member';

  return (
    <div className="p-8 xl:p-10">
      {/* Page header */}
      <div className="font-mono text-[11px] text-orange tracking-[0.2em] uppercase mb-3 flex items-center gap-2.5">
        <span className="w-6 h-0.5 bg-orange" />
        Tài khoản
      </div>
      <div className="flex items-end justify-between gap-6 mb-8 pb-6 border-b border-line">
        <div>
          <h1 className="font-display text-[42px] font-bold tracking-tight leading-tight mb-2">
            Cài <em className="text-orange not-italic">đặt</em>
          </h1>
          <p className="text-[14px] text-text-2">
            Hồ sơ, extension, thông báo và bảo mật tài khoản của bạn.
          </p>
        </div>
      </div>

      {/* 2-column grid */}
      <div className="grid xl:grid-cols-2 gap-5 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-5">

          {/* Hồ sơ cá nhân */}
          <Section title="Hồ sơ cá nhân">
            <div className="flex items-center gap-5 pb-1">
              <div className="w-16 h-16 rounded-2xl bg-orange grid place-items-center font-display font-extrabold text-white text-2xl shadow-[0_8px_20px_rgba(241,100,30,0.3)] shrink-0">
                {avatarLetter}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-[18px] font-bold truncate">
                  {currentUser?.name || '—'}
                </div>
                <div className="text-[13px] text-text-2 truncate mt-0.5">
                  {currentUser?.email || '—'}
                </div>
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-full bg-orange/15 text-orange border border-orange/25 font-semibold">
                    {roleLabel}
                  </span>
                  {currentUser?.accountType === 'team' && (
                    <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-full bg-bg-2 text-text-2 border border-line">
                      Team
                    </span>
                  )}
                  <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-full bg-bg-2 text-text-2 border border-line truncate max-w-[160px]" title={currentUser?.workspaceName ?? currentTeam?.name ?? ''}>
                    {currentUser?.workspaceName ?? currentTeam?.name ?? '—'}
                  </span>
                </div>
              </div>
            </div>
          </Section>

          {/* Extension Chrome */}
          <Section icon={<KeyRound size={17} className="text-orange" />} title="Extension Chrome">
            <p className="text-[13px] text-text-2 mb-5 leading-relaxed">
              Token bí mật để extension Chrome kết nối với workspace của bạn.
              Dán token này vào popup extension khi được hỏi.
            </p>

            {harvestToken ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-bg-2 border border-line rounded-xl px-3 py-2.5 font-mono text-[12px] text-text-1 overflow-hidden select-all truncate">
                    {showToken ? harvestToken : '•'.repeat(36)}
                  </div>
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="p-2.5 rounded-xl bg-bg-2 border border-line hover:border-orange/40 transition-all text-text-2 hover:text-orange shrink-0"
                    title={showToken ? 'Ẩn token' : 'Hiện token'}
                  >
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(harvestToken);
                      showToast('Đã copy', 'Token đã được copy vào clipboard', 'success');
                    }}
                    className="p-2.5 rounded-xl bg-bg-2 border border-line hover:border-orange/40 transition-all text-text-2 hover:text-orange shrink-0"
                    title="Copy token"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <button
                  disabled={tokenLoading}
                  onClick={async () => {
                    if (!confirm('Đổi token sẽ làm mất kết nối của extension đang dùng token cũ. Tiếp tục?')) return;
                    setTokenLoading(true);
                    const { token, error } = await regenerateMyHarvestToken();
                    if (token) {
                      setHarvestToken(token);
                      setShowToken(true);
                      showToast('Token mới', 'Hãy cập nhật token trong extension', 'success');
                    } else {
                      showToast('Lỗi', error ?? 'Không thể đổi token', 'error');
                    }
                    setTokenLoading(false);
                  }}
                  className="flex items-center gap-2 text-[12.5px] text-text-2 hover:text-orange transition-colors disabled:opacity-50 w-fit"
                >
                  <RotateCcw size={12} className={tokenLoading ? 'animate-spin' : ''} />
                  Tạo token mới (vô hiệu hóa token cũ)
                </button>
              </div>
            ) : (
              <div className="text-[13px] text-text-2">
                Chưa có token.{' '}
                <button
                  onClick={async () => {
                    const { token } = await regenerateMyHarvestToken();
                    if (token) { setHarvestToken(token); setShowToken(true); }
                  }}
                  className="text-orange hover:underline"
                >
                  Tạo ngay
                </button>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-dashed border-line">
              <div className="flex items-center gap-2 mb-3">
                <Puzzle size={13} className="text-text-2 shrink-0" />
                <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-2">Chưa cài extension?</span>
              </div>
              <a
                href="https://drive.google.com/drive/folders/1LfYtmEAFavEKCpWh418896GhGMzXXiCm?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-orange/10 border border-orange/30 text-orange hover:bg-orange/15 hover:border-orange/50 transition-all text-[13px] font-semibold w-fit mb-4"
              >
                <Download size={14} />
                Tải extension về máy
              </a>
              <div className="flex flex-col gap-1.5">
                {[
                  'Tải file từ Google Drive về máy',
                  'Mở Chrome → vào chrome://extensions',
                  'Bật "Developer mode" (góc trên phải)',
                  'Kéo thả file .zip vào trang → Done',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="font-mono text-[10px] w-4 h-4 rounded-full bg-bg-3 text-text-2 grid place-items-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[12.5px] text-text-2">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Thông báo */}
          <Section icon={<Bell size={17} className="text-orange" />} title="Thông báo">
            <Row label="Đối thủ giảm giá" hint="Thông báo khi sản phẩm bạn theo dõi giảm giá ≥ 10%">
              <Toggle
                checked={settings.priceDropAlert}
                onChange={(v) => {
                  updateSetting('priceDropAlert', v);
                  showToast(v ? 'Đã bật' : 'Đã tắt', 'Thông báo giảm giá', 'success');
                }}
              />
            </Row>
            <Row label="Bùng nổ doanh số" hint="Thông báo khi sản phẩm bán tăng x2 so với trung bình tuần">
              <Toggle
                checked={settings.salesBoomAlert}
                onChange={(v) => {
                  updateSetting('salesBoomAlert', v);
                  showToast(v ? 'Đã bật' : 'Đã tắt', 'Thông báo bùng nổ doanh số', 'success');
                }}
              />
            </Row>
            <Row label="Email digest hàng ngày" hint="Nhận email tóm tắt biến động trong ngày">
              <Toggle
                checked={settings.emailDigest}
                onChange={(v) => {
                  updateSetting('emailDigest', v);
                  showToast(v ? 'Đã bật' : 'Đã tắt', 'Email digest', 'info');
                }}
              />
            </Row>
            <div className="mt-4 pt-4 border-t border-dashed border-line flex gap-2 flex-wrap min-h-[28px]">
              {settings.priceDropAlert && <ActiveChip label="Giảm giá" />}
              {settings.salesBoomAlert && <ActiveChip label="Bùng nổ sales" />}
              {settings.emailDigest && <ActiveChip label="Email digest" />}
              {!settings.priceDropAlert && !settings.salesBoomAlert && !settings.emailDigest && (
                <span className="text-[12.5px] text-text-2 italic">Tất cả thông báo đang tắt</span>
              )}
            </div>
          </Section>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="flex flex-col gap-5">

          {/* Workspace & Nhóm */}
          <Section icon={<Users size={17} className="text-orange" />} title="Workspace & Nhóm">
            <Row label="Loại tài khoản">
              <span className="px-3 py-1.5 rounded-lg bg-orange/10 text-orange font-mono text-[12px] font-semibold">
                {currentUser?.accountType === 'team' ? 'Team' : 'Cá nhân'}
              </span>
            </Row>
            <Row label="Workspace">
              <span className="px-3 py-1.5 rounded-lg bg-bg-2 text-text-1 font-mono text-[12px] max-w-[140px] truncate block" title={currentTeam?.name ?? ''}>
                {currentTeam?.name ?? '—'}
              </span>
            </Row>
            {currentUser?.accountType === 'team' && (
              <Row label="Thành viên">
                <span className="px-3 py-1.5 rounded-lg bg-bg-2 text-text-1 font-mono text-[12px]">
                  {currentTeamMembers.length} người
                </span>
              </Row>
            )}
            {currentUser?.accountType === 'team' && isTeamOwnerOrAdmin && (
              <Row label="Quản lý nhóm" hint="Thêm thành viên, phân quyền, tạm khóa tài khoản">
                <Link href="/team" className="btn btn-primary text-[13px] flex items-center gap-2">
                  Đến trang quản lý <ArrowRight size={14} />
                </Link>
              </Row>
            )}
            {isPersonal && currentUser?.role === 'owner' && (
              <Row label="Nâng cấp Team" hint="Thêm thành viên và cộng tác trong cùng workspace" border={false}>
                <button
                  disabled={upgradeLoading}
                  onClick={async () => {
                    if (!confirm('Chuyển workspace này sang chế độ Team? Bạn có thể thêm thành viên sau.')) return;
                    setUpgradeLoading(true);
                    const res = await upgradeToTeam();
                    if (res.ok) {
                      showToast('Đã nâng cấp', 'Workspace đã chuyển sang Team.', 'success');
                      window.location.reload();
                    } else {
                      showToast('Lỗi', res.error ?? 'Không thể nâng cấp', 'error');
                      setUpgradeLoading(false);
                    }
                  }}
                  className="btn btn-primary text-[13px] flex items-center gap-2 disabled:opacity-60"
                >
                  {upgradeLoading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <UserPlus size={14} />}
                  Chuyển sang Team
                </button>
              </Row>
            )}
          </Section>

          {/* Bảo mật */}
          <Section icon={<ShieldCheck size={17} className="text-orange" />} title="Bảo mật">
            <Row label="Phiên đăng nhập" hint="Đang đăng nhập trên thiết bị này" border={false}>
              <button
                disabled={logoutLoading}
                onClick={handleLogout}
                className="btn text-[13px] flex items-center gap-2 border-line hover:border-accent-red hover:text-accent-red disabled:opacity-50 transition-colors"
              >
                {logoutLoading
                  ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  : <LogOut size={14} />}
                Đăng xuất
              </button>
            </Row>
          </Section>

          {/* Vùng nguy hiểm */}
          <div className="border border-accent-red/50 rounded-2xl p-6 bg-accent-red/5">
            <div className="text-accent-red font-display text-[16px] font-bold mb-1 flex items-center gap-2">
              <AlertTriangle size={17} /> Vùng nguy hiểm
            </div>
            <div className="text-[13px] text-text-2 mb-5">Hành động không thể hoàn tác.</div>
            <Row label="Xóa dữ liệu cục bộ" hint="Xóa collections, cài đặt và lịch sử lưu trên trình duyệt này" border={false}>
              <button
                onClick={handleResetAll}
                className="btn text-[13px] bg-accent-red text-white border-accent-red hover:bg-red-600"
              >
                Xóa tất cả
              </button>
            </Row>
          </div>

        </div>
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

function Section({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2.5 mb-5">
        {icon}
        <div className="font-display text-[17px] font-bold">{title}</div>
      </div>
      {children}
    </div>
  );
}

function Row({ label, hint, children, border = true }: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  border?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-3.5 gap-4 ${border ? 'border-b border-dashed border-line last:border-0 last:pb-0' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="font-display text-[14px] font-semibold">{label}</div>
        {hint && <div className="text-[12px] text-text-2 leading-relaxed mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
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
