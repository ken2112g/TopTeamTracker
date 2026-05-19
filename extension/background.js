/**
 * TopTeamTracker — Background Service Worker (MV3)
 *
 * Extension này chỉ làm một việc: cho phép user CHỌN và LƯU listings
 * vào TopTeamTracker từ trang Etsy search.
 *
 * Harvest (thu thập data hàng ngày) được thực hiện bởi harvest-daemon.mjs
 * trên VPS, quản lý qua Admin Panel tại /admin/harvest.
 */

const TOPTEAMTRACKER_URL = 'https://topteamtracker.id.vn';

// ── Message từ popup ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'PING') {
    sendResponse({ ok: true });
    return false;
  }
});
