'use client';

import { useEffect, useState } from 'react';
import { Shield, Ban, CheckCircle, User, Search, RefreshCw } from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  name: string;
  username: string | null;
  isSuperAdmin: boolean;
  suspended: boolean;
  createdAt: string;
  workspaces: { role: string; workspaceName: string }[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const patch = async (userId: string, body: Record<string, unknown>) => {
    setUpdating(userId);
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...body }),
    });
    setUpdating(null);
    load();
  };

  const filtered = users.filter(u =>
    !search ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-0">Người dùng</h1>
          <p className="text-text-2 text-[13px] mt-0.5">{users.length} tài khoản trong hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm email, tên..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-base pl-8 w-60"
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="w-10 h-10 rounded-xl border border-line bg-bg-1 grid place-items-center text-text-2 hover:border-orange/40 hover:text-orange transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-bg-3" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-bg-3 rounded" />
                  <div className="h-3 w-32 bg-bg-3 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(user => (
            <div
              key={user.id}
              className={`card p-4 flex items-center gap-4 transition-opacity ${user.suspended ? 'opacity-50' : ''}`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-bg-3 grid place-items-center flex-shrink-0">
                <User size={18} className="text-text-2" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-text-0 text-[14px]">{user.name || user.email}</span>
                  {user.isSuperAdmin && (
                    <span className="flex items-center gap-1 text-[10.5px] font-mono bg-orange/15 text-orange border border-orange/30 rounded-full px-2 py-0.5">
                      <Shield size={10} /> Super Admin
                    </span>
                  )}
                  {user.suspended && (
                    <span className="text-[10.5px] font-mono bg-red-500/15 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5">
                      Suspended
                    </span>
                  )}
                </div>
                <div className="text-text-2 text-[12px] mt-0.5 truncate">
                  {user.email}
                  {user.username && <span className="ml-2">@{user.username}</span>}
                </div>
              </div>

              {/* Workspaces */}
              <div className="text-[12px] text-text-2 text-right hidden md:block min-w-[140px]">
                {user.workspaces.length > 0 ? (
                  user.workspaces.map((w, i) => (
                    <div key={i}>{w.workspaceName} <span className="text-orange">({w.role})</span></div>
                  ))
                ) : (
                  <span className="text-text-2 italic">Chưa có workspace</span>
                )}
              </div>

              {/* Date */}
              <div className="text-[11.5px] text-text-2 font-mono w-24 text-right flex-shrink-0 hidden lg:block">
                {fmtDate(user.createdAt)}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Grant / revoke super admin */}
                <button
                  onClick={() => {
                    const msg = user.isSuperAdmin
                      ? `Thu hồi quyền Super Admin của ${user.name || user.email}?`
                      : `Cấp quyền Super Admin cho ${user.name || user.email}?`;
                    if (!confirm(msg)) return;
                    patch(user.id, { isSuperAdmin: !user.isSuperAdmin });
                  }}
                  disabled={updating === user.id}
                  title={user.isSuperAdmin ? 'Thu hồi Super Admin' : 'Cấp Super Admin'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                    user.isSuperAdmin
                      ? 'bg-orange/15 border border-orange/40 text-orange hover:bg-orange/25'
                      : 'bg-bg-2 border border-line text-text-2 hover:border-orange/40 hover:text-orange'
                  } disabled:opacity-50`}
                >
                  <Shield size={12} />
                  {user.isSuperAdmin ? 'Admin' : 'Cấp Admin'}
                </button>

                {/* Suspend / unsuspend */}
                <button
                  onClick={() => patch(user.id, { suspended: !user.suspended })}
                  disabled={updating === user.id || user.isSuperAdmin}
                  title={user.isSuperAdmin ? 'Không thể suspend Super Admin' : user.suspended ? 'Mở khóa' : 'Suspend'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                    user.suspended
                      ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'
                      : 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                  } disabled:opacity-40`}
                >
                  {updating === user.id ? (
                    <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : user.suspended ? (
                    <CheckCircle size={13} />
                  ) : (
                    <Ban size={13} />
                  )}
                  {user.suspended ? 'Mở khóa' : 'Suspend'}
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="card p-10 text-center text-text-2">Không tìm thấy người dùng nào</div>
          )}
        </div>
      )}
    </div>
  );
}
