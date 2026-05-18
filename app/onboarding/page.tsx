'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, User, Users, Check } from 'lucide-react';
import { createWorkspace } from '@/lib/actions/onboarding';

type Step = 'choose-type' | 'name-workspace';
type AccountType = 'personal' | 'team';

function slugify(text: string) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50) || `workspace-${Date.now()}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('choose-type');
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    const result = await createWorkspace(name.trim(), accountType);
    if (!result.ok) {
      setError(result.error ?? 'Không tạo được workspace. Thử lại.');
      setLoading(false);
      return;
    }

    window.location.replace('/');
  };

  return (
    <div className="min-h-screen bg-bg-0 grid place-items-center px-4 py-12">
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none bg-[url('/noise.png')] z-0" />

      <div className="w-full max-w-[480px] relative z-10">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-12 h-12 rounded-xl bg-orange grid place-items-center font-display font-extrabold text-white text-2xl shadow-[0_8px_24px_rgba(241,100,30,0.35)] -rotate-[4deg]">
            T
          </div>
          <div>
            <div className="font-display font-bold text-[26px] tracking-tight leading-none">
              TopTeam<span className="text-orange italic">Tracker</span>
            </div>
            <div className="font-mono text-[9.5px] text-text-2 tracking-[0.15em] uppercase mt-1">
              Track · Compare · Win
            </div>
          </div>
        </div>

        <div className="card p-8">
          {/* Progress dots */}
          <div className="flex items-center gap-3 mb-8">
            <StepDot active={step === 'choose-type'} done={step === 'name-workspace'} label="1" />
            <div className="flex-1 h-px bg-line" />
            <StepDot active={step === 'name-workspace'} done={false} label="2" />
          </div>

          {step === 'choose-type' ? (
            <>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-orange mb-3">Bước 1 / 2</div>
              <h1 className="font-display text-[26px] font-bold mb-2">Bạn dùng theo cách nào?</h1>
              <p className="text-[13.5px] text-text-2 mb-7">
                Chọn loại tài khoản phù hợp. Có thể thay đổi sau.
              </p>

              <div className="flex flex-col gap-3 mb-7">
                <AccountTypeCard
                  selected={accountType === 'personal'}
                  onClick={() => setAccountType('personal')}
                  icon={<User size={22} />}
                  title="Cá nhân"
                  description="Dùng một mình để research và theo dõi sản phẩm. Không cần quản lý thành viên."
                  badge="Miễn phí"
                  badgeColor="#84cc16"
                  features={['Track listings cá nhân', 'Collections riêng tư', 'Không giới hạn sản phẩm']}
                />
                <AccountTypeCard
                  selected={accountType === 'team'}
                  onClick={() => setAccountType('team')}
                  icon={<Users size={22} />}
                  title="Team"
                  description="Workspace chung cho nhóm. Mọi thành viên cùng theo dõi và chia sẻ data."
                  badge="Đề xuất"
                  badgeColor="#f1641e"
                  features={['Workspace chia sẻ', 'Quản lý thành viên', 'Phân quyền Admin / Member']}
                />
              </div>

              <button
                onClick={() => setStep('name-workspace')}
                className="btn btn-primary w-full justify-center"
              >
                Tiếp theo <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-orange mb-3">Bước 2 / 2</div>

              <div className="flex items-center gap-2 mb-5">
                <button
                  onClick={() => setStep('choose-type')}
                  className="text-text-2 hover:text-orange transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <h1 className="font-display text-[22px] font-bold">
                  {accountType === 'team' ? 'Đặt tên cho team' : 'Đặt tên workspace'}
                </h1>
              </div>

              {/* Account type badge */}
              <div className="flex items-center gap-2 mb-6 px-3 py-2.5 rounded-xl bg-bg-2 border border-line">
                {accountType === 'team' ? (
                  <Users size={15} className="text-orange shrink-0" />
                ) : (
                  <User size={15} className="text-green shrink-0" />
                )}
                <span className="text-[13px] text-text-1">
                  Tài khoản <span className="font-semibold">{accountType === 'team' ? 'Team' : 'Cá nhân'}</span>
                </span>
                <button
                  onClick={() => setStep('choose-type')}
                  className="ml-auto text-[11px] text-text-2 hover:text-orange transition-colors"
                >
                  Đổi
                </button>
              </div>

              <form onSubmit={handleCreate} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-2">
                    {accountType === 'team' ? 'Tên team / workspace' : 'Tên workspace'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={accountType === 'team' ? 'vd: POD Team Vietnam, Shop Research...' : 'vd: Research cá nhân, My Tracker...'}
                    required
                    autoFocus
                    className="input-base text-[15px]"
                    maxLength={60}
                  />
                  {name && (
                    <div className="font-mono text-[11px] text-text-2">
                      Slug: <span className="text-orange">{slugify(name)}</span>
                    </div>
                  )}
                </div>

                {accountType === 'team' && (
                  <div className="bg-orange/5 border border-orange/20 rounded-xl px-4 py-3 text-[12.5px] text-text-2 leading-relaxed">
                    Sau khi tạo workspace, bạn có thể vào <span className="text-orange font-medium">Quản lý nhóm</span> để thêm thành viên và phân quyền.
                  </div>
                )}

                {error && (
                  <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl px-4 py-3 text-[13px] text-accent-red">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="btn btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang tạo...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {accountType === 'team' ? 'Tạo team & bắt đầu' : 'Tạo workspace & bắt đầu'}
                      <ArrowRight size={16} />
                    </span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className={`w-8 h-8 rounded-full grid place-items-center text-[13px] font-bold border-2 transition-all ${
      done ? 'bg-green border-green text-white' :
      active ? 'bg-orange border-orange text-white shadow-[0_0_12px_rgba(241,100,30,0.4)]' :
      'bg-bg-2 border-line text-text-2'
    }`}>
      {done ? <Check size={14} /> : label}
    </div>
  );
}

function AccountTypeCard({ selected, onClick, icon, title, description, badge, badgeColor, features }: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  features: string[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
        selected
          ? 'border-orange bg-orange/5 shadow-[0_0_0_1px_rgba(241,100,30,0.2)]'
          : 'border-line bg-bg-2 hover:border-line/80'
      }`}
    >
      <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 mt-0.5 transition-colors ${
        selected ? 'bg-orange/20 text-orange' : 'bg-bg-3 text-text-2'
      }`}>
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-display text-[15px] font-bold">{title}</span>
          <span
            className="px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold"
            style={{ background: badgeColor + '22', color: badgeColor }}
          >
            {badge}
          </span>
        </div>
        <p className="text-[12.5px] text-text-2 leading-relaxed mb-2">{description}</p>
        <ul className="flex flex-col gap-1">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-1.5 text-[11.5px] text-text-2">
              <span className="w-1 h-1 rounded-full bg-text-2 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-1.5 grid place-items-center transition-all ${
        selected ? 'border-orange bg-orange' : 'border-line'
      }`}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}
