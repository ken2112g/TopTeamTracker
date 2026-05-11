'use client';

import { Bell, TrendingDown, TrendingUp, Eye, BarChart2, Check } from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  price: <TrendingDown size={18} />,
  sales: <TrendingUp size={18} />,
  views: <Eye size={18} />,
  cvr: <BarChart2 size={18} />,
};

const TYPE_COLORS: Record<string, string> = {
  price: '#f1641e',
  sales: '#84cc16',
  views: '#60a5fa',
  cvr: '#facc15',
};

const MOCK_NOTIFICATIONS = [
  { id: 'n1', icon: '🚀', title: 'Bùng nổ doanh số', body: 'Rainbow Balloon Birthday Romper tăng +134% trong 2 ngày qua', time: '2 giờ trước', read: false },
  { id: 'n2', icon: '💰', title: 'Đối thủ giảm giá', body: 'Bear Themed Birthday Romper giảm từ $26 → $22.99 (-12%)', time: '5 giờ trước', read: false },
  { id: 'n3', icon: '🚀', title: 'Bùng nổ doanh số', body: 'Cake Smash Outfit Boy tăng +168.7% — xu hướng nóng', time: 'Hôm qua', read: true },
  { id: 'n4', icon: '📉', title: 'CVR giảm', body: 'Unicorn First Birthday Romper CVR giảm từ 5.2% → 3.1%', time: '2 ngày trước', read: true },
];

export default function AlertsPage() {
  const { alertRules, toggleAlertRule, showToast, settings } = useAppStore();

  return (
    <div className="p-8 xl:p-10">
      <div className="font-mono text-[11px] text-orange tracking-[0.2em] uppercase mb-3 flex items-center gap-2.5">
        <span className="w-6 h-0.5 bg-orange" />
        Thông báo hệ thống
      </div>
      <h1 className="font-display text-[42px] font-bold tracking-tight leading-tight mb-3">
        Cảnh báo <em className="text-orange not-italic">thông minh</em>
      </h1>
      <p className="text-[15px] text-text-2 leading-relaxed mb-8">
        Quản lý các quy tắc cảnh báo. Khi scraper Phase 2 được kết nối, các cảnh báo này sẽ gửi thông báo thật.
      </p>

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6 items-start">
        {/* Left: Recent notifications */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="font-display text-[18px] font-bold flex items-center gap-2">
              <Bell size={18} className="text-orange" /> Thông báo gần đây
              <span className="ml-1 px-2 py-0.5 rounded-full bg-orange text-white font-mono text-[11px]">
                {MOCK_NOTIFICATIONS.filter((n) => !n.read).length}
              </span>
            </div>
            <span className="font-mono text-[11px] text-text-2 px-2.5 py-1 bg-bg-2 rounded-lg border border-line">Demo data</span>
          </div>

          <div className="flex flex-col gap-2">
            {MOCK_NOTIFICATIONS.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  n.read ? 'border-line bg-bg-0' : 'border-orange/30 bg-orange/5'
                }`}
              >
                <div className="text-2xl leading-none mt-0.5">{n.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className={`font-display text-[14px] font-semibold mb-0.5 ${n.read ? 'text-text-1' : 'text-orange'}`}>
                    {n.title}
                  </div>
                  <div className="text-[12.5px] text-text-2 leading-relaxed">{n.body}</div>
                </div>
                <div className="font-mono text-[11px] text-text-2 shrink-0 mt-0.5">{n.time}</div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-orange shrink-0 mt-1.5" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Alert rules */}
        <div className="card p-6">
          <div className="font-display text-[18px] font-bold mb-1">Quy tắc cảnh báo</div>
          <div className="text-[13px] text-text-2 mb-5">
            Bật/tắt từng loại cảnh báo. Ngưỡng kích hoạt có thể tùy chỉnh.
          </div>

          <div className="flex flex-col gap-3">
            {alertRules.map((rule) => {
              const color = TYPE_COLORS[rule.type];
              return (
                <div
                  key={rule.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    rule.enabled ? 'border-line bg-bg-1' : 'border-line bg-bg-0 opacity-60'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                    style={{ background: color + '20', color }}
                  >
                    {TYPE_ICONS[rule.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[14px] font-semibold mb-0.5 flex items-center gap-2 flex-wrap">
                      <span className="text-lg leading-none">{rule.icon}</span>
                      {rule.label}
                      {rule.enabled && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green text-[10px] font-mono font-semibold">
                          <Check size={9} /> Đang bật
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-text-2">{rule.description}</div>
                  </div>
                  {rule.threshold && (
                    <div className="font-mono text-[12px] px-2.5 py-1 rounded-lg border border-line bg-bg-2 text-text-1 shrink-0">
                      Ngưỡng: <strong>{rule.threshold}</strong>
                    </div>
                  )}
                  <label className="relative inline-block w-12 h-7 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => {
                        toggleAlertRule(rule.id);
                        showToast(
                          rule.enabled ? '🔕 Đã tắt' : '🔔 Đã bật',
                          rule.label,
                          'success'
                        );
                      }}
                      className="peer sr-only"
                    />
                    <span className="absolute inset-0 bg-bg-3 rounded-full transition-all peer-checked:bg-orange peer-checked:shadow-lg peer-checked:shadow-orange/30" />
                    <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-text-1 rounded-full transition-all peer-checked:translate-x-5 peer-checked:bg-white" />
                  </label>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-5 border-t border-dashed border-line flex items-center gap-3 text-[12.5px] text-text-2">
            <div className="w-8 h-8 rounded-lg bg-orange/10 grid place-items-center shrink-0">
              <Bell size={14} className="text-orange" />
            </div>
            <span>
              {alertRules.filter((r) => r.enabled).length} quy tắc đang bật ·{' '}
              {settings.emailDigest ? 'Email digest đang bật' : 'Email digest tắt'} ·{' '}
              Cảnh báo thật sẽ hoạt động từ Phase 2
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
