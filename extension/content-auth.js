/**
 * Chạy trên topteamtracker.id.vn — đọc Supabase session từ localStorage
 * và lưu access_token vào chrome.storage.local để popup/content dùng.
 */
(function syncAuth() {
  try {
    const key = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (!key) { chrome.storage.local.remove('ttt_access_token'); return; }
    const session = JSON.parse(localStorage.getItem(key) || '{}');
    const token = session?.access_token ?? null;
    if (token) {
      chrome.storage.local.set({ ttt_access_token: token });
    } else {
      chrome.storage.local.remove('ttt_access_token');
    }
  } catch {}
})();
