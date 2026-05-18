'use client';

import { X, Puzzle, CheckCircle2, Copy, Download, ExternalLink } from 'lucide-react';
import { useState } from 'react';

const DRIVE_LINK = 'https://drive.google.com/drive/folders/1LfYtmEAFavEKCpWh418896GhGMzXXiCm?usp=sharing';

export default function InstallExtensionModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-1 border border-line rounded-2xl w-full max-w-[480px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-line flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange/15 border border-orange/30 grid place-items-center shrink-0">
            <Puzzle size={22} className="text-orange" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-[20px] font-bold tracking-tight">Cài Extension Chrome</div>
            <div className="text-[13px] text-text-2 mt-1 leading-relaxed">
              Chọn sản phẩm trực tiếp từ Etsy và lưu vào EtsyPulse chỉ bằng 1 click.
            </div>
          </div>
          <button onClick={onClose} className="text-text-2 hover:text-text-0 transition-colors mt-0.5 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 flex flex-col gap-3">

          <Step number={1} title="Tải extension về máy">
            <a
              href={DRIVE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-xl bg-orange/10 border border-orange/30 text-orange hover:bg-orange/18 hover:border-orange/50 transition-all text-[13px] font-semibold"
            >
              <Download size={14} />
              Mở Google Drive để tải
              <ExternalLink size={11} className="opacity-60" />
            </a>
          </Step>

          <Step number={2} title="Mở trang Extensions của Chrome">
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 bg-bg-0 border border-line rounded-lg px-3 py-2 text-[12.5px] font-mono text-orange truncate">
                chrome://extensions/
              </code>
              <button
                onClick={() => copy('chrome://extensions/')}
                className={`p-2 rounded-lg border transition-all shrink-0 ${
                  copied ? 'bg-green/15 border-green/40 text-green' : 'bg-bg-2 border-line text-text-2 hover:text-orange hover:border-orange'
                }`}
                title="Copy"
              >
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </Step>

          <Step number={3} title='Bật "Developer mode"'>
            <p className="text-[12.5px] text-text-2 mt-1.5 leading-relaxed">
              Toggle <span className="text-text-0 font-medium">"Developer mode"</span> ở góc trên bên phải — bật lên.
            </p>
          </Step>

          <Step number={4} title='Kéo file .zip vào trang hoặc click "Load unpacked"'>
            <p className="text-[12.5px] text-text-2 mt-1.5 leading-relaxed">
              Kéo thả file vừa tải thẳng vào trang, hoặc click{' '}
              <span className="text-text-0 font-medium">"Load unpacked"</span> rồi chọn thư mục đã giải nén.
            </p>
          </Step>

        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="bg-accent-green/8 border border-accent-green/20 rounded-xl px-4 py-3 flex items-start gap-3">
            <CheckCircle2 size={16} className="text-accent-green mt-0.5 shrink-0" />
            <p className="text-[12.5px] text-text-1 leading-relaxed">
              Sau khi cài xong, vào <span className="font-mono text-orange">Cài đặt</span> để lấy token và dán vào popup của extension.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full mt-3 py-3 rounded-xl bg-orange hover:bg-orange-bright text-white font-bold text-[14px] transition-colors"
          >
            Đã hiểu, đóng lại
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 p-4 bg-bg-2 rounded-xl border border-line">
      <div className="w-7 h-7 rounded-full bg-orange/15 border border-orange/30 grid place-items-center shrink-0 mt-0.5">
        <span className="font-mono text-[12px] font-bold text-orange">{number}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-text-0">{title}</div>
        {children}
      </div>
    </div>
  );
}
