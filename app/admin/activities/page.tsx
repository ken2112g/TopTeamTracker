'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Clock, Filter, Package, Trash2, PlusCircle, Folder, Camera, Inbox } from 'lucide-react';

interface AdminActivity {
  id: string;
  workspaceId: string;
  workspaceName: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetName: string | null;
  meta: any;
  createdAt: string;
}

const ACTION_META: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  listing_added:       { color: '#f1641e', label: 'Thêm SP',     icon: <Package  size={14} /> },
  listing_deleted:     { color: '#ef4444', label: 'Xóa SP',      icon: <Trash2   size={14} /> },
  collection_created:  { color: '#84cc16', label: 'Tạo BST',     icon: <PlusCircle size={14} /> },
  collection_deleted:  { color: '#ef4444', label: 'Xóa BST',     icon: <Trash2   size={14} /> },
  snapshot_captured:   { color: '#60a5fa', label: 'Snapshot',    icon: <Camera   size={14} /> },
};

const FILTER_ACTIONS = [
  { value: 'all',               label: 'Tất cả' },
  { value: 'listing_added',     label: 'Thêm SP' },
  { value: 'listing_deleted',   label: 'Xóa SP' },
  { value: 'collection_created',label: 'Tạo BST' },
  { value: 'collection_deleted',label: 'Xóa BST' },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Vừa xong';
  if (m < 60) return `${m}p trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h trước`;
  return `${Math.floor(h / 24)}d trước`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export default function AdminActivitiesPage() {
  const [items, setItems] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [wsSearch, setWsSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '300' });
    if (actionFilter !== 'all') params.set('action', actionFilter);
    fetch(`/api/admin/activities?${params}`)
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [actionFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = wsSearch
    ? items.filter(a => a.workspaceName.toLowerCase().includes(wsSearch.toLowerCase()))
    : items;

  const today  = items.filter(a => Date.now() - new Date(a.createdAt).getTime() < 86_400_000).length;
  const wsSet  = new Set(items.map(a => a.workspaceId));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-0">Activity Log</h1>
          <p className="text-text-2 text-[13px] mt-0.5">Toàn bộ hành động của mọi workspace trong hệ thống</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-2 border border-line text-text-1 hover:border-orange/40 hover:text-orange transition-all text-[13px] font-medium disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Tổng hành động', value: items.length, color: '#f1641e' },
          { label: 'Hôm nay',        value: today,         color: '#84cc16' },
          { label: 'Workspaces',     value: wsSet.size,    color: '#60a5fa' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-4">
            <div className="font-display text-[28px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[12px] text-text-2">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Filter size={13} className="text-text-2 shrink-0" />
        <div className="flex gap-1 p-1 bg-bg-1 border border-line rounded-xl">
          {FILTER_ACTIONS.map(f => (
            <button
              key={f.value}
              onClick={() => setActionFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all ${
                actionFilter === f.value ? 'bg-orange text-white' : 'text-text-2 hover:text-text-1'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Lọc theo workspace..."
          value={wsSearch}
          onChange={e => setWsSearch(e.target.value)}
          className="input-base w-52 text-[12.5px] py-1.5"
        />
        <span className="font-mono text-[11px] text-text-2">{filtered.length} bản ghi</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={22} className="animate-spin text-text-2" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <Inbox size={40} className="mx-auto text-text-2 mb-3" />
          <div className="text-text-2 text-[13px]">Chưa có hoạt động nào</div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-line bg-bg-1/50">
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-text-2">Hành động</th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-text-2">Đối tượng</th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-text-2">Workspace</th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-text-2">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const meta = ACTION_META[a.action];
                const isDel = a.action.includes('deleted');
                return (
                  <tr key={a.id} className="border-b border-line/40 hover:bg-bg-1/60 transition-colors">
                    {/* Action */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-lg grid place-items-center shrink-0"
                          style={{ background: (meta?.color ?? '#888') + '20', color: meta?.color ?? '#888' }}
                        >
                          {meta?.icon ?? <Clock size={12} />}
                        </div>
                        <span
                          className="font-mono text-[10.5px] px-1.5 py-0.5 rounded border font-semibold"
                          style={{ color: meta?.color ?? '#888', borderColor: (meta?.color ?? '#888') + '40', background: (meta?.color ?? '#888') + '12' }}
                        >
                          {meta?.label ?? a.action}
                        </span>
                      </div>
                    </td>

                    {/* Target */}
                    <td className="px-4 py-3 max-w-[240px]">
                      <div className={`truncate font-medium ${isDel ? 'line-through text-text-2' : 'text-text-0'}`}>
                        {a.targetName || a.targetId || '—'}
                      </div>
                      {a.meta?.collectionName && (
                        <div className="text-[10.5px] text-orange flex items-center gap-1 mt-0.5">
                          <Folder size={9} /> {a.meta.collectionName}
                        </div>
                      )}
                    </td>

                    {/* Workspace */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-bg-2 border border-line text-text-1">
                        {a.workspaceName}
                      </span>
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3">
                      <div className="font-mono text-[11.5px] text-text-1">{fmtDate(a.createdAt)}</div>
                      <div className="text-[10.5px] text-text-2 mt-0.5">{timeAgo(a.createdAt)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
