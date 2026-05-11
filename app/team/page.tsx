'use client';

import { useState } from 'react';
import { Users, Crown, Shield, User, Plus, Trash2, PauseCircle, PlayCircle, Edit2, Eye, EyeOff, X, Check, KeyRound } from 'lucide-react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useAppStore } from '@/lib/store/useAppStore';
import type { TeamMember } from '@/types';

const ROLE_CONFIG = {
  owner: { label: 'Trưởng nhóm', icon: Crown, color: '#f1641e', bg: 'rgba(241,100,30,0.12)' },
  admin: { label: 'Quản trị viên', icon: Shield, color: '#84cc16', bg: 'rgba(132,204,22,0.12)' },
  member: { label: 'Thành viên', icon: User, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
} as const;

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase();
}

export default function TeamPage() {
  const { currentUser, currentTeam, currentTeamMembers, createMember, updateMemberRole, suspendMember, reactivateMember, removeMember, getMemberPassword, changePassword } = useAuthStore();
  const { showToast } = useAppStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [passwordMemberId, setPasswordMemberId] = useState<string | null>(null);

  if (!currentUser) return null;

  const isOwner = currentUser.role === 'owner';
  const isAdmin = currentUser.role === 'admin';
  const canManage = isOwner || isAdmin;

  // Owner member entry (for display)
  const ownerMember = currentTeamMembers.find((m) => m.userId === currentTeam?.ownerId);
  const otherMembers = currentTeamMembers.filter((m) => m.userId !== currentTeam?.ownerId);

  const handleSuspend = (m: TeamMember) => {
    suspendMember(m.id);
    showToast('Đã tạm khóa', `${m.name} không thể đăng nhập cho đến khi kích hoạt lại`, 'info');
  };

  const handleReactivate = (m: TeamMember) => {
    reactivateMember(m.id);
    showToast('Đã kích hoạt', `${m.name} có thể đăng nhập trở lại`, 'success');
  };

  const handleRemove = (m: TeamMember) => {
    removeMember(m.id);
    setConfirmRemoveId(null);
    showToast('Đã xóa thành viên', `${m.name} đã bị xóa khỏi nhóm`, 'success');
  };

  const handleRoleChange = (m: TeamMember, role: 'admin' | 'member') => {
    updateMemberRole(m.id, role);
    setEditingMemberId(null);
    showToast('Đã cập nhật', `Đổi vai trò ${m.name} thành ${ROLE_CONFIG[role].label}`, 'success');
  };

  return (
    <div className="p-8 xl:p-10">
      {/* Header */}
      <div className="font-mono text-[11px] text-orange tracking-[0.2em] uppercase mb-3 flex items-center gap-2.5">
        <span className="w-6 h-0.5 bg-orange" />
        Quản lý nhóm
      </div>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-[42px] font-bold tracking-tight leading-tight">
            {currentTeam?.name ?? 'Nhóm của bạn'}
          </h1>
          <p className="text-[15px] text-text-2 mt-2 leading-relaxed">
            Quản lý thành viên, phân quyền và tài khoản đăng nhập cho từng người trong nhóm.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary shrink-0 mt-2"
          >
            <Plus size={16} />
            Tạo tài khoản thành viên
          </button>
        )}
      </div>

      {/* Team info cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Tổng thành viên" value={currentTeamMembers.length} />
        <StatCard
          label="Đang hoạt động"
          value={currentTeamMembers.filter((m) => m.status === 'active').length}
          color="#84cc16"
        />
        <StatCard
          label="Tạm khóa"
          value={currentTeamMembers.filter((m) => m.status === 'suspended').length}
          color="#ef4444"
        />
      </div>

      {/* Members table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center gap-3">
          <Users size={18} className="text-orange" />
          <span className="font-display text-lg font-bold">Danh sách thành viên</span>
          <span className="ml-auto font-mono text-[11px] text-text-2 bg-bg-2 px-2.5 py-1 rounded-full">
            {currentTeamMembers.length} người
          </span>
        </div>

        <div className="divide-y divide-line">
          {currentTeamMembers.length === 0 ? (
            <div className="px-6 py-10 text-center text-text-2 italic text-[14px]">
              Chưa có thành viên nào. Tạo tài khoản đầu tiên ngay!
            </div>
          ) : (
            currentTeamMembers.map((member) => {
              const isOwnerRow = member.userId === currentTeam?.ownerId;
              const effectiveRole = isOwnerRow ? 'owner' : member.role;
              const roleConf = ROLE_CONFIG[effectiveRole];
              const RoleIcon = roleConf.icon;
              const isSelf = member.userId === currentUser.id;
              const isEditing = editingMemberId === member.id;
              const isConfirmRemove = confirmRemoveId === member.id;

              return (
                <div
                  key={member.id}
                  className={`px-6 py-4 flex items-center gap-4 hover:bg-bg-2/50 transition-colors ${
                    member.status === 'suspended' ? 'opacity-60' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-xl grid place-items-center font-display font-bold text-[14px] text-white shrink-0"
                    style={{ background: roleConf.color }}
                  >
                    {getInitials(member.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-[15px] font-bold text-text-0">{member.name}</span>
                      {isSelf && (
                        <span className="px-1.5 py-0.5 rounded bg-orange/20 text-orange text-[10px] font-mono font-semibold">
                          Bạn
                        </span>
                      )}
                      {member.status === 'suspended' && (
                        <span className="px-1.5 py-0.5 rounded bg-accent-red/20 text-accent-red text-[10px] font-mono font-semibold">
                          Tạm khóa
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[12px] text-text-2 mt-0.5">{member.email}</div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {/* Role badge */}
                      {!isEditing ? (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold"
                          style={{ background: roleConf.bg, color: roleConf.color }}
                        >
                          <RoleIcon size={10} />
                          {roleConf.label}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-text-2 font-mono">Vai trò:</span>
                          {(['admin', 'member'] as const).map((r) => (
                            <button
                              key={r}
                              onClick={() => handleRoleChange(member, r)}
                              className="px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border transition-all hover:scale-105"
                              style={{
                                background: ROLE_CONFIG[r].bg,
                                color: ROLE_CONFIG[r].color,
                                borderColor: member.role === r ? ROLE_CONFIG[r].color : 'transparent',
                              }}
                            >
                              {ROLE_CONFIG[r].label}
                            </button>
                          ))}
                          <button
                            onClick={() => setEditingMemberId(null)}
                            className="p-1 text-text-2 hover:text-text-0"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      {member.joinedAt && (
                        <span className="font-mono text-[10.5px] text-text-2">
                          Tham gia {formatDate(member.joinedAt)}
                        </span>
                      )}
                      {member.lastActiveAt && (
                        <span className="font-mono text-[10.5px] text-text-2">
                          · Hoạt động {formatDate(member.lastActiveAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Owner: change own password */}
                    {isSelf && isOwner && (
                      <ActionBtn
                        title="Xem / Đổi mật khẩu"
                        onClick={() => setPasswordMemberId(member.id)}
                        className="text-text-2 hover:text-orange hover:bg-orange/10"
                      >
                        <KeyRound size={14} />
                      </ActionBtn>
                    )}

                    {/* Owner managing other members */}
                    {canManage && !isSelf && !isOwnerRow && (
                      <>
                        {!isConfirmRemove ? (
                          <>
                            {/* Change password */}
                            {isOwner && (
                              <ActionBtn
                                title="Xem / Đổi mật khẩu"
                                onClick={() => setPasswordMemberId(member.id)}
                                className="text-text-2 hover:text-orange hover:bg-orange/10"
                              >
                                <KeyRound size={14} />
                              </ActionBtn>
                            )}

                            {/* Edit role */}
                            {isOwner && (
                              <ActionBtn
                                title="Đổi vai trò"
                                onClick={() => setEditingMemberId(isEditing ? null : member.id)}
                                className="text-text-2 hover:text-orange hover:bg-orange/10"
                              >
                                <Edit2 size={14} />
                              </ActionBtn>
                            )}

                            {/* Suspend / Reactivate */}
                            {member.status === 'active' ? (
                              <ActionBtn
                                title="Tạm khóa tài khoản"
                                onClick={() => handleSuspend(member)}
                                className="text-text-2 hover:text-amber-400 hover:bg-amber-400/10"
                              >
                                <PauseCircle size={14} />
                              </ActionBtn>
                            ) : (
                              <ActionBtn
                                title="Kích hoạt lại"
                                onClick={() => handleReactivate(member)}
                                className="text-text-2 hover:text-accent-green hover:bg-accent-green/10"
                              >
                                <PlayCircle size={14} />
                              </ActionBtn>
                            )}

                            {/* Remove */}
                            {isOwner && (
                              <ActionBtn
                                title="Xóa thành viên"
                                onClick={() => setConfirmRemoveId(member.id)}
                                className="text-text-2 hover:text-accent-red hover:bg-accent-red/10"
                              >
                                <Trash2 size={14} />
                              </ActionBtn>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2 bg-accent-red/10 border border-accent-red/30 rounded-xl px-3 py-1.5">
                            <span className="text-[12px] text-accent-red font-medium">Xóa {member.name}?</span>
                            <button
                              onClick={() => handleRemove(member)}
                              className="p-1 rounded-lg bg-accent-red text-white hover:bg-red-600 transition-colors"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setConfirmRemoveId(null)}
                              className="p-1 text-text-2 hover:text-text-0"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Permissions info */}
      <div className="mt-6 card p-6">
        <div className="font-display text-lg font-bold mb-4">Phân quyền trong nhóm</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.entries(ROLE_CONFIG) as [string, typeof ROLE_CONFIG[keyof typeof ROLE_CONFIG]][]).map(([role, conf]) => {
            const Icon = conf.icon;
            return (
              <div key={role} className="bg-bg-2 rounded-xl p-4 border border-line">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: conf.bg }}>
                    <Icon size={14} style={{ color: conf.color }} />
                  </div>
                  <span className="font-display text-[14px] font-bold">{conf.label}</span>
                </div>
                <ul className="flex flex-col gap-1.5 text-[12.5px] text-text-2">
                  {role === 'owner' && <>
                    <li className="flex items-center gap-1.5"><Check size={11} className="text-accent-green" /> Toàn quyền quản lý</li>
                    <li className="flex items-center gap-1.5"><Check size={11} className="text-accent-green" /> Tạo/xóa tài khoản thành viên</li>
                    <li className="flex items-center gap-1.5"><Check size={11} className="text-accent-green" /> Xem tất cả dữ liệu</li>
                    <li className="flex items-center gap-1.5"><Check size={11} className="text-accent-green" /> Cài đặt workspace</li>
                  </>}
                  {role === 'admin' && <>
                    <li className="flex items-center gap-1.5"><Check size={11} className="text-accent-green" /> Tạo tài khoản thành viên</li>
                    <li className="flex items-center gap-1.5"><Check size={11} className="text-accent-green" /> Tạm khóa/kích hoạt member</li>
                    <li className="flex items-center gap-1.5"><Check size={11} className="text-accent-green" /> Xem tất cả dữ liệu</li>
                    <li className="flex items-center gap-1.5 opacity-40 line-through"><X size={11} /> Xóa tài khoản</li>
                  </>}
                  {role === 'member' && <>
                    <li className="flex items-center gap-1.5"><Check size={11} className="text-accent-green" /> Xem listings đã theo dõi</li>
                    <li className="flex items-center gap-1.5"><Check size={11} className="text-accent-green" /> Thêm SP vào tracker</li>
                    <li className="flex items-center gap-1.5"><Check size={11} className="text-accent-green" /> Thêm tag, comment</li>
                    <li className="flex items-center gap-1.5 opacity-40 line-through"><X size={11} /> Quản lý thành viên</li>
                  </>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create member modal */}
      {showCreateModal && (
        <CreateMemberModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(data) => {
            const result = createMember(data);
            if ('error' in result && result.error) {
              showToast('Lỗi', result.error, 'error');
              return false;
            }
            if ('member' in result && result.member) {
              showToast('Đã tạo tài khoản', `${result.member.name} đã được thêm vào nhóm`, 'success');
            }
            return true;
          }}
        />
      )}

      {/* Password modal */}
      {passwordMemberId && (() => {
        const member = currentTeamMembers.find((m) => m.id === passwordMemberId);
        if (!member) return null;
        return (
          <PasswordModal
            member={member}
            currentPassword={getMemberPassword(member.userId) ?? ''}
            onClose={() => setPasswordMemberId(null)}
            onSave={(newPwd) => {
              const result = changePassword(member.userId, newPwd);
              if (result.error) {
                showToast('Lỗi', result.error, 'error');
                return false;
              }
              showToast('Đã cập nhật', `Mật khẩu của ${member.name} đã được đổi`, 'success');
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
      <div
        className="font-display text-[36px] font-bold leading-none tabular-nums"
        style={{ color: color ?? 'var(--text-0)' }}
      >
        {value}
      </div>
    </div>
  );
}

function ActionBtn({ title, onClick, className, children }: {
  title: string;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-7 h-7 rounded-lg grid place-items-center transition-all ${className}`}
    >
      {children}
    </button>
  );
}

function CreateMemberModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; email: string; password: string; role: 'admin' | 'member' }) => boolean;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    const success = onCreate({ name: name.trim(), email: email.trim(), password, role });
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
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên thành viên" required className="input-base" />
          </Field>

          <Field label="Email đăng nhập">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required className="input-base" />
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
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-2 hover:text-text-0 transition-colors"
              >
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
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
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
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1 justify-center disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang tạo...
                </span>
              ) : (
                <>
                  <Plus size={16} />
                  Tạo tài khoản
                </>
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
  currentPassword,
  onClose,
  onSave,
}: {
  member: TeamMember;
  currentPassword: string;
  onClose: () => void;
  onSave: (newPassword: string) => boolean;
}) {
  const [showCurrent, setShowCurrent] = useState(false);
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
    await new Promise((r) => setTimeout(r, 350));
    const ok = onSave(newPassword);
    if (!ok) setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] grid place-items-center px-4">
      <div className="w-full max-w-[420px] card p-7 shadow-[0_32px_64px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-display text-[20px] font-bold">Mật khẩu tài khoản</div>
            <div className="text-[12.5px] text-text-2 mt-0.5">{member.name} · {member.email}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-2 text-text-2 hover:text-text-0 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Current password display */}
        <div className="mb-6 bg-bg-2 rounded-xl border border-line p-4">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-2 mb-2">Mật khẩu hiện tại</div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[15px] tracking-widest text-text-0 select-all">
              {showCurrent ? currentPassword : '•'.repeat(currentPassword.length || 8)}
            </span>
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="p-1.5 rounded-lg hover:bg-bg-3 text-text-2 hover:text-text-0 transition-colors shrink-0"
              title={showCurrent ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Change password form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-orange -mb-1">Đổi mật khẩu mới</div>

          <Field label="Mật khẩu mới">
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="input-base pr-10"
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
            <button
              type="submit"
              disabled={loading || !newPassword}
              className="btn btn-primary flex-1 justify-center disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang lưu...
                </span>
              ) : (
                <>
                  <KeyRound size={14} />
                  Đổi mật khẩu
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
