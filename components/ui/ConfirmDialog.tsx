'use client';

import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-[420px] mx-4 bg-bg-1 border border-line rounded-2xl p-7 shadow-2xl animate-slide-up">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-text-2 hover:text-text-0 hover:bg-bg-2 transition-colors"
        >
          <X size={15} />
        </button>

        <div
          className={`w-12 h-12 rounded-[14px] grid place-items-center mb-5 ${
            variant === 'danger' ? 'bg-red-500/10' : 'bg-amber-500/10'
          }`}
        >
          <AlertTriangle
            size={22}
            className={variant === 'danger' ? 'text-accent-red' : 'text-amber-400'}
          />
        </div>

        <h3 className="font-display text-[20px] font-bold mb-2 pr-8">{title}</h3>
        <p className="text-[13.5px] text-text-2 leading-relaxed mb-7">{message}</p>

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`btn ${
              variant === 'danger'
                ? 'border-red-500/30 text-accent-red hover:bg-accent-red hover:text-white hover:border-accent-red'
                : 'btn-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
