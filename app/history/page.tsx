'use client';

import { useRouter } from 'next/navigation';
import { Clock, Trash2, RotateCcw, Search } from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';

export default function HistoryPage() {
  const router = useRouter();
  const { searchHistory, clearSearchHistory, showToast } = useAppStore();

  const handleSearch = (keyword: string) => {
    router.push(`/search?q=${encodeURIComponent(keyword)}`);
  };

  const handleClear = () => {
    if (confirm('Xóa toàn bộ lịch sử tìm kiếm?')) {
      clearSearchHistory();
      showToast('🗑 Đã xóa', 'Lịch sử tìm kiếm đã được xóa', 'success');
    }
  };

  return (
    <div className="p-8 xl:p-10">
      <div className="font-mono text-[11px] text-orange tracking-[0.2em] uppercase mb-3 flex items-center gap-2.5">
        <span className="w-6 h-0.5 bg-orange" />
        Lịch sử hoạt động
      </div>
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="font-display text-[42px] font-bold tracking-tight leading-tight mb-2">
            Lịch sử <em className="text-orange not-italic">tìm kiếm</em>
          </h1>
          <p className="text-[15px] text-text-2 max-w-[520px] leading-relaxed">
            Những từ khóa bạn đã nghiên cứu gần đây. Nhấn vào để tìm kiếm lại ngay.
          </p>
        </div>
        {searchHistory.length > 0 && (
          <button onClick={handleClear} className="btn text-accent-red border-red-500/30 hover:bg-accent-red hover:text-white hover:border-accent-red">
            <Trash2 size={14} /> Xóa lịch sử
          </button>
        )}
      </div>

      {searchHistory.length === 0 ? (
        <div className="card p-16 text-center">
          <Clock size={48} className="mx-auto text-text-2 mb-4" />
          <div className="font-display text-xl font-semibold mb-2">Chưa có lịch sử</div>
          <div className="text-text-2 text-[13.5px] mb-5">Tìm kiếm sản phẩm Etsy để bắt đầu ghi lại lịch sử</div>
          <button onClick={() => router.push('/search')} className="btn btn-primary mx-auto">
            <Search size={14} /> Tìm kiếm ngay
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {searchHistory.map((s, i) => (
            <div
              key={i}
              onClick={() => handleSearch(s.keyword)}
              className="card px-6 py-4 flex items-center gap-5 hover:border-orange hover:translate-x-1.5 hover:bg-bg-2 transition-all duration-300 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-orange/10 grid place-items-center flex-shrink-0 group-hover:bg-orange/20 transition-colors">
                <Clock size={18} className="text-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-[16px] font-semibold group-hover:text-orange transition-colors">
                  {s.keyword}
                </div>
                <div className="text-[12.5px] text-text-2 mt-0.5">
                  {s.count} sản phẩm đã xem · {s.date}
                </div>
              </div>
              <div className="font-mono text-[12px] text-text-2 shrink-0">
                {s.results} kết quả
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-orange shrink-0">
                <RotateCcw size={16} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
