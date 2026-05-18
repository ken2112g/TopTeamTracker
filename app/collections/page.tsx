'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Folder, ArrowUpDown, TrendingUp, Package, Calendar, ChevronDown, Trash2, X } from 'lucide-react';
import { getCollections, deleteCollection as dbDeleteCollection } from '@/lib/actions/collections';
import { createCollection as dbCreateCollection } from '@/lib/actions/collections';
import { useAppStore } from '@/lib/store/useAppStore';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Collection } from '@/types';

const PALETTE = ['#f1641e', '#a78bfa', '#ef4444', '#84cc16', '#60a5fa', '#facc15', '#ec4899', '#14b8a6'];

type SortKey = 'name' | 'count' | 'created';

function CreateCollectionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [keyword, setKeyword] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useAppStore();
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast('⚠️ Thiếu tên', 'Vui lòng nhập tên collection', 'error');
      return;
    }
    setSaving(true);
    try {
      const col = await dbCreateCollection({ name: name.trim(), color, keyword: keyword.trim() || undefined });
      showToast('✅ Đã tạo', `Collection "${name.trim()}" đã được tạo`, 'success');
      onClose();
      onCreated();
      router.push(`/collections/${col.id}`);
    } catch {
      showToast('❌ Lỗi', 'Không thể tạo collection', 'error');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-bg-1 border border-line-strong rounded-2xl p-8 max-w-[480px] w-full relative shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-bg-2 border border-line grid place-items-center text-text-1 hover:bg-accent-red hover:text-white hover:rotate-90 transition-all"
        >
          <X size={16} />
        </button>

        <div className="font-mono text-[11px] text-orange tracking-[0.2em] uppercase mb-2">Collection</div>
        <div className="font-display text-[26px] font-bold tracking-tight leading-tight mb-6">
          Tạo <em className="text-orange not-italic">collection mới</em>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <div className="font-mono text-[10.5px] text-text-2 uppercase tracking-[0.1em] font-semibold mb-2">Tên collection *</div>
            <input
              className="input-base w-full"
              placeholder="vd: Birthday Romper 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          <div>
            <div className="font-mono text-[10.5px] text-text-2 uppercase tracking-[0.1em] font-semibold mb-2">Từ khóa liên quan (tuỳ chọn)</div>
            <input
              className="input-base w-full"
              placeholder="vd: birthday romper personalized"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <div>
            <div className="font-mono text-[10.5px] text-text-2 uppercase tracking-[0.1em] font-semibold mb-3">Màu sắc</div>
            <div className="flex gap-2.5 flex-wrap">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-all hover:scale-110"
                  style={{
                    background: c,
                    outline: color === c ? `3px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    opacity: color === c ? 1 : 0.55,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-bg-2 rounded-xl border border-line">
            <div
              className="w-9 h-9 rounded-[10px] grid place-items-center"
              style={{ background: color + '25', border: `1px solid ${color}50` }}
            >
              <Folder size={18} style={{ color }} />
            </div>
            <div>
              <div className="font-display text-[14px] font-semibold" style={{ color }}>
                {name || 'Tên collection'}
              </div>
              {keyword && <div className="font-mono text-[11px] text-text-2">🔍 {keyword}</div>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-7">
          <button onClick={onClose} className="btn flex-1 justify-center">Hủy</button>
          <button onClick={handleCreate} disabled={saving} className="btn btn-primary flex-1 justify-center disabled:opacity-50">
            <Plus size={14} /> {saving ? 'Đang tạo...' : 'Tạo collection'}
          </button>
        </div>
      </div>
    </div>
  );
}

const COLORS_FILTER = [
  { label: 'Tất cả', value: null },
  { label: 'Cam', value: '#f1641e' },
  { label: 'Tím', value: '#a78bfa' },
  { label: 'Đỏ', value: '#ef4444' },
  { label: 'Xanh lá', value: '#84cc16' },
  { label: 'Xanh dương', value: '#60a5fa' },
  { label: 'Vàng', value: '#facc15' },
];

export default function CollectionsIndexPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('created');
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { showToast } = useAppStore();

  const loadCollections = async () => {
    try {
      const data = await getCollections();
      setCollections(data);
    } catch {
      showToast('❌ Lỗi', 'Không thể tải danh sách collections', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCollections(); }, []);

  const filtered = useMemo(() => {
    let list = [...collections];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.keyword?.toLowerCase().includes(q)
      );
    }

    if (colorFilter) {
      list = list.filter((c) => c.color === colorFilter);
    }

    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'count') return (b.listingsCount ?? 0) - (a.listingsCount ?? 0);
      if (sort === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

    return list;
  }, [search, sort, colorFilter, collections]);

  const totalListings = collections.reduce((s, c) => s + (c.listingsCount ?? 0), 0);

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    try {
      await dbDeleteCollection(confirmDelete.id);
      setCollections((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      showToast('Đã xóa collection', `"${confirmDelete.name}" đã được xóa`, 'success');
    } catch {
      showToast('❌ Lỗi', 'Không thể xóa collection', 'error');
    }
    setConfirmDelete(null);
  };

  return (
    <div className="p-9">
      <div className="font-mono text-[11px] text-orange tracking-[0.2em] uppercase mb-3 flex items-center gap-2.5">
        <span className="w-6 h-0.5 bg-orange" />
        Quản lý Collections
      </div>
      <div className="flex items-end justify-between gap-6 mb-7">
        <div>
          <h1 className="font-display text-[42px] font-bold tracking-tight leading-tight mb-2">
            Collections <em className="text-orange not-italic">của bạn</em>
          </h1>
          <div className="flex gap-4 text-[13.5px] text-text-2">
            <span className="px-2.5 py-1 rounded-full bg-bg-2 border border-line font-mono text-[11.5px]">
              {loading ? '...' : `${filtered.length} collections`}
            </span>
            <span>·</span>
            <span>{totalListings} sản phẩm đang theo dõi</span>
          </div>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus size={16} /> Tạo collection mới
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px] max-w-[400px]">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm collection hoặc từ khóa..."
            className="input-base pl-10 text-[14px]"
          />
        </div>

        <div className="relative">
          <ArrowUpDown size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="input-base !w-auto pl-9 pr-8 py-3 cursor-pointer font-medium text-[13px] appearance-none"
          >
            <option value="created">Mới tạo nhất</option>
            <option value="count">Nhiều SP nhất</option>
            <option value="name">A → Z</option>
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none" />
        </div>

        <div className="flex gap-0 bg-bg-1 border border-line rounded-xl p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-[9px] text-[12px] font-mono font-semibold transition-all ${
              viewMode === 'grid' ? 'bg-orange text-white shadow-md shadow-orange/30' : 'text-text-1 hover:text-text-0'
            }`}
          >
            ⊞ Lưới
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-[9px] text-[12px] font-mono font-semibold transition-all ${
              viewMode === 'list' ? 'bg-orange text-white shadow-md shadow-orange/30' : 'text-text-1 hover:text-text-0'
            }`}
          >
            ☰ Danh sách
          </button>
        </div>
      </div>

      {/* Color filter chips */}
      <div className="flex gap-2 flex-wrap mb-6">
        {COLORS_FILTER.map((cf) => (
          <button
            key={cf.label}
            onClick={() => setColorFilter(cf.value)}
            className={`filter-chip ${colorFilter === cf.value ? 'active' : ''}`}
          >
            {cf.value && <span className="w-2.5 h-2.5 rounded-full" style={{ background: cf.value }} />}
            {cf.label}
          </button>
        ))}
      </div>

      {search && (
        <div className="text-[13px] text-text-2 mb-4">
          Tìm thấy <span className="text-orange font-semibold font-mono">{filtered.length}</span> kết quả cho "{search}"
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5.5 h-[180px] animate-pulse bg-bg-2" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Folder size={48} className="mx-auto text-text-2 mb-4" />
          <div className="font-display text-xl font-semibold mb-2">Không tìm thấy</div>
          <div className="text-text-2 text-sm">Thử từ khóa khác hoặc xóa bộ lọc</div>
          <button
            onClick={() => { setSearch(''); setColorFilter(null); }}
            className="btn mt-4 mx-auto"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <CollectionGrid
          collections={filtered}
          onDeleteRequest={(id, name) => setConfirmDelete({ id, name })}
        />
      ) : (
        <CollectionList
          collections={filtered}
          onDeleteRequest={(id, name) => setConfirmDelete({ id, name })}
        />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Xóa collection?"
        message={`Bạn có chắc muốn xóa "${confirmDelete?.name}"? Toàn bộ sản phẩm trong collection này sẽ bị xóa khỏi theo dõi.`}
        confirmLabel="Xóa collection"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />

      {showCreateModal && (
        <CreateCollectionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={loadCollections}
        />
      )}
    </div>
  );
}

function CollectionGrid({
  collections,
  onDeleteRequest,
}: {
  collections: Collection[];
  onDeleteRequest: (id: string, name: string) => void;
}) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
      {collections.map((col, i) => {
        const daysOld = Math.floor((Date.now() - new Date(col.createdAt).getTime()) / 86400000);
        return (
          <div
            key={col.id}
            style={{ animationDelay: `${i * 0.04}s` }}
            onClick={() => router.push(`/collections/${col.id}`)}
            className="card p-5 cursor-pointer hover:border-orange hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-400 animate-slide-up group relative overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
              style={{ background: col.color }}
            />

            <div className="flex items-start justify-between mb-4 pt-1">
              <div
                className="w-11 h-11 rounded-[12px] grid place-items-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{ background: col.color + '20', border: `1px solid ${col.color}40` }}
              >
                <Folder size={20} style={{ color: col.color }} />
              </div>
              <span
                className="font-mono text-[11px] px-2.5 py-1 rounded-full font-semibold"
                style={{ background: col.color + '20', color: col.color }}
              >
                {col.listingsCount ?? 0} SP
              </span>
            </div>

            <div className="font-display text-[17px] font-bold mb-1 leading-tight group-hover:text-orange transition-colors line-clamp-1">
              {col.name}
            </div>
            {col.keyword && (
              <div className="font-mono text-[11px] text-text-2 mb-3 truncate">
                🔍 {col.keyword}
              </div>
            )}

            <div className="flex items-center gap-1.5 mt-3 text-[11px] text-text-2">
              <Calendar size={10} />
              {daysOld === 0 ? 'Hôm nay' : `${daysOld} ngày trước`}
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); onDeleteRequest(col.id, col.name); }}
              className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:text-accent-red hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 bg-bg-1 border border-line"
              title="Xóa collection"
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function CollectionList({
  collections,
  onDeleteRequest,
}: {
  collections: Collection[];
  onDeleteRequest: (id: string, name: string) => void;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-[1fr_80px_100px_40px] gap-4 px-5 py-2 text-[10.5px] font-mono text-text-2 uppercase tracking-[0.1em] font-semibold">
        <span>Collection</span>
        <span className="text-right">Sản phẩm</span>
        <span className="text-right">Ngày tạo</span>
        <span />
      </div>

      {collections.map((col, i) => {
        const date = new Date(col.createdAt);
        const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        return (
          <div
            key={col.id}
            style={{ animationDelay: `${i * 0.03}s` }}
            onClick={() => router.push(`/collections/${col.id}`)}
            className="card px-5 py-3.5 grid grid-cols-[1fr_80px_100px_40px] gap-4 items-center cursor-pointer hover:border-orange hover:translate-x-1.5 hover:shadow-lg transition-all duration-300 animate-slide-up group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: col.color }} />
              <div className="min-w-0">
                <div className="font-display text-[15px] font-semibold group-hover:text-orange transition-colors truncate">
                  {col.name}
                </div>
                {col.keyword && (
                  <div className="font-mono text-[11px] text-text-2 truncate">🔍 {col.keyword}</div>
                )}
              </div>
            </div>
            <div className="font-mono text-[14px] font-bold text-right tabular-nums" style={{ color: col.color }}>
              {col.listingsCount ?? 0}
            </div>
            <div className="font-mono text-[11.5px] text-text-2 text-right">{dateStr}</div>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteRequest(col.id, col.name); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:text-accent-red hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200 justify-self-end"
              title="Xóa collection"
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
