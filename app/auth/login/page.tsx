'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/lib/store/useAuthStore';

const DEMO_ACCOUNTS = [
  { label: 'Trưởng nhóm (Team Owner)', email: 'owner@demo.com', password: 'demo123', badge: 'Owner', color: '#f1641e' },
  { label: 'Quản trị viên (Admin)', email: 'admin@demo.com', password: 'demo123', badge: 'Admin', color: '#84cc16' },
  { label: 'Thành viên (Member)', email: 'member1@demo.com', password: 'demo123', badge: 'Member', color: '#60a5fa' },
  { label: 'Cá nhân (Personal)', email: 'personal@demo.com', password: 'demo123', badge: 'Personal', color: '#a78bfa' },
];

export default function LoginPage() {
  const { login } = useAuthStore();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemos, setShowDemos] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    await new Promise((r) => setTimeout(r, 400)); // UX delay

    const user = login(email.trim(), password);
    if (!user) {
      setError('Email hoặc mật khẩu không đúng');
      setLoading(false);
      return;
    }

    router.replace('/');
  };

  const fillDemo = (acc: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
    setShowDemos(false);
  };

  return (
    <div className="min-h-screen bg-bg-0 grid place-items-center px-4 py-12">
      {/* Noise texture overlay */}
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none bg-[url('/noise.png')] z-0" />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-12 h-12 rounded-xl bg-orange grid place-items-center font-display font-extrabold text-white text-2xl shadow-[0_8px_24px_rgba(241,100,30,0.35)] -rotate-[4deg]">
            E
          </div>
          <div>
            <div className="font-display font-bold text-[26px] tracking-tight leading-none">
              Etsy<span className="text-orange italic">Pulse</span>
            </div>
            <div className="font-mono text-[9.5px] text-text-2 tracking-[0.15em] uppercase mt-1">
              Track · Compare · Win
            </div>
          </div>
        </div>

        <div className="card p-8">
          <h1 className="font-display text-[28px] font-bold mb-1">Đăng nhập</h1>
          <p className="text-[14px] text-text-2 mb-7">Chào mừng trở lại. Nhập thông tin tài khoản của bạn.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten@email.com"
                required
                className="input-base"
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-2">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-base pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-2 hover:text-text-0 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl px-4 py-3 text-[13px] text-accent-red">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-1 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={16} />
                  Đăng nhập
                </span>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-5 pt-5 border-t border-dashed border-line">
            <button
              onClick={() => setShowDemos(!showDemos)}
              className="flex items-center gap-2 text-[12.5px] text-text-2 hover:text-orange transition-colors w-full"
            >
              <span className="flex-1 text-left font-mono tracking-[0.05em]">Tài khoản demo để thử nghiệm</span>
              <ChevronDown size={14} className={`transition-transform ${showDemos ? 'rotate-180' : ''}`} />
            </button>

            {showDemos && (
              <div className="mt-3 flex flex-col gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => fillDemo(acc)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-2 hover:bg-bg-3 border border-line hover:border-orange/30 transition-all text-left group"
                  >
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold shrink-0"
                      style={{ background: acc.color + '22', color: acc.color }}
                    >
                      {acc.badge}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-text-0 truncate">{acc.label}</div>
                      <div className="font-mono text-[11px] text-text-2 truncate">{acc.email}</div>
                    </div>
                    <span className="text-[11px] text-text-2 group-hover:text-orange transition-colors shrink-0">Dùng →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Register link */}
        <div className="text-center mt-6 text-[13.5px] text-text-2">
          Chưa có tài khoản?{' '}
          <Link href="/auth/register" className="text-orange hover:underline font-medium">
            Tạo tài khoản mới
          </Link>
        </div>
      </div>
    </div>
  );
}
