'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, Building2, Trash2, RefreshCw, ChevronDown } from 'lucide-react';

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  harvestToken: string;
  listingsCount: number;
  owner: { email: string; full_name: string; is_super_admin: boolean } | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const PLAN_STYLES: Record<string, string> = {
  free:  'bg-bg-3 text-text-2 border-line',
  pro:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  team:  'bg-orange/15 text-orange border-orange/30',
};

const PLANS = ['free', 'pro', 'team'] as const;

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [copied, setCopied]       = useState<string | null>(null);
  const [updating, setUpdating]   = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [planMenu, setPlanMenu]   = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/workspaces')
      .then(r => r.json())
      .then(d => { setWorkspaces(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const copyToken = (token: string, id: string) => {
    navigator.clipboard.writeText(token);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const setPlan = async (workspaceId: string, plan: string) => {
    setUpdating(workspaceId);
    setPlanMenu(null);
    await fetch('/api/admin/workspaces', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, plan }),
    });
    setUpdating(null);
    load();
  };

  const deleteWorkspace = async (ws: WorkspaceRow) => {
    if (!confirm(`Xóa workspace "${ws.name}"?\n\nThao tác này sẽ xóa vĩnh viễn tất cả listings, snapshots, collections và dữ liệu liên quan. Không thể hoàn tác!`)) return;
    setDeleting(ws.id);
    await fetch('/api/admin/workspaces', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: ws.id }),
    });
    setDeleting(null);
    load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-0">Workspace</h1>
          <p className="text-text-2 text-[13px] mt-0.5">{workspaces.length} workspace đang hoạt động</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="w-10 h-10 rounded-xl border border-line bg-bg-1 grid place-items-center text-text-2 hover:border-orange/40 hover:text-orange transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 w-40 bg-bg-3 rounded mb-3" />
              <div className="h-3 w-64 bg-bg-3 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {workspaces.map(ws => (
            <div key={ws.id} className={`card p-5 transition-opacity ${deleting === ws.id ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Left: workspace info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange/10 border border-orange/20 grid place-items-center flex-shrink-0">
                    <Building2 size={18} className="text-orange" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-text-0 text-[15px]">{ws.name}</span>

                      {/* Plan badge + dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setPlanMenu(planMenu === ws.id ? null : ws.id)}
                          disabled={updating === ws.id}
                          className={`flex items-center gap-1 text-[10.5px] font-mono border rounded-full px-2.5 py-0.5 uppercase tracking-wide hover:opacity-80 transition-all ${PLAN_STYLES[ws.plan] ?? PLAN_STYLES.free}`}
                        >
                          {ws.plan}
                          <ChevronDown size={10} className={planMenu === ws.id ? 'rotate-180' : ''} />
                        </button>

                        {planMenu === ws.id && (
                          <div className="absolute left-0 top-full mt-1 bg-bg-1 border border-line rounded-xl shadow-xl z-10 overflow-hidden min-w-[100px]">
                            {PLANS.map(p => (
                              <button
                                key={p}
                                onClick={() => setPlan(ws.id, p)}
                                className={`w-full text-left px-3 py-2 text-[12px] font-mono uppercase tracking-wide hover:bg-bg-2 transition-colors ${
                                  ws.plan === p ? 'text-orange font-bold' : 'text-text-1'
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-text-2 text-[12px] mt-0.5">
                      @{ws.slug} · {ws.listingsCount} listings · Tạo {fmtDate(ws.createdAt)}
                    </div>
                    {ws.owner && (
                      <div className="text-text-2 text-[11.5px] mt-0.5">
                        Owner: <span className="text-text-1">{ws.owner.full_name || ws.owner.email}</span>
                        {ws.owner.is_super_admin && <span className="ml-1 text-orange text-[10px]">(Super Admin)</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: token + actions */}
                <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
                  {/* Harvest token */}
                  <div>
                    <div className="text-[10.5px] font-mono text-text-2 mb-1 uppercase tracking-wide">Harvest Token</div>
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] font-mono bg-bg-2 border border-line rounded-lg px-3 py-1.5 text-text-1 max-w-[180px] truncate block">
                        {ws.harvestToken ?? '—'}
                      </code>
                      {ws.harvestToken && (
                        <button
                          onClick={() => copyToken(ws.harvestToken, ws.id)}
                          className="w-8 h-8 rounded-lg bg-bg-2 border border-line grid place-items-center hover:border-orange/40 hover:text-orange transition-all text-text-2 flex-shrink-0"
                          title="Copy token"
                        >
                          {copied === ws.id ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteWorkspace(ws)}
                    disabled={deleting === ws.id}
                    className="w-9 h-9 rounded-xl border border-red-500/30 bg-red-500/8 text-red-400 hover:bg-red-500/18 hover:border-red-500/50 transition-all grid place-items-center flex-shrink-0 disabled:opacity-40"
                    title="Xóa workspace"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {workspaces.length === 0 && (
            <div className="card p-10 text-center text-text-2">Chưa có workspace nào</div>
          )}
        </div>
      )}
    </div>
  );
}
