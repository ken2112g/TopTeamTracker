'use client';

import { useState, useEffect } from 'react';
import { Search as SearchIcon, Sparkles, Tag, Pencil, Folder, ChevronRight, ArrowLeft, X, ShoppingBag, Eye, Star, DollarSign, Heart } from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { searchEtsy, type SearchItem } from '@/lib/actions/etsy-scraper';
import { createCollection, getCollections } from '@/lib/actions/collections';
import { createListing } from '@/lib/actions/listings';
import type { Collection } from '@/types';

// SearchResult compatible với SearchItem từ scraper
type SearchResult = SearchItem & {
  emoji: string;
  shop: string;
  estimatedSold: number;
  estimatedRevenue: number;
  createdAt?: string;
  updatedAt?: string;
};

const COLORS = ['#f1641e', '#a78bfa', '#ef4444', '#84cc16', '#60a5fa', '#facc15', '#ec4899'];

type DropMode = null | 'menu' | 'custom' | 'existing';

export default function SearchPage() {
  const [keyword, setKeyword] = useState('birthday romper');
  const [limit, setLimit] = useState(50);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { showToast, addSearchHistory, userCollections, deletedCollectionIds } = useAppStore();
  const [dbCollections, setDbCollections] = useState<Collection[]>([]);

  const [dropMode, setDropMode] = useState<DropMode>(null);
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState(COLORS[0]);
  const [collSearch, setCollSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [isMockData, setIsMockData] = useState(false);
  const [cookieErrorType, setCookieErrorType] = useState<null | 'expired' | 'none'>(null);

  // Auto-search from ?q= URL param (e.g. from History page)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('q');
    if (q?.trim()) {
      setKeyword(q.trim());
      setTimeout(() => {
        document.getElementById('search-trigger')?.click();
      }, 100);
    }
  }, []);

  const handleSearch = async () => {
    if (!keyword.trim()) {
      showToast('⚠️ Thiếu từ khóa', 'Vui lòng nhập từ khóa', 'error');
      return;
    }
    setLoading(true);
    setResults([]);
    setSelectedIdx(new Set());
    setIsMockData(false);
    setCookieErrorType(null);

    let p = 0;
    const interval = setInterval(() => {
      p = Math.min(p + Math.random() * 12, 95);
      setProgress(p);
    }, 300);

    showToast('🔍 Đang tìm kiếm', 'Đang lấy dữ liệu từ Etsy...', 'success');

    try {
      const res = await searchEtsy(keyword.trim(), limit);
      clearInterval(interval);
      setProgress(100);

      let mapped: SearchResult[];

      if ('error' in res) {
        const errCode = (res as { error: string }).error;
        if (errCode === 'cookie_expired') setCookieErrorType('expired');
        else if (errCode === 'no_cookie') setCookieErrorType('none');

        // Fallback mock
        const { mockSearch } = await import('@/lib/mock/data');
        const mockRes = mockSearch(keyword.trim(), limit);
        mapped = mockRes.map((item) => ({
          etsyListingId: `mock_${Math.random().toString(36).slice(2)}`,
          url: item.url,
          title: item.title,
          shopName: item.shop,
          shop: item.shop,
          price: item.price,
          oldPrice: item.oldPrice,
          rating: item.rating,
          reviewsCount: item.reviewsCount,
          estimatedSold: item.estimatedSold,
          estimatedRevenue: item.estimatedRevenue,
          soldDaily: item.soldDaily ?? 0,
          viewsDaily: item.viewsDaily ?? 0,
          viewsTotal: item.viewsTotal ?? 0,
          favorites: item.favorites ?? 0,
          favRate: item.favRate ?? 0,
          country: item.country ?? 'US',
          currency: item.currency ?? 'USD',
          isHot: item.isHot ?? false,
          emoji: item.emoji,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));
        setIsMockData(true);
        showToast('⚠️ Dùng dữ liệu mô phỏng', 'Cookie hết hạn — xem hướng dẫn phía trên', 'error');
      } else {
        mapped = res.map((item) => ({ ...item, shop: item.shopName }));
        showToast('✅ Hoàn tất', `Đã tìm thấy ${mapped.length} sản phẩm từ Etsy (data thật)`, 'success');
      }

      setResults(mapped);
      addSearchHistory({ keyword: keyword.trim(), count: limit, results: mapped.length });

      // Load collections từ DB
      try {
        const cols = await getCollections();
        setDbCollections(cols);
      } catch {}
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const toggleSelect = (idx: number) => {
    setSelectedIdx((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectTop20 = () => {
    setSelectedIdx(new Set(Array.from({ length: Math.min(20, results.length) }, (_, i) => i)));
  };

  const handleOpenModal = () => {
    if (selectedIdx.size === 0) {
      showToast('⚠️ Chưa chọn SP', 'Tick chọn ít nhất 1 sản phẩm', 'error');
      return;
    }
    setDropMode('menu');
    setCustomName('');
    setCustomColor(COLORS[0]);
    setCollSearch('');
  };

  const handleClose = () => setDropMode(null);

  const saveListingsToCollection = async (collectionId: string, collName: string) => {
    setSaving(true);
    const selected = Array.from(selectedIdx).map((i) => results[i]);
    let saved = 0;
    for (const item of selected) {
      try {
        await createListing({
          etsyListingId: item.etsyListingId,
          url: item.url,
          title: item.title,
          shopName: item.shopName,
          emoji: item.emoji,
          currentPrice: item.price,
          oldPrice: item.oldPrice,
          rating: item.rating,
          reviewsCount: item.reviewsCount,
          collectionId,
          country: item.country,
          currency: item.currency,
          favoritesCount: item.favorites,
        });
        saved++;
      } catch (e: any) {
        // Ignore duplicate (unique constraint on etsy_listing_id)
        if (!e?.message?.includes('duplicate') && !e?.message?.includes('unique')) {
          console.warn('Save listing failed:', e?.message);
        }
      }
    }
    setSaving(false);
    showToast('✅ Đã lưu vào bộ sưu tập', `${saved}/${selected.length} SP → "${collName}"`, 'success');
    setSelectedIdx(new Set());
    setDropMode(null);
  };

  const handleAddNewAuto = async () => {
    setSaving(true);
    try {
      const col = await createCollection({
        name: keyword.trim(),
        keyword: keyword.trim(),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
      await saveListingsToCollection(col.id, col.name);
    } catch (e: any) {
      showToast('❌ Lỗi', e?.message ?? 'Không thể tạo bộ sưu tập', 'error');
      setSaving(false);
    }
  };

  const handleAddNewCustom = async () => {
    if (!customName.trim()) return;
    setSaving(true);
    try {
      const col = await createCollection({
        name: customName.trim(),
        keyword: keyword.trim(),
        color: customColor,
      });
      await saveListingsToCollection(col.id, col.name);
    } catch (e: any) {
      showToast('❌ Lỗi', e?.message ?? 'Không thể tạo bộ sưu tập', 'error');
      setSaving(false);
    }
  };

  const handleAddExisting = async (col: Collection) => {
    await saveListingsToCollection(col.id, col.name);
  };

  const allCollections: Collection[] = [
    ...dbCollections,
    ...userCollections
      .filter((uc) => !deletedCollectionIds.includes(uc.id) && !dbCollections.find((d) => d.id === uc.id))
      .map((uc) => ({
        id: uc.id,
        name: uc.name,
        color: uc.color,
        keyword: uc.keyword,
        createdAt: uc.createdAt,
        listingsCount: uc.listingsCount,
      })),
  ];

  const filteredColls = allCollections.filter(
    (c) =>
      c.name.toLowerCase().includes(collSearch.toLowerCase()) ||
      c.keyword?.toLowerCase().includes(collSearch.toLowerCase())
  );

  return (
    <div className="p-8 xl:p-10">
      <div className="font-mono text-[11px] text-orange tracking-[0.2em] uppercase mb-3 flex items-center gap-2.5">
        <span className="w-6 h-0.5 bg-orange" />
        Bước 1 · Khám phá thị trường
      </div>
      <h1 className="font-display text-[42px] font-bold tracking-tight leading-tight mb-3">
        Tìm sản phẩm <em className="text-orange not-italic">đáng theo dõi</em>
      </h1>
      <p className="text-[15px] text-text-2 max-w-[600px] leading-relaxed mb-7">
        Nhập từ khóa giống search trên Etsy. Tool sẽ trả về kết quả kèm số liệu ước tính nhanh để bạn quyết định nên track sản phẩm nào.
      </p>

      <div className="flex gap-2.5 mb-4">
        <input
          className="input-base flex-1 text-[17px] font-display font-medium py-4"
          placeholder="Bạn muốn nghiên cứu niche nào?"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button id="search-trigger" onClick={handleSearch} disabled={loading} className="btn btn-primary px-6 disabled:opacity-50">
          {loading ? 'Đang tìm...' : 'Tìm kiếm →'}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        <div className="filter-chip active">
          Sắp xếp:&nbsp;
          <select className="bg-transparent border-0 text-orange font-semibold cursor-pointer outline-none">
            <option>Liên quan nhất</option>
            <option>Bán chạy</option>
            <option>Mới nhất</option>
          </select>
        </div>
        <div className="filter-chip">
          Giới hạn:&nbsp;
          <select
            className="bg-transparent border-0 text-text-1 font-semibold cursor-pointer outline-none"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={50}>50 SP</option>
            <option value={100}>100 SP</option>
            <option value={250}>250 SP</option>
            <option value={500}>500 SP</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="mb-5">
          <div className="h-[3px] bg-bg-2 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange to-orange-bright transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="font-mono text-[11px] text-orange mt-1.5">Đang tải {Math.floor(progress)}/100 sản phẩm...</div>
        </div>
      )}

      {results.length > 0 && (
        <>
          {isMockData && (
            <div className="flex items-start gap-3 mb-4 px-4 py-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-[13px] text-amber-300">
              <Sparkles size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold mb-1.5">
                  {cookieErrorType === 'expired' ? '⏳ Cookie DataDome đã hết hạn' : '🔑 Chưa cấu hình kết nối Etsy'}
                </div>
                <div className="text-amber-200/80 leading-relaxed mb-3">
                  {cookieErrorType === 'expired'
                    ? 'Cookie từ Chrome của bạn đã hết hạn. Chạy lệnh dưới để lấy cookie mới tự động:'
                    : 'Chưa có cookie kết nối Etsy. Chạy lệnh dưới để mở Chrome và lấy cookie tự động:'}
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-black/40 border border-amber-500/20 font-mono text-[13px]">
                  <span className="text-amber-400 select-all">npm run cookie:refresh</span>
                  <span className="text-amber-600 ml-auto text-[11px]">chạy trong terminal riêng</span>
                </div>
                <div className="mt-2 text-amber-600 text-[11.5px]">
                  Sau khi chạy xong → restart server (<span className="font-mono">Ctrl+C</span> → <span className="font-mono">npm run dev</span>) → search lại
                </div>
              </div>
            </div>
          )}
          <div className="card flex items-center gap-4 mb-5 px-5 py-4 text-[13.5px]">
            <span>
              Tìm thấy <span className="font-mono text-orange font-semibold">{results.length}</span> sản phẩm cho "
              <span className="text-orange font-semibold">{keyword}</span>"
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange/10 text-orange font-mono text-[11px] font-semibold animate-pulse">
              <Sparkles size={11} /> {isMockData ? 'MÔ PHỎNG' : 'ƯỚC TÍNH NHANH'}
            </span>
            <div className="ml-auto flex gap-2">
              <button onClick={selectTop20} className="btn text-[12.5px] py-2 px-3.5">Chọn 20 SP đầu</button>
              <button onClick={handleOpenModal} className="btn btn-primary text-[12.5px] py-2 px-3.5">
                + Thêm vào bộ sưu tập ({selectedIdx.size})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {results.map((p, i) => (
              <ProductCard key={i} product={p} selected={selectedIdx.has(i)} onClick={() => toggleSelect(i)} index={i} />
            ))}
          </div>
        </>
      )}

      {!loading && results.length === 0 && (
        <div className="card p-12 text-center">
          <SearchIcon size={48} className="mx-auto text-text-2 mb-4" />
          <div className="font-display text-xl font-semibold mb-2">Bắt đầu tìm kiếm</div>
          <div className="text-text-2 text-sm">Nhập từ khóa và nhấn "Tìm kiếm" để xem kết quả</div>
        </div>
      )}

      {/* ===== Add to collection modal ===== */}
      {dropMode && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <div
            className="bg-bg-1 border border-line rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] w-full max-w-[500px] overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >

            {/* ---- Menu view ---- */}
            {dropMode === 'menu' && (
              <div>
                {/* Header */}
                <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-line">
                  <div>
                    <div className="font-display text-[20px] font-bold">Thêm vào bộ sưu tập</div>
                    <div className="text-[13px] text-text-2 mt-0.5">
                      <span className="font-mono text-orange font-semibold">{selectedIdx.size}</span> sản phẩm đã chọn
                    </div>
                  </div>
                  <button onClick={handleClose} className="w-9 h-9 rounded-full bg-bg-2 hover:bg-bg-3 grid place-items-center transition-colors">
                    <X size={16} className="text-text-1" />
                  </button>
                </div>

                {/* Options */}
                <div className="p-4 flex flex-col gap-2">

                  {/* Option 1 */}
                  <button
                    onClick={handleAddNewAuto}
                    disabled={saving}
                    className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-line hover:border-orange bg-bg-2 hover:bg-orange/5 transition-all group text-left disabled:opacity-50"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-orange/15 border border-orange/25 grid place-items-center flex-shrink-0">
                      <Tag size={20} className="text-orange" />
                    </div>
                    <div className="flex-1">
                      <div className="font-display text-[15px] font-semibold group-hover:text-orange transition-colors">
                        Tạo mới theo từ khóa tìm kiếm
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange/15 text-orange font-mono text-[12px] font-semibold">
                          🔍 {keyword}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-text-2 group-hover:text-orange transition-colors flex-shrink-0" />
                  </button>

                  {/* Option 2 */}
                  <button
                    onClick={() => { setDropMode('custom'); setCustomName(''); }}
                    className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-line hover:border-orange bg-bg-2 hover:bg-orange/5 transition-all group text-left"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-bg-3 border border-line grid place-items-center flex-shrink-0 group-hover:border-orange/40 transition-colors">
                      <Pencil size={18} className="text-text-1 group-hover:text-orange transition-colors" />
                    </div>
                    <div className="flex-1">
                      <div className="font-display text-[15px] font-semibold group-hover:text-orange transition-colors">
                        Tạo mới với tên tự đặt
                      </div>
                      <div className="text-[13px] text-text-2 mt-0.5">
                        Đặt tên và chọn màu sắc riêng cho bộ sưu tập
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-text-2 group-hover:text-orange transition-colors flex-shrink-0" />
                  </button>

                  {/* Option 3 */}
                  <button
                    onClick={() => { setDropMode('existing'); setCollSearch(''); }}
                    className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-line hover:border-orange bg-bg-2 hover:bg-orange/5 transition-all group text-left"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-bg-3 border border-line grid place-items-center flex-shrink-0 group-hover:border-orange/40 transition-colors">
                      <Folder size={18} className="text-text-1 group-hover:text-orange transition-colors" />
                    </div>
                    <div className="flex-1">
                      <div className="font-display text-[15px] font-semibold group-hover:text-orange transition-colors">
                        Thêm vào bộ sưu tập có sẵn
                      </div>
                      <div className="text-[13px] text-text-2 mt-0.5">
                        <span className="font-mono text-orange">{allCollections.length}</span> bộ sưu tập hiện có
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-text-2 group-hover:text-orange transition-colors flex-shrink-0" />
                  </button>
                </div>

                <div className="px-4 pb-4">
                  <button onClick={handleClose} className="btn w-full text-[13px] py-3">
                    Hủy
                  </button>
                </div>
              </div>
            )}

            {/* ---- Custom name view ---- */}
            {dropMode === 'custom' && (
              <div>
                <div className="flex items-center gap-3 px-7 pt-6 pb-5 border-b border-line">
                  <button
                    onClick={() => setDropMode('menu')}
                    className="w-9 h-9 rounded-full bg-bg-2 hover:bg-bg-3 grid place-items-center transition-colors flex-shrink-0"
                  >
                    <ArrowLeft size={16} className="text-text-1" />
                  </button>
                  <div>
                    <div className="font-display text-[20px] font-bold">Tạo bộ sưu tập mới</div>
                    <div className="text-[13px] text-text-2 mt-0.5">Đặt tên và màu cho {selectedIdx.size} sản phẩm</div>
                  </div>
                  <button onClick={handleClose} className="ml-auto w-9 h-9 rounded-full bg-bg-2 hover:bg-bg-3 grid place-items-center transition-colors">
                    <X size={16} className="text-text-1" />
                  </button>
                </div>

                <div className="p-6">
                  <div className="mb-5">
                    <label className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-2 font-semibold mb-2 block">
                      Tên bộ sưu tập
                    </label>
                    <input
                      autoFocus
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewCustom()}
                      placeholder={`vd: ${keyword}`}
                      className="w-full px-4 py-3 rounded-xl bg-bg-2 border border-line text-[15px] text-text-0 placeholder:text-text-2 outline-none focus:border-orange transition-colors"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-2 font-semibold mb-3 block">
                      Màu sắc
                    </label>
                    <div className="flex gap-3">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setCustomColor(c)}
                          style={{
                            background: c,
                            boxShadow: customColor === c ? `0 0 0 2px #161310, 0 0 0 4px ${c}` : 'none',
                          }}
                          className={`w-9 h-9 rounded-full transition-all ${customColor === c ? 'scale-125' : 'hover:scale-110'}`}
                        />
                      ))}
                    </div>

                    {/* Preview */}
                    {customName && (
                      <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-line bg-bg-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: customColor }} />
                        <span className="font-display text-[14px] font-semibold text-text-0 truncate">{customName}</span>
                        <span className="font-mono text-[11px] ml-auto px-2 py-0.5 rounded-full font-semibold" style={{ background: customColor + '20', color: customColor }}>
                          {selectedIdx.size} SP
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setDropMode('menu')} className="btn flex-1 py-3 text-[14px]">
                      Hủy
                    </button>
                    <button
                      onClick={handleAddNewCustom}
                      disabled={!customName.trim() || saving}
                      className="btn btn-primary flex-1 py-3 text-[14px] disabled:opacity-40"
                    >
                      {saving ? 'Đang lưu...' : `Tạo & thêm ${selectedIdx.size} SP →`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ---- Existing collections view ---- */}
            {dropMode === 'existing' && (
              <div>
                <div className="flex items-center gap-3 px-7 pt-6 pb-5 border-b border-line">
                  <button
                    onClick={() => setDropMode('menu')}
                    className="w-9 h-9 rounded-full bg-bg-2 hover:bg-bg-3 grid place-items-center transition-colors flex-shrink-0"
                  >
                    <ArrowLeft size={16} className="text-text-1" />
                  </button>
                  <div>
                    <div className="font-display text-[20px] font-bold">Bộ sưu tập có sẵn</div>
                    <div className="text-[13px] text-text-2 mt-0.5">Chọn để thêm {selectedIdx.size} sản phẩm vào</div>
                  </div>
                  <button onClick={handleClose} className="ml-auto w-9 h-9 rounded-full bg-bg-2 hover:bg-bg-3 grid place-items-center transition-colors">
                    <X size={16} className="text-text-1" />
                  </button>
                </div>

                <div className="px-5 pt-4 pb-2">
                  <div className="relative">
                    <SearchIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none" />
                    <input
                      autoFocus
                      type="text"
                      value={collSearch}
                      onChange={(e) => setCollSearch(e.target.value)}
                      placeholder="Tìm bộ sưu tập..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-2 border border-line text-[14px] text-text-0 placeholder:text-text-2 outline-none focus:border-orange transition-colors"
                    />
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[320px] px-4 pb-4 mt-1">
                  {filteredColls.length === 0 ? (
                    <div className="text-center py-10 text-[13px] text-text-2 font-mono">
                      Không tìm thấy bộ sưu tập
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {filteredColls.map((col) => (
                        <button
                          key={col.id}
                          onClick={() => handleAddExisting(col)}
                          disabled={saving}
                          className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-transparent hover:border-orange hover:bg-orange/5 transition-all group text-left disabled:opacity-50"
                        >
                          <span
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ background: col.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-display text-[14.5px] font-semibold text-text-0 group-hover:text-orange transition-colors truncate">
                              {col.name}
                            </div>
                            {col.keyword && (
                              <div className="font-mono text-[11.5px] text-text-2 truncate mt-0.5">
                                🔍 {col.keyword}
                              </div>
                            )}
                          </div>
                          <span
                            className="font-mono text-[12px] px-2.5 py-1 rounded-full flex-shrink-0 font-semibold"
                            style={{ background: col.color + '20', color: col.color }}
                          >
                            {col.listingsCount} SP
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', VN: '🇻🇳', CA: '🇨🇦', GB: '🇬🇧', AU: '🇦🇺',
  DE: '🇩🇪', FR: '🇫🇷', JP: '🇯🇵', KR: '🇰🇷',
};

const CURRENCY_CFG: Record<string, { rate: number; fmt: (usd: number) => string }> = {
  USD: { rate: 1,     fmt: (v) => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(1)}K` : `$${v.toFixed(0)}` },
  VND: { rate: 25400, fmt: (v) => { const vnd = v * 25400; return vnd >= 1e9 ? `${(vnd/1e9).toFixed(1)}T₫` : `${(vnd/1e6).toFixed(0)}M₫`; } },
  CAD: { rate: 1.37,  fmt: (v) => { const c = v * 1.37; return c >= 1e3 ? `CA$${(c/1e3).toFixed(1)}K` : `CA$${c.toFixed(0)}`; } },
  GBP: { rate: 0.79,  fmt: (v) => { const g = v * 0.79; return g >= 1e3 ? `£${(g/1e3).toFixed(1)}K` : `£${g.toFixed(0)}`; } },
  AUD: { rate: 1.53,  fmt: (v) => { const a = v * 1.53; return a >= 1e3 ? `A$${(a/1e3).toFixed(1)}K` : `A$${a.toFixed(0)}`; } },
};

function fmtRevenueCurrency(usdAmount: number, currency = 'USD') {
  return (CURRENCY_CFG[currency] ?? CURRENCY_CFG['USD']).fmt(usdAmount);
}

function fmtViews(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function relativeDate(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return '1 ngày trước';
  if (diff < 30) return `${diff} ngày trước`;
  if (diff < 365) return `${Math.floor(diff / 30)} tháng trước`;
  return `${Math.floor(diff / 365)} năm trước`;
}

function etsyAge(iso: string) {
  const d = new Date(iso);
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000));
  const suffix = years > 0 ? ` (${years} năm)` : '';
  return `${dd}/${mm}/${yyyy}${suffix}`;
}

function ProductCard({ product, selected, onClick, index }: { product: SearchResult; selected: boolean; onClick: () => void; index: number }) {
  const viewsAvg = product.viewsDaily ?? 0;
  const viewsTotal = product.viewsTotal ?? 0;
  const favorites = product.favorites ?? 0;
  const favRate = product.favRate ?? 0;
  const flag = COUNTRY_FLAGS[product.country ?? 'US'] ?? '🌐';
  const isHot = product.isHot ?? false;
  const currency = product.currency ?? 'USD';

  // Border: selected > hot > default
  const borderClass = selected
    ? 'border-orange shadow-[0_0_0_2px_#f1641e,0_16px_36px_rgba(241,100,30,0.3)]'
    : isHot
      ? 'border-red-500 shadow-[0_0_0_1.5px_#ef4444,0_12px_32px_rgba(239,68,68,0.25)] bg-red-950/20'
      : 'hover:border-orange hover:-translate-y-1 hover:shadow-2xl';

  return (
    <div
      onClick={onClick}
      style={{ animationDelay: `${index * 0.04}s` }}
      className={`card overflow-hidden cursor-pointer transition-all duration-300 animate-slide-up flex flex-col ${borderClass}`}
    >
      {/* Image / emoji area */}
      <div className={`h-[120px] relative flex-shrink-0 overflow-hidden ${
        isHot ? 'bg-gradient-to-br from-red-950/60 to-[#1f1a16]' : 'bg-gradient-to-br from-[#3a2f27] to-[#1f1a16]'
      }`}>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-[56px]">
            <span>{product.emoji}</span>
          </div>
        )}
        <div className={`absolute top-2.5 left-2.5 w-5 h-5 rounded-full grid place-items-center transition-all backdrop-blur-md ${
          selected ? 'bg-orange border-orange' : 'bg-black/70 border border-white/50'
        }`}>
          {selected && (
            <svg width="11" height="11" viewBox="0 0 12 12">
              <path d="M2 6 L5 9 L10 3" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
          {isHot && (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white font-mono text-[9px] font-bold backdrop-blur-md">
              🔥 HOT
            </span>
          )}
          {!isHot && (
            <span className="px-2 py-0.5 rounded-full bg-black/75 text-accent-amber font-mono text-[9px] font-semibold backdrop-blur-md flex items-center gap-1">
              <Sparkles size={8} /> ƯỚC TÍNH
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Title + shop + price */}
        <div>
          <div className="font-display text-[13.5px] font-semibold leading-snug line-clamp-2 mb-0.5">{product.title}</div>
          <div className="text-[11.5px] text-text-2 italic">by {product.shop}</div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="font-display text-[20px] font-bold text-orange tracking-tight">${product.price}</span>
            {product.oldPrice && <span className="text-[12px] text-text-2 line-through ml-1.5">${product.oldPrice}</span>}
          </div>
          <div className="font-mono text-[11px] text-text-1 flex items-center gap-1">
            <Star size={11} className="text-accent-amber fill-accent-amber" />
            {product.rating} <span className="text-text-2">({product.reviewsCount.toLocaleString()})</span>
          </div>
        </div>

        {/* HeyEtsy-style badges */}
        <div className="grid grid-cols-2 gap-1.5">
          <HeyBadge icon={<Star size={10} />} label={`${product.soldDaily ?? 1}+ Sold`} color="#22c55e" />
          <HeyBadge icon={<Eye size={10} />} label={`${product.viewsDaily ?? 30}+ Views`} color="#f97316" />
          <HeyBadge icon={<ShoppingBag size={10} />} label={`${product.estimatedSold.toLocaleString()} Sold`} color="#3b82f6" />
          <HeyBadge icon={<DollarSign size={10} />} label={fmtRevenueCurrency(product.estimatedRevenue, currency)} color="#a855f7" />
        </div>

        {/* Stats rows */}
        <div className="border-t border-line/60 pt-2.5 flex flex-col gap-1.5">
          <StatRow label="Views"     left={`${viewsAvg} (Avg)`} right={fmtViews(viewsTotal)} color="#ef4444" />
          <StatRow label="Favorites" left={`${favRate}%`}        right={favorites.toLocaleString()} color="#3b82f6" />
          {product.createdAt && <StatRow label="Created" left={etsyAge(product.createdAt)} color="#3b82f6" />}
          {product.updatedAt && <StatRow label="Updated" left={relativeDate(product.updatedAt)} color="#22c55e" />}
        </div>

        {/* Bottom bar: flag + go to shop + sold badge */}
        <div className="border-t border-line/60 pt-2.5 flex items-center justify-between gap-2 mt-auto">
          <a
            href={product.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[20px] leading-none hover:scale-110 transition-transform inline-block"
            title={`${product.country ?? 'US'} — Xem shop`}
          >
            {flag}
          </a>
          <div
            className="px-2 py-0.5 rounded-lg text-white text-[10px] font-mono font-bold"
            style={{ background: '#ef4444' }}
          >
            🛒 {product.soldDaily ?? 1}+ Sold
          </div>
        </div>
      </div>
    </div>
  );
}

function HeyBadge({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white text-[11px] font-mono font-semibold"
      style={{ background: color }}
    >
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}

function StatRow({ label, left, right, color }: { label: string; left: string; right?: string; color: string }) {
  return (
    <div className="flex items-center text-[11.5px]">
      <span className="text-text-2 w-[72px] shrink-0 font-mono">{label}</span>
      <span className="font-mono font-semibold flex-1" style={{ color }}>{left}</span>
      {right && <span className="font-mono font-bold ml-auto" style={{ color }}>{right}</span>}
    </div>
  );
}
