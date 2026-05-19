'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus, CheckCircle2, User, Users, ArrowRight, ArrowLeft, Download, Puzzle } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

const DRIVE_LINK = 'https://drive.google.com/drive/folders/1LfYtmEAFavEKCpWh418896GhGMzXXiCm?usp=sharing';

type Step = 'choose-type' | 'fill-details';
type AccountType = 'personal' | 'team';

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('choose-type');
  const [accountType, setAccountType] = useState<AccountType>('personal');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [extInstalled, setExtInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => {
      setExtInstalled(document.documentElement.getAttribute('data-ttt-ext') === 'true');
    };
    check();
    const t = setTimeout(check, 1000);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); return; }
    if (password !== confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }

    setLoading(true);
    const supabase = getSupabaseClient();
    const { error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim(), account_type: accountType },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (signUpErr) {
      setError(signUpErr.message === 'User already registered'
        ? 'Email này đã được đăng ký. Thử đăng nhập.'
        : signUpErr.message);
      setLoading(false);
      return;
    }

    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-bg-0 grid place-items-center px-4">
        <div className="fixed inset-0 opacity-[0.025] pointer-events-none bg-[url('/noise.png')] z-0" />
        <div className="w-full max-w-[420px] text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-green/15 border border-green/30 grid place-items-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-green" />
          </div>
          <h1 className="font-display text-[26px] font-bold mb-3">Kiểm tra email của bạn</h1>
          <p className="text-[14px] text-text-2 leading-relaxed mb-6">
            Chúng tôi đã gửi link xác nhận tới{' '}
            <span className="text-text-0 font-medium">{email}</span>.
            Click vào link đó để kích hoạt tài khoản.
          </p>
          <Link href="/auth/login" className="btn btn-primary inline-flex justify-center">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-0 grid place-items-center px-4 py-12">
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none bg-[url('/noise.png')] z-0" />

      <div className="w-full max-w-[460px] relative z-10">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src="/logo.svg" alt="TopTeamTracker" width={48} height={48} className="rounded-xl shadow-[0_8px_24px_rgba(241,100,30,0.35)] -rotate-[4deg]" />
          <div>
            <div className="font-display font-bold text-[26px] tracking-tight leading-none">
              TopTeam<span className="text-orange italic">Tracker</span>
            </div>
            <div className="font-mono text-[9.5px] text-text-2 tracking-[0.15em] uppercase mt-1">
              Track · Compare · Win
            </div>
          </div>
        </div>

        {/* Extension status banner */}
        {extInstalled === false && (
          <div className="mb-4 rounded-2xl border border-amber/30 bg-amber/8 p-4">
            <div className="flex items-start gap-3">
              <Puzzle size={18} className="text-amber flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13.5px] text-amber mb-0.5">Chưa cài Extension Chrome</div>
                <div className="text-[12px] text-text-2 mb-3 leading-relaxed">
                  Extension cần thiết để lấy dữ liệu từ Etsy. Cài xong rồi đăng ký để dùng đầy đủ tính năng.
                </div>
                <a
                  href={DRIVE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber/15 border border-amber/30 text-amber text-[12px] font-semibold hover:bg-amber/25 transition-colors"
                >
                  <Download size={12} />
                  Tải Extension về
                </a>
                <p className="text-[11px] text-text-2 mt-2">
                  Sau khi cài: <span className="text-text-1">chrome://extensions → bật Developer Mode → Load unpacked</span>
                </p>
              </div>
            </div>
          </div>
        )}
        {extInstalled === true && (
          <div className="mb-4 rounded-2xl border border-green-500/30 bg-green-500/8 p-3 flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
            <span className="text-[13px] text-green-400 font-medium">Extension đã cài — sẵn sàng đăng ký</span>
          </div>
        )}

        <div className="card p-8">
          {/* Progress dots */}
          <div className="flex items-center gap-3 mb-7">
            <StepDot active={step === 'choose-type'} done={step === 'fill-details'} label="1" />
            <div className="flex-1 h-px bg-line" />
            <StepDot active={step === 'fill-details'} done={false} label="2" />
          </div>

          {step === 'choose-type' ? (
            <>
              <h1 className="font-display text-[26px] font-bold mb-1">Tạo tài khoản</h1>
              <p className="text-[13.5px] text-text-2 mb-6">Chọn loại tài khoản phù hợp.</p>

              <div className="flex flex-col gap-3">
                <AccountTypeCard
                  selected={accountType === 'personal'}
                  onClick={() => setAccountType('personal')}
                  icon={<User size={22} />}
                  title="Cá nhân"
                  description="Dùng một mình để research và theo dõi sản phẩm. Không cần chia sẻ với ai."
                  badge="Miễn phí"
                  badgeColor="#84cc16"
                />
                <AccountTypeCard
                  selected={accountType === 'team'}
                  onClick={() => setAccountType('team')}
                  icon={<Users size={22} />}
                  title="Team"
                  description="Tạo workspace chung cho nhóm. Bạn là Admin, toàn quyền quản lý thành viên."
                  badge="Đề xuất"
                  badgeColor="#f1641e"
                />
              </div>

              <button
                onClick={() => setStep('fill-details')}
                className="btn btn-primary w-full mt-6 justify-center"
              >
                Tiếp theo <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-5">
                <button
                  onClick={() => setStep('choose-type')}
                  className="text-text-2 hover:text-orange transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <h1 className="font-display text-[22px] font-bold">
                  {accountType === 'personal' ? 'Tài khoản cá nhân' : 'Tài khoản team'}
                </h1>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <FormField label="Họ và tên">
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder={accountType === 'team' ? 'Tên Admin (bạn)' : 'Tên của bạn'}
                    required className="input-base" autoFocus
                  />
                </FormField>

                <FormField label="Email">
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="ten@email.com" required className="input-base" autoComplete="email"
                  />
                </FormField>

                <FormField label="Mật khẩu">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự" required className="input-base pr-10"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-2 hover:text-text-0 transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </FormField>

                <FormField label="Xác nhận mật khẩu">
                  <input
                    type="password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu" required className="input-base"
                  />
                </FormField>

                {error && (
                  <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl px-4 py-3 text-[13px] text-accent-red">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="btn btn-primary w-full mt-1 justify-center disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang tạo tài khoản...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <UserPlus size={16} />
                      {accountType === 'team' ? 'Tạo tài khoản Team' : 'Tạo tài khoản'}
                    </span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-5 text-[13px] text-text-2">
          Đã có tài khoản?{' '}
          <Link href="/auth/login" className="text-orange hover:underline font-medium">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className={`w-8 h-8 rounded-full grid place-items-center text-[13px] font-bold border-2 transition-all ${
      done ? 'bg-green border-green text-white' :
      active ? 'bg-orange border-orange text-white shadow-[0_0_12px_rgba(241,100,30,0.4)]' :
      'bg-bg-2 border-line text-text-2'
    }`}>
      {done ? '✓' : label}
    </div>
  );
}

function AccountTypeCard({ selected, onClick, icon, title, description, badge, badgeColor }: {
  selected: boolean; onClick: () => void; icon: React.ReactNode;
  title: string; description: string; badge: string; badgeColor: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`flex gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
        selected ? 'border-orange bg-orange/5 shadow-[0_0_0_1px_rgba(241,100,30,0.2)]'
                 : 'border-line bg-bg-2 hover:border-line/80'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 mt-0.5 transition-colors ${
        selected ? 'bg-orange/20 text-orange' : 'bg-bg-3 text-text-2'
      }`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-display text-[15px] font-bold">{title}</span>
          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold"
            style={{ background: badgeColor + '22', color: badgeColor }}>
            {badge}
          </span>
        </div>
        <p className="text-[12.5px] text-text-2 leading-relaxed">{description}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-1 grid place-items-center transition-all ${
        selected ? 'border-orange bg-orange' : 'border-line'
      }`}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-2">{label}</label>
      {children}
    </div>
  );
}
