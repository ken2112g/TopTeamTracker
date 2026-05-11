'use client';

import { useAppStore } from '@/lib/store/useAppStore';
import { CheckCircle, XCircle, Info } from 'lucide-react';

export default function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);

  return (
    <div className="fixed top-6 right-6 z-[1000] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => {
        const Icon = t.type === 'success' ? CheckCircle : t.type === 'error' ? XCircle : Info;
        const color = t.type === 'success' ? 'text-accent-green' : t.type === 'error' ? 'text-accent-red' : 'text-orange';
        const borderColor = t.type === 'success' ? 'border-accent-green' : t.type === 'error' ? 'border-accent-red' : 'border-orange';

        return (
          <div
            key={t.id}
            className={`bg-bg-2/95 backdrop-blur-xl border ${borderColor} border-l-4 rounded-xl px-4 py-3.5 min-w-[300px] max-w-[400px] shadow-2xl flex items-start gap-3 animate-slide-up pointer-events-auto`}
          >
            <Icon size={18} className={`${color} flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <div className="font-display font-bold text-[14px] mb-0.5">{t.title}</div>
              {t.message && <div className="text-[12.5px] text-text-1 leading-relaxed">{t.message}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
