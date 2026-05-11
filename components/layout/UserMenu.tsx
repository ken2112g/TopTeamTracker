'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Users, Settings, ChevronDown, Crown, Shield, User } from 'lucide-react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import Link from 'next/link';

const ROLE_CONFIG = {
  owner: { label: 'Trưởng nhóm', icon: Crown, color: '#f1641e' },
  admin: { label: 'Quản trị viên', icon: Shield, color: '#84cc16' },
  member: { label: 'Thành viên', icon: User, color: '#60a5fa' },
} as const;

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();
}

export default function UserMenu() {
  const { currentUser, currentTeam, logout } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!currentUser) return null;

  const roleConf = ROLE_CONFIG[currentUser.role];
  const RoleIcon = roleConf.icon;
  const initials = getInitials(currentUser.name);
  const isTeamOwnerOrAdmin = currentUser.role === 'owner' || currentUser.role === 'admin';

  const handleLogout = () => {
    setOpen(false);
    logout();
    router.replace('/auth/login');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 pl-3 pr-2.5 py-1.5 rounded-xl bg-bg-2 border border-line hover:border-orange/40 hover:bg-bg-3 transition-all"
      >
        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-lg grid place-items-center font-display font-bold text-[11px] text-white shrink-0"
          style={{ background: roleConf.color }}
        >
          {initials}
        </div>

        {/* Name */}
        <div className="hidden sm:block text-left min-w-0">
          <div className="text-[13px] font-semibold text-text-0 leading-none truncate max-w-[120px]">
            {currentUser.name}
          </div>
          <div className="font-mono text-[10px] mt-0.5 truncate max-w-[120px]" style={{ color: roleConf.color }}>
            {roleConf.label}
          </div>
        </div>

        <ChevronDown size={14} className={`text-text-2 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[240px] bg-bg-1 border border-line rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.4)] z-50 overflow-hidden">
          {/* User info header */}
          <div className="px-4 py-3.5 border-b border-line bg-bg-2">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl grid place-items-center font-display font-bold text-[14px] text-white shrink-0"
                style={{ background: roleConf.color }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <div className="font-display text-[14px] font-bold text-text-0 truncate">{currentUser.name}</div>
                <div className="font-mono text-[11px] text-text-2 truncate">{currentUser.email}</div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex gap-2 mt-2.5 flex-wrap">
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold"
                style={{ background: roleConf.color + '22', color: roleConf.color }}
              >
                <RoleIcon size={10} />
                {roleConf.label}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold bg-bg-3 text-text-2">
                {currentUser.accountType === 'team' ? 'Team' : 'Cá nhân'}
              </span>
            </div>

            {currentUser.accountType === 'team' && (
              <div className="mt-2 text-[11.5px] text-text-2 font-mono truncate">
                Team: <span className="text-text-1">{currentTeam?.name ?? '—'}</span>
              </div>
            )}
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            {currentUser.accountType === 'team' && isTeamOwnerOrAdmin && (
              <MenuItem
                icon={<Users size={15} />}
                href="/team"
                onClick={() => setOpen(false)}
              >
                Quản lý nhóm
              </MenuItem>
            )}

            <MenuItem
              icon={<Settings size={15} />}
              href="/settings"
              onClick={() => setOpen(false)}
            >
              Cài đặt
            </MenuItem>

            <div className="border-t border-line my-1" />

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-accent-red/10 transition-colors text-accent-red text-[13.5px]"
            >
              <LogOut size={15} />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, href, onClick, children }: {
  icon: React.ReactNode;
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-2 transition-colors text-text-1 hover:text-text-0 text-[13.5px]"
    >
      <span className="text-text-2">{icon}</span>
      {children}
    </Link>
  );
}
