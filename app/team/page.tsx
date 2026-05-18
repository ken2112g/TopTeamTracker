'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Crown, Shield, User, Plus, Trash2, PauseCircle, PlayCircle, Edit2, Eye, EyeOff, X, Check, KeyRound, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useAppStore } from '@/lib/store/useAppStore';
import { fetchTeamMembers, createTeamMember, setMemberRole, deleteMember, toggleSuspend, resetMemberPassword } from '@/lib/actions/team';

const ROLE_CONFIG = {
  owner: { label: 'Admin', icon: Crown, color: '#f1641e', bg: 'rgba(241,100,30,0.12)' },
  admin: { label: 'Leader', icon: Shield, color: '#84cc16', bg: 'rgba(132,204,22,0.12)' },
  member: { label: 'Member', icon: User, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
} as const;

type MemberData = {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  email: string;
  name: string;
  avatarUrl?: string;
  username?: string;
  suspended: boolean;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase() || '?';
}

export default function TeamPage() {
  const { currentUser } = useAuthStore();
  const { showToast } = useAppStore();

  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [passwordMemberId, setPasswordMemberId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const res = await fetchTeamMembers();
    if (res.ok) setMembers(res.members);
    setLoading(false);
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  if (!currentUser) return null;

  const isOwner = currentUser.role === 'owner';
  const isAdmin = currentUser.role === 'admin';
  const canManage = isOwner || isAdmin;

  const ownerMember = members.find((m) => m.role === 'owner');
  const otherMembers = members.filter((m) => m.role !== 'owner');

  const handleSuspend = async (m: MemberData) => {
    const res = await toggleSuspend(m.userId, true);
    if (res.ok) {
      setMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, suspended: true } : x));
      showToast('Đã tạm khóa', `${m.name} không thể đăng nhập cho đến khi kích hoạt lại`, 'info');
    } else {
      showToast('Lỗi', res.error ?? 'Không thể khóa tài khoản', 'error');
    }
  };

  const handleReactivate = async (m: MemberData) => {
    const res = await toggleSuspend(m.userId, false);
    if (res.ok) {
      setMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, suspended: false } : x));
      showToast('Đã kích hoạt', `${m.name} có thể đăng nhập trở lại`, 'success');
    } else {
      showToast('Lỗi', res.error ?? 'Không thể kích hoạt', 'error');
    }
  };

  const handleRemove = async (m: MemberData) => {
    const res = await deleteMember(m.id);
    if (res.ok) {
      setMembers((prev) => prev.filter((x) => x.id !== m.id));
      setConfirmRemoveId(null);
      showToast('Đã xóa thành viên', `${m.name} đã bị xóa khỏi nhóm`, 'success');
    } else {
      showToast('Lỗi', res.error ?? 'Không xóa được', 'error');
    }
  };

  const handleRoleChange = async (m: MemberData, role: 'admin' | 'member') => {
    const res = await setMemberRole(m.id, role);
    if (res.ok) {
      setMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, role } : x));
      setEditingMemberId(null);
      showToast('Đã cập nhật', `Vai trò của ${m.name} đã thay đổi thành ${ROLE_CONFIG[role].label}`, 'success');
    } else {
      showToast('Lỗi', res.error ?? 'Không cập nhật được', 'error');
    }
  };

  const totalActive = members.filter((m) => !m.suspended).length;
  const totalSuspended = members.filter((m) => m.suspended).length;

  return (
    <div className="p-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight">Quản lý nhóm</h1>
          <p className="text-[13.5px] text-text-2 mt-1">Thêm thành viên, phân quyền và quản lý tài khoản</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadMembers}
            className="p-2 rounded-xl bg-bg-2 border border-line hover:border-orange/40 transition-all text-text-2 hover:text-orange"
            title="Làm mới"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {canManage && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              <Plus size={16} />
              Thêm thành viên
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Tổng thành viên" value={members.length} />
        <StatCard label="Đang hoạt động" value={totalActive} color="#84cc16" />
        <StatCard label="Tạm khóa" value={totalSuspended} color="#ef4444" />
      </div>

      {/* Members list */}
      {loading ? (
        <div className="card p-8 text-center text-text-2 text-[13.5px]">
          <div className="w-6 h-6 border-2 border-orange/30 border-t-orange rounded-full animate-spin mx-auto mb-3" />
          Đang tải danh sách thành viên...
        </div>
      ) : members.length === 0 ? (
        <div className="card p-10 text-center">
          <Users size={36} className="text-text-2 mx-auto mb-3" />
          <div className="text-[15px] font-semibold text-text-1 mb-1">Chưa có thành viên nào</div>
          <p className="text-[13px] text-text-2">Thêm thành viên để bắt đầu cộng tác</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line bg-bg-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-2 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
            <span>Thành viên</span>
            <span className="w-[90px] text-center">Vai trò</span>
            <span className="w-[100px] text-center">Trạng thái</span>
            <span className="w-[80px] text-right">Thao tác</span>
          </div>

          <ul className="divide-y divide-line">
            {[ownerMember, ...otherMembers].filter(Boolean).map((m) => {
              if (!m) return null;
              const conf = ROLE_CONFIG[m.role];
              const Icon = conf.icon;
              const initials = getInitials(m.name);
              const isEditing = editingMemberId === m.id;
              const isConfirmRemove = confirmRemoveId === m.id;
              const isSelf = m.userId === currentUser.id;

              return (
                <li key={m.id} className={`px-5 py-4 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center transition-colors ${m.suspended ? 'opacity-50' : 'hover:bg-bg-2/40'}`}>
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.name} className="w-9 h-9 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-xl grid place-items-center font-display font-bold text-[12px] text-white shrink-0"
                        style={{ background: conf.color }}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-[14px] text-text-0 truncate">
                        {m.name}
                        {isSelf && <span className="ml-2 text-[10.5px] font-mono text-orange">(bạn)</span>}
                      </div>
                      <div className="text-[12px] text-text-2 font-mono truncate">
                        {m.username ? `@${m.username} · ` : ''}{m.email}
                      </div>
                      <div className="text-[11px] text-text-2 mt-0.5">
                        Tham gia {formatDate(m.joinedAt)}
                      </div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="w-[90px] flex justify-center">
                    {isEditing && canManage && m.role !== 'owner' ? (
                      <div className="flex flex-col gap-1">
                        {(['admin', 'member'] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => handleRoleChange(m, r)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11.5px] font-medium transition-all ${
                              m.role === r ? 'bg-orange/15 text-orange' : 'hover:bg-bg-2 text-text-2 hover:text-text-0'
                            }`}
                          >
                            {m.role === r && <Check size={10} />}
                            {ROLE_CONFIG[r].label}
                          </button>
                        ))}
                        <button
                          onClick={() => setEditingMemberId(null)}
                          className="text-[10.5px] text-text-2 hover:text-text-0 text-center mt-0.5"
                        >Hủy</button>
                      </div>
                    ) : (
                      <span
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-mono font-semibold"
                        style={{ background: conf.bg, color: conf.color }}
                      >
                        <Icon size={11} />
                        {conf.label}
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="w-[100px] flex justify-center">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold ${
                      m.suspended
                        ? 'bg-red/10 text-red'
                        : 'bg-green/10 text-green'
                    }`} style={{ color: m.suspended ? '#ef4444' : '#84cc16', background: m.suspended ? 'rgba(239,68,68,0.1)' : 'rgba(132,204,22,0.1)' }}>
                      {m.suspended ? 'Tạm khóa' : 'Hoạt động'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="w-[80px] flex items-center justify-end gap-1.5">
                    {isConfirmRemove ? (
                      <>
                        <button onClick={() => handleRemove(m)} className="p-1.5 rounded-lg bg-accent-red/15 hover:bg-accent-red/25 text-accent-red transition-colors" title="Xác nhận xóa">
                          <Check size={13} />
                        </button>
                        <button onClick={() => setConfirmRemoveId(null)} className="p-1.5 rounded-lg hover:bg-bg-2 text-text-2 transition-colors" title="Hủy">
                          <X size={13} />
                        </button>
                      </>
                    ) : canManage && !isSelf && m.role !== 'owner' ? (
                      <>
                        {isOwner && (
                          <ActionBtn title="Đổi vai trò" onClick={() => setEditingMemberId(isEditing ? null : m.id)} className="hover:bg-bg-2 text-text-2 hover:text-text-0">
                            <Edit2 size={13} />
                          </ActionBtn>
                        )}
                        <ActionBtn title="Đổi mật khẩu" onClick={() => setPasswordMemberId(m.id)} className="hover:bg-bg-2 text-text-2 hover:text-text-0">
                          <KeyRound size={13} />
                        </ActionBtn>
                        {m.suspended ? (
                          <ActionBtn title="Kích hoạt lại" onClick={() => handleReactivate(m)} className="hover:bg-green/15 text-text-2 hover:text-green">
                            <PlayCircle size={13} />
                          </ActionBtn>
                        ) : (
                          <ActionBtn title="Tạm khóa" onClick={() => handleSuspend(m)} className="hover:bg-amber/15 text-text-2 hover:text-amber">
                            <PauseCircle size={13} />
                          </ActionBtn>
                        )}
                        <ActionBtn title="Xóa khỏi nhóm" onClick={() => setConfirmRemoveId(m.id)} className="hover:bg-accent-red/10 text-text-2 hover:text-accent-red">
                          <Trash2 size={13} />
                        </ActionBtn>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Create member modal */}
      {showCreateModal && (
        <CreateMemberModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (data) => {
            const res = await createTeamMember(data);
            if (!res.ok) {
              showToast('Lỗi', res.error ?? 'Không tạo được tài khoản', 'error');
              return false;
            }
            showToast('Đã tạo tài khoản', `${data.name} đã được thêm vào nhóm`, 'success');
            await loadMembers();
            return true;
          }}
        />
      )}

      {/* Password modal */}
      {passwordMemberId && (() => {
        const m = members.find((x) => x.id === passwordMemberId);
        if (!m) return null;
        return (
          <PasswordModal
            member={m}
            onClose={() => setPasswordMemberId(null)}
            onSave={async (newPwd) => {
              const res = await resetMemberPassword(m.userId, newPwd);
              if (!res.ok) {
                showToast('Lỗi', res.error ?? 'Không đổi được mật khẩu', 'error');
                return false;
              }
              showToast('Đã cập nhật', `Mật khẩu của ${m.name} đã được đổi`, 'success');
              setPasswordMemberId(null);
              return true;
            }}
          />
        );
      })()}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card p-5">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-2 mb-2">{label}</div>
      <div className="font-display text-[36px] font-bold leading-none tabular-nums" style={{ color: color ?? 'var(--text-0)' }}>
        {value}
      </div>
    </div>
  );
}

function ActionBtn({ title, onClick, className, children }: {
  title: string; onClick: () => void; className: string; children: React.ReactNode;
}) {
  return (
    <button title={title} onClick={onClick} className={`w-7 h-7 rounded-lg grid place-items-center transition-all ${className}`}>
      {children}
    </button>
  );
}

function CreateMemberModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; email: string; username?: string; password: string; role: 'admin' | 'member' }) => Promise<boolean>;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return; }
    setLoading(true);
    setError('');
    const success = await onCreate({ name: name.trim(), email: email.trim(), username: username.trim() || undefined, password, role });
    if (success) {
      onClose();
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] grid place-items-center px-4">
      <div className="w-full max-w-[440px] card p-7 shadow-[0_32px_64px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between mb-6">
          <div className="font-display text-[22px] font-bold">Tạo tài khoản thành viên</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-2 text-text-2 hover:text-text-0 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Họ và tên">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên thành viên" required className="input-base" autoFocus />
          </Field>

          <Field label="Email đăng nhập">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required className="input-base" />
          </Field>

          <Field label="Tên đăng nhập (tùy chọn)">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9._]/gi, '').toLowerCase())}
              placeholder="vd: nguyenvan (không dấu, không khoảng trắng)"
              className="input-base"
            />
            <p className="text-[11.5px] text-text-2 -mt-0.5">Thành viên có thể đăng nhập bằng tên này thay vì email</p>
          </Field>

          <Field label="Mật khẩu">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                required
                className="input-base pr-10"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-2 hover:text-text-0 transition-colors">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <Field label="Vai trò">
            <div className="flex gap-3">
              {(['admin', 'member'] as const).map((r) => {
                const conf = ROLE_CONFIG[r];
                const Icon = conf.icon;
                return (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                      role === r ? 'border-orange bg-orange/5' : 'border-line hover:border-line/80'
                    }`}
                  >
                    <Icon size={14} style={{ color: conf.color }} />
                    <span className="text-[13px] font-medium">{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          {error && (
            <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl px-4 py-3 text-[13px] text-accent-red">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-1">
            <button type="button" onClick={onClose} className="btn flex-1 justify-center">Hủy</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center disabled:opacity-60">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang tạo...
                </span>
              ) : (
                <><Plus size={16} />Tạo tài khoản</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-2">{label}</label>
      {children}
    </div>
  );
}

function PasswordModal({
  member,
  onClose,
  onSave,
}: {
  member: MemberData;
  onClose: () => void;
  onSave: (newPassword: string) => Promise<boolean>;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return; }
    if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }
    setLoading(true);
    const ok = await onSave(newPassword);
    if (!ok) setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] grid place-items-center px-4">
      <div className="w-full max-w-[420px] card p-7 shadow-[0_32px_64px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-display text-[20px] font-bold">Đổi mật khẩu</div>
            <div className="text-[12.5px] text-text-2 mt-0.5">{member.name} · {member.email}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-2 text-text-2 hover:text-text-0 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Mật khẩu mới">
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                required
                className="input-base pr-10"
                autoFocus
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-2 hover:text-text-0 transition-colors">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <Field label="Xác nhận mật khẩu">
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                required
                className="input-base pr-10"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-2 hover:text-text-0 transition-colors">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          {error && (
            <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl px-4 py-3 text-[13px] text-accent-red">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-1">
            <button type="button" onClick={onClose} className="btn flex-1 justify-center">Hủy</button>
            <button type="submit" disabled={loading || !newPassword} className="btn btn-primary flex-1 justify-center disabled:opacity-60">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang lưu...
                </span>
              ) : (
                <><KeyRound size={14} />Đổi mật khẩu</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
