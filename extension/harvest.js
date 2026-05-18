/**
 * TopTeamTracker — Harvest Content Script
 * Chạy trên trang listing detail (https://www.etsy.com/listing/* và /vi/listing/* ...)
 * Được gọi bởi background service worker để lấy HeyEtsy data
 */

// ── Idempotent install guard ──────────────────────────────────────────────────
// Tránh đăng ký listener 2 lần khi extension reload hoặc tab điều hướng nội bộ
if (window.__heyEtsyHarvestInstalled) {
  // Đã cài đặt rồi — bỏ qua
} else {
  window.__heyEtsyHarvestInstalled = true;

  const HEYETSY_WAIT_MS = 15000; // Chờ tối đa 15s cho HeyEtsy widget load
  const HEYETSY_POLL_MS = 300;   // Poll mỗi 300ms

  // ── Phát hiện trang challenge ngay từ DOM (sớm hơn background detect) ──────
  function isChallengeDom() {
    const title = (document.title ?? '').toLowerCase();
    if (title.includes('challenge') || title.includes('captcha') || title.includes('attention required')) return true;
    if (document.querySelector('#challenge-form, .challenge-form, [data-translate="checking_browser"]')) return true;
    return false;
  }

  // ── Parse ngày HeyEtsy ──────────────────────────────────────────────────────
  function parseHeyDate(raw) {
    if (!raw) return null;
    const slashDate = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashDate) {
      const [, a, b, y] = slashDate;
      const day = parseInt(a) > 12 ? a.padStart(2, '0') : b.padStart(2, '0');
      const month = parseInt(a) > 12 ? b.padStart(2, '0') : a.padStart(2, '0');
      return new Date(`${y}-${month}-${day}T00:00:00.000Z`).toISOString();
    }
    const isoDate = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoDate) return new Date(`${isoDate[0]}T00:00:00.000Z`).toISOString();
    const s = raw.toLowerCase().trim();
    if (s.includes('today')) return new Date().toISOString();
    if (s.includes('yesterday')) return new Date(Date.now() - 86400000).toISOString();
    const rel = s.match(/(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/);
    if (rel) {
      const n = parseInt(rel[1]);
      const unit = rel[2];
      const ms = unit === 'minute' ? n * 60_000
        : unit === 'hour' ? n * 3_600_000
        : unit === 'day' ? n * 86_400_000
        : unit === 'week' ? n * 7 * 86_400_000
        : unit === 'month' ? n * 30 * 86_400_000
        : n * 365 * 86_400_000;
      return new Date(Date.now() - ms).toISOString();
    }
    return null;
  }

  // ── Parse number an toàn (không bao giờ trả NaN) ───────────────────────────
  function safeNum(raw) {
    if (raw == null) return 0;
    const s = String(raw).trim();
    if (!s || s === 'N/A') return 0;
    const stripped = s.replace(/\+[^0-9]*$/, '').replace(/[^0-9.km]/gi, '');
    if (!stripped) return 0;
    const base = parseFloat(stripped);
    if (!isFinite(base)) return 0;
    if (/k$/i.test(stripped)) return base * 1000;
    if (/m$/i.test(stripped)) return base * 1_000_000;
    return base;
  }

  // ── Trích xuất HeyEtsy widget ───────────────────────────────────────────────
  function extractHeyWidget() {
    const container = document.querySelector('[data-heyetsy-listing-id]');
    if (!container) return null;

    let soldDaily = 0, viewsDaily = 0, soldTotal = 0, revenue = 0;
    let viewsAvg = 0, viewsTotal = 0, favorites = 0;
    let created = null, updated = null, country = null;

    for (const icon of container.querySelectorAll('.heyetsy-icon')) {
      const tooltipEl = icon.querySelector('.heyetsy-tooltip');
      const label = (tooltipEl?.innerText ?? tooltipEl?.textContent ?? '').trim().toLowerCase();
      const paraEl = icon.querySelector('p');
      const valueEl = paraEl ?? tooltipEl?.nextElementSibling;
      const raw = (valueEl?.innerText ?? valueEl?.textContent ?? '').trim();
      const num = safeNum(raw);

      if (label.includes('sold') && label.includes('24')) soldDaily = num;
      else if (label.includes('total') && (label.includes('sales') || label.includes('sold'))) soldTotal = num;
      else if (label.includes('view') && label.includes('24')) viewsDaily = num;
      else if (label.includes('revenue')) revenue = raw === 'N/A' ? 0 : num;
      else if (label.includes('average') && label.includes('view')) viewsAvg = num;
      else if (label.includes('total') && label.includes('view')) viewsTotal = num;
      else if (label.includes('number of favorites') || (label.includes('total') && label.includes('favorites'))) favorites = num;
      else if (label.includes('creat')) {
        const d = raw.match(/\d{1,2}\/\d{1,2}\/\d{4}/) ?? raw.match(/\d{4}-\d{2}-\d{2}/);
        created = d?.[0] ?? null;
      }
      else if (label.includes('updat') || label.includes('renew')) updated = raw || null;
      else if (label.includes('country')) {
        country = label.match(/country[:\s]+(.+)/i)?.[1]?.trim() ?? raw.trim() ?? null;
      }
    }

    // Fallback: tìm trong toàn bộ text widget
    if (!created || !updated) {
      const fullText = container.innerText ?? container.textContent ?? '';
      if (!created) {
        const m = fullText.match(/Created[\s\t]+(\d{1,2}\/\d{1,2}\/\d{4})/i);
        if (m) created = m[1];
      }
      if (!updated) {
        const m = fullText.match(/(?:Updated|Renewed)[\s\t]+([^\n\r]+)/i);
        if (m) updated = m[1].trim();
      }
    }

    if (soldTotal === 0 && soldDaily > 0) { soldTotal = soldDaily; soldDaily = 0; }
    if (soldDaily > 0 && soldTotal > 0 && soldDaily > soldTotal) {
      [soldDaily, soldTotal] = [soldTotal, soldDaily];
    }

    const hasData = soldTotal > 0 || viewsTotal > 0 || favorites > 0 || revenue > 0 || viewsAvg > 0;
    if (!hasData) return null;

    return { soldDaily, viewsDaily, soldTotal, revenue, viewsAvg, viewsTotal, favorites, created, updated, country };
  }

  // ── Trích xuất data cơ bản từ trang listing ─────────────────────────────────
  function extractPageData() {
    // Price — thử nhiều selector
    let price = 0;
    const priceSelectors = [
      '.currency-value',
      '[data-buy-box-region="price"] .currency-value',
      '[data-selector="price-only"] .currency-value',
      'p[data-selector="price-only"]',
      'meta[itemprop="price"]',
    ];
    for (const sel of priceSelectors) {
      for (const el of document.querySelectorAll(sel)) {
        const txt = el.getAttribute('content') ?? el.textContent ?? '';
        const v = parseFloat(txt.replace(/[^0-9.]/g, ''));
        if (isFinite(v) && v > 0) { price = v; break; }
      }
      if (price > 0) break;
    }

    // Rating — multiple fallbacks
    const bodyText = document.body?.innerText ?? '';
    const ratingEl = document.querySelector('[data-rating-value]')
      ?? document.querySelector('input[name="rating"]');
    const ratingAttr = ratingEl?.getAttribute?.('data-rating-value') ?? ratingEl?.value;
    const ratingText = ratingAttr
      ?? bodyText.match(/(\d+\.\d+)\s*out of 5/)?.[1]
      ?? bodyText.match(/(\d+\.\d+)\s*\(/)?.[1]
      ?? '0';
    const parsedRating = parseFloat(ratingText);
    const rating = isFinite(parsedRating) && parsedRating > 0 && parsedRating <= 5 ? parsedRating : 0;

    // Reviews count
    const reviewsText = bodyText.match(/\(([0-9,]+[kK]?)\s*review/i)?.[1] ?? '0';
    const reviewsCount = reviewsText.toLowerCase().includes('k')
      ? Math.floor(parseFloat(reviewsText) * 1000)
      : parseInt(reviewsText.replace(/,/g, '')) || 0;

    // Favorites trên trang
    const favText = bodyText.match(/([0-9,]+[kK]?)\s*(?:person|people).*?(?:favor|love)/i)?.[1] ?? '0';
    const pageFavorites = favText.toLowerCase().includes('k')
      ? Math.floor(parseFloat(favText) * 1000)
      : parseInt(favText.replace(/,/g, '')) || 0;

    return {
      price: isFinite(price) ? price : 0,
      rating: isFinite(rating) ? rating : 0,
      reviewsCount: isFinite(reviewsCount) ? reviewsCount : 0,
      pageFavorites: isFinite(pageFavorites) ? pageFavorites : 0,
    };
  }

  // ── Main: lắng nghe message từ background ──────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type !== 'HARVEST_REQUEST') return false;

    // Challenge page → trả về ok:false ngay, background sẽ treat là lỗi
    if (isChallengeDom()) {
      sendResponse({ ok: false, reason: 'challenge' });
      return false;
    }

    const startTime = Date.now();
    let responded = false;

    function safeRespond(payload) {
      if (responded) return;
      responded = true;
      try { sendResponse(payload); } catch { /* channel đã đóng */ }
    }

    function tryExtract() {
      if (responded) return;

      const hey = extractHeyWidget();
      const page = extractPageData();

      if (hey) {
        safeRespond({
          ok: true,
          data: {
            soldDaily: hey.soldDaily,
            viewsDaily: hey.viewsDaily,
            soldTotal: hey.soldTotal,
            viewsTotal: hey.viewsTotal,
            revenueUsd: hey.revenue,
            price: page.price || 0,
            rating: page.rating || 0,
            reviewsCount: page.reviewsCount || 0,
            favorites: hey.favorites || page.pageFavorites || null,
            etsyCreatedAt: parseHeyDate(hey.created),
            etsyUpdatedAt: parseHeyDate(hey.updated),
            source: 'heyetsy',
            confidence: 0.9,
          },
        });
        return;
      }

      if (Date.now() - startTime < HEYETSY_WAIT_MS) {
        setTimeout(tryExtract, HEYETSY_POLL_MS);
      } else {
        // Timeout: gửi data cơ bản không có HeyEtsy (estimate)
        safeRespond({
          ok: true,
          data: {
            soldDaily: 0, viewsDaily: 0, soldTotal: 0, viewsTotal: 0, revenueUsd: 0,
            price: page.price || 0,
            rating: page.rating || 0,
            reviewsCount: page.reviewsCount || 0,
            favorites: page.pageFavorites || null,
            source: 'estimate',
            confidence: 0.4,
          },
        });
      }
    }

    tryExtract();
    return true; // giữ message channel mở cho async sendResponse
  });
}
