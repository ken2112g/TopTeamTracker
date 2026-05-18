'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Building2, List, Database, LogOut, Activity } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const NAV = [
  { href: '/admin',            label: 'Tổng quan',   icon: LayoutDashboard, exact: true },
  { href: '/admin/harvest',    label: 'Harvest',      icon: Database },
  { href: '/admin/users',      label: 'Người dùng',  icon: Users },
  { href: '/admin/workspaces', label: 'Workspace',    icon: Building2 },
  { href: '/admin/listings',   label: 'Listings',     icon: List },
  { href: '/admin/activities', label: 'Activity Log', icon: Activity },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  return (
    <div className="w-[220px] h-screen bg-bg-0 border-r border-line flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-line">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange grid place-items-center font-display font-extrabold text-white text-sm shadow-[0_4px_12px_rgba(241,100,30,0.4)]">
            T
          </div>
          <div>
            <div className="font-display font-bold text-[13px] leading-none">
              TopTeam<span className="text-orange italic">Tracker</span>
            </div>
            <div className="font-mono text-[9px] text-text-2 tracking-[0.12em] uppercase mt-0.5">
              Super Admin
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                active
                  ? 'bg-orange/15 text-orange font-semibold'
                  : 'text-text-1 hover:bg-bg-2 hover:text-text-0'
              }`}
            >
              <Icon size={16} className={active ? 'text-orange' : 'text-text-2'} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 border-t border-line pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] text-text-2 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut size={16} />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
