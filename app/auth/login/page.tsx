'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, CheckCircle2, Download, Puzzle } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

const DRIVE_LINK = 'https://drive.google.com/drive/folders/1LfYtmEAFavEKCpWh418896GhGMzXXiCm?usp=sharing';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [extInstalled, setExtInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => {
      setExtInstalled(document.documentElement.getAttribute('data-ttt-ext') === 'true');
    };
    check();
    const t = setTimeout(check, 1000);
    return () => clearTimeout(t);
  }, []);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    const supabase = getSupabaseClient();
    let loginEmail = email.trim();
    if (!loginEmail.includes('@')) {
      const { data: profile } = await supabase.from('profiles').select('email').eq('username', loginEmail.toLowerCase()).single();
      if (!profile?.email) { setError('Tên đăng nhập không tồn tại'); setLoading(false); return; }
      loginEmail = profile.email;
    }
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) {
      setError('Email/tên đăng nhập hoặc mật khẩu không đúng');
      setLoading(false);
    } else {
      const userId = signInData.user?.id;
      if (userId) {
        const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', userId).single();
        if (profile?.is_super_admin) { router.replace('/admin'); return; }
      }
      router.replace('/');
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLogin();
  };

  return (
    <div className="min-h-screen bg-bg-0 grid place-items-center px-4 py-12">
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none bg-[url('/noise.png')] z-0" />

      <div className="w-full max-w-[440px] relative z-10">
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
                  Extension cần thiết để lấy dữ liệu từ Etsy. Cài xong rồi đăng nhập để dùng đầy đủ tính năng.
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
            <span className="text-[13px] text-green-400 font-medium">Extension đã cài — sẵn sàng đăng nhập</span>
          </div>
        )}

        <div className="card p-8">
          <h1 className="font-display text-[26px] font-bold mb-1">Đăng nhập</h1>
          <p className="text-[13.5px] text-text-2 mb-6">Chào mừng trở lại TopTeamTracker.</p>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-[12px] bg-white hover:bg-gray-50 text-gray-800 font-semibold text-[14px] transition-all shadow-sm border border-gray-200 disabled:opacity-60 disabled:cursor-not-allowed mb-5"
          >
            {googleLoading ? (
              <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
              </svg>
            )}
            {googleLoading ? 'Đang chuyển hướng...' : 'Tiếp tục với Google'}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-line" />
            <span className="font-mono text-[10.5px] text-text-2 uppercase tracking-wider">Hoặc</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-2">Email hoặc tên đăng nhập</label>
              <input
                type="text" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com hoặc username" required className="input-base" autoComplete="username"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-2">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required className="input-base pr-10" autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-2 hover:text-text-0 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl px-4 py-3 text-[13px] text-accent-red">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || googleLoading}
              className="btn btn-primary w-full mt-1 justify-center disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : (
                <span className="flex items-center gap-2"><LogIn size={16} />Đăng nhập bằng Email</span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-[13px] text-text-2">
          Chưa có tài khoản?{' '}
          <Link href="/auth/register" className="text-orange hover:underline font-medium">
            Đăng ký miễn phí
          </Link>
        </p>
      </div>
    </div>
  );
}
