'use client';

import { Plus, RotateCw } from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import UserMenu from '@/components/layout/UserMenu';

export default function Topbar() {
  const { setAddModalOpen, showToast } = useAppStore();

  return (
    <div className="flex items-center gap-3 px-9 py-3 border-b border-line bg-bg-1/60 backdrop-blur-xl sticky top-0 z-10">
      <div className="flex-1" />

      <button onClick={() => setAddModalOpen(true)} className="btn btn-primary text-[13px]">
        <Plus size={16} />
        Thêm sản phẩm
      </button>

      <button
        onClick={() => showToast('Đã làm mới', 'Cập nhật xong dữ liệu', 'success')}
        className="w-9 h-9 rounded-[10px] bg-bg-2 border border-line grid place-items-center text-text-1 hover:text-orange hover:border-orange hover:rotate-180 transition-all duration-500"
        title="Làm mới"
      >
        <RotateCw size={16} />
      </button>

      <UserMenu />
    </div>
  );
}
