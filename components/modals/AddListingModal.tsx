'use client';

import { useState } from 'react';
import { X, Link2, FileText, Store } from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';

type Tab = 'single' | 'bulk' | 'shop';

export default function AddListingModal() {
  const { isAddModalOpen, setAddModalOpen, showToast } = useAppStore();
  const [tab, setTab] = useState<Tab>('single');
  const [url, setUrl] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');

  if (!isAddModalOpen) return null;

  const handleAdd = () => {
    if (tab === 'single' && !url.trim()) {
      showToast('⚠️ Thiếu URL', 'Vui lòng nhập URL sản phẩm', 'error');
      return;
    }
    if (tab === 'bulk' && !bulkUrls.trim()) {
      showToast('⚠️ Thiếu URLs', 'Vui lòng nhập ít nhất 1 URL', 'error');
      return;
    }
    showToast('✅ Đã thêm', 'Sản phẩm sẽ được track từ giờ', 'success');
    setAddModalOpen(false);
    setUrl('');
    setBulkUrls('');
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-5 animate-fade-in"
      onClick={() => setAddModalOpen(false)}
    >
      <div
        className="bg-bg-1 border border-line-strong rounded-2xl p-8 max-w-[560px] w-full relative shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setAddModalOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-bg-2 border border-line grid place-items-center text-text-1 hover:bg-accent-red hover:text-white hover:rotate-90 transition-all"
        >
          <X size={16} />
        </button>

        <div className="font-mono text-[11px] text-orange tracking-[0.2em] uppercase mb-2">Thêm sản phẩm</div>
        <div className="font-display text-[28px] font-bold tracking-tight leading-tight mb-2">
          Track <em className="text-orange not-italic">sản phẩm mới</em>
        </div>
        <div className="text-[13.5px] text-text-2 mb-6 leading-relaxed">
          Dán URL Etsy hoặc nhập nhiều URL cùng lúc để bắt đầu theo dõi chỉ số sản phẩm.
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-bg-2 rounded-[10px] mb-5">
          <TabBtn active={tab === 'single'} onClick={() => setTab('single')} icon={<Link2 size={14} />}>1 URL</TabBtn>
          <TabBtn active={tab === 'bulk'} onClick={() => setTab('bulk')} icon={<FileText size={14} />}>Nhiều URL</TabBtn>
          <TabBtn active={tab === 'shop'} onClick={() => setTab('shop')} icon={<Store size={14} />}>Cả shop</TabBtn>
        </div>

        {tab === 'single' && (
          <div className="flex flex-col gap-4">
            <Field label="URL Etsy" hint="Dán link sản phẩm từ trang Etsy">
              <input className="input-base" placeholder="https://www.etsy.com/listing/..." value={url} onChange={(e) => setUrl(e.target.value)} />
            </Field>
            <Field label="Tần suất snapshot">
              <select className="input-base cursor-pointer">
                <option>1 lần/ngày (mặc định)</option>
                <option>1 lần/giờ (sản phẩm hot)</option>
                <option>1 lần/6 giờ</option>
              </select>
            </Field>
          </div>
        )}

        {tab === 'bulk' && (
          <Field label="Nhiều URL (mỗi dòng 1 URL)" hint="Tối đa 100 URL/lần">
            <textarea
              className="input-base resize-none min-h-[120px] font-mono text-[12.5px] leading-relaxed"
              placeholder={'https://www.etsy.com/listing/123...\nhttps://www.etsy.com/listing/456...'}
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
            />
          </Field>
        )}

        {tab === 'shop' && (
          <div className="flex flex-col gap-4">
            <Field label="URL shop hoặc tên shop" hint="Tool sẽ fetch tất cả listings của shop">
              <input className="input-base" placeholder="https://www.etsy.com/shop/..." />
            </Field>
            <div className="text-[12px] text-text-2 italic px-1">
              💡 Tính năng này yêu cầu scraper - sẽ available ở Phase 2
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={() => setAddModalOpen(false)} className="btn flex-1 justify-center">Hủy</button>
          <button onClick={handleAdd} className="btn btn-primary flex-1 justify-center">+ Thêm vào tracker</button>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2 rounded-[7px] text-[13px] font-semibold transition-all flex items-center justify-center gap-2 ${
        active ? 'bg-orange text-white shadow-lg' : 'text-text-1 hover:text-text-0'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-mono text-[11px] text-text-2 uppercase tracking-[0.1em] font-semibold">{label}</div>
      {children}
      {hint && <div className="text-[11.5px] text-text-2">{hint}</div>}
    </div>
  );
}
