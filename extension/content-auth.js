/**
 * Chạy trên topteamtracker.id.vn — gọi API để lấy access_token từ session cookie
 * rồi lưu vào chrome.storage.local để popup/content dùng với Bearer auth.
 * (Supabase SSR lưu session trong cookie, không phải localStorage)
 */
// Đánh dấu extension đã cài — trang web đọc attribute này để biết
document.documentElement.setAttribute('data-ttt-ext', 'true');

(async function syncAuth() {
  try {
    const res = await fetch('https://topteamtracker.id.vn/api/extension/token', {
      credentials: 'include',
    });
    if (!res.ok) { chrome.storage.local.remove('ttt_access_token'); return; }
    const { token } = await res.json();
    if (token) {
      chrome.storage.local.set({ ttt_access_token: token });
    } else {
      chrome.storage.local.remove('ttt_access_token');
    }
  } catch {
    chrome.storage.local.remove('ttt_access_token');
  }
})();
