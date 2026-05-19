/**
 * TopTeamTracker Chrome Extension — Content Script
 * Inject vào trang Etsy, đọc HeyEtsy data có sẵn, cho phép chọn listing → lưu vào TopTeamTracker
 */

const TOPTEAMTRACKER_URL = 'https://topteamtracker.id.vn';
const EMOJIS = ['🎁', '✨', '🌟', '🎨', '🛍️', '💎', '🌈', '🎀', '🏆', '🌺'];
const COLORS = ['#f1641e', '#a78bfa', '#ef4444', '#84cc16', '#60a5fa', '#facc15', '#ec4899'];

let selected = new Map(); // listingId → data
let toolbarEl = null;
let initialized = false;
let seenIds = new Set();
let cardIndex = 0;
let trackedMap = new Map(); // etsyListingId → [{ collectionId, collectionName, collectionColor }]

// ── Parse ngày từ HeyEtsy ────────────────────────────────────────────────────
function parseHeyDate(raw) {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  // DD/MM/YYYY hoặc MM/DD/YYYY — extract từ bất kỳ đâu trong chuỗi
  const slashDate = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashDate) {
    const [, a, b, y] = slashDate;
    const day = parseInt(a) > 12 ? a.padStart(2, '0') : b.padStart(2, '0');
    const month = parseInt(a) > 12 ? b.padStart(2, '0') : a.padStart(2, '0');
    return new Date(`${y}-${month}-${day}T00:00:00.000Z`).toISOString();
  }
  // YYYY-MM-DD
  const isoDate = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return new Date(`${isoDate[0]}T00:00:00.000Z`).toISOString();
  // today/yesterday
  if (s.includes('today')) return new Date().toISOString();
  if (s.includes('yesterday')) return new Date(Date.now() - 86400000).toISOString();
  // relative: "3 days ago", "2 months ago", "10 hours ago", "1 week ago", v.v.
  const rel = s.match(/(\d+)\s+(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s+ago/);
  if (rel) {
    const n = parseInt(rel[1]);
    const unit = rel[2];
    const ms = unit.startsWith('minute') ? n * 60_000
      : unit.startsWith('hour') ? n * 3_600_000
      : unit.startsWith('day') ? n * 86_400_000
      : unit.startsWith('week') ? n * 7 * 86_400_000
      : unit.startsWith('month') ? n * 30 * 86_400_000
      : n * 365 * 86_400_000;
    return new Date(Date.now() - ms).toISOString();
  }
  return null;
}

// ── Parse HeyEtsy widget từ DOM card ──────────────────────────────────────────
function extractHeyWidget(card) {
  const container = card.querySelector('[data-heyetsy-listing-id]');
  if (!container) {
    // Debug: log thử các selector khác để tìm HeyEtsy container
    const anyHey = card.querySelector('[class*="heyetsy"],[id*="heyetsy"],[data-hey]');
    if (anyHey) console.log('[EtsyPulse] HeyEtsy element found but wrong selector:', anyHey.tagName, anyHey.className, anyHey.id, JSON.stringify(anyHey.dataset));
    return null;
  }

  let soldDaily = 0, viewsDaily = 0, soldTotal = 0, revenue = 0;
  let viewsAvg = 0, viewsTotal = 0, favRate = 0, favorites = 0;
  let created = null, updated = null, revenueCurrency = 'USD', country = null;

  for (const icon of container.querySelectorAll('.heyetsy-icon')) {
    const tooltipEl = icon.querySelector('.heyetsy-tooltip');
    const label = (tooltipEl?.innerText ?? tooltipEl?.textContent ?? '').trim().toLowerCase();
    const paraEl = icon.querySelector('p');
    const valueEl = paraEl ?? tooltipEl?.nextElementSibling;
    const raw = (valueEl?.innerText ?? valueEl?.textContent ?? '').trim();
    const stripped = raw.replace(/\+[^0-9]*$/, '').replace(/[^0-9.km]/gi, '');
    const num = /k$/i.test(stripped)
      ? parseFloat(stripped) * 1000
      : /m$/i.test(stripped) ? parseFloat(stripped) * 1_000_000 : parseFloat(stripped) || 0;

    if (label.includes('sold') && label.includes('24')) soldDaily = num;
    else if (label.includes('total') && (label.includes('sales') || label.includes('sold'))) soldTotal = num;
    else if (label.includes('view') && label.includes('24')) viewsDaily = num;
    else if (label.includes('revenue')) {
      const cur = raw.match(/\b(USD|EUR|GBP|CAD|AUD|VND|JPY)\b/i)?.[1]?.toUpperCase();
      revenueCurrency = cur ?? 'USD';
      revenue = raw === 'N/A' ? 0 : num;
    }
    else if (label.includes('average') && label.includes('view')) viewsAvg = num;
    else if (label.includes('total') && label.includes('view')) viewsTotal = num;
    else if (label.includes('rate of favorites') || (label.includes('favorites') && label.includes('rate'))) {
      favRate = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
    }
    else if (label.includes('number of favorites') || (label.includes('total') && label.includes('favorites'))) favorites = num;
    else if (label.includes('creat')) {
      const d = raw.match(/\d{1,2}\/\d{1,2}\/\d{4}/) ?? raw.match(/\d{4}-\d{2}-\d{2}/);
      created = d?.[0] ?? (raw.length > 0 ? raw : null);
    }
    else if (label.includes('updat') || label.includes('renew')) {
      updated = raw || null;
    }
    else if (label.includes("seller's country") || label.includes('country')) {
      country = label.match(/country[:\s]+(.+)/i)?.[1]?.trim() ?? raw.trim() ?? null;
    }
  }

  // ── Fallback: tìm Created/Updated trong toàn bộ text widget ──────────────
  // HeyEtsy hiển thị các row này trong bảng dưới, không phải icon boxes
  if (!created || !updated) {
    const fullText = (container.innerText ?? container.textContent ?? '');
    if (!created) {
      // "Created   19/05/2024 (1 year)" hoặc "Created\t19/05/2024"
      const m = fullText.match(/Created[\s\t]+(\d{1,2}\/\d{1,2}\/\d{4})/i);
      if (m) created = m[1];
    }
    if (!updated) {
      // "Updated   3 months ago" hoặc "Updated\t10 hours ago"
      const m = fullText.match(/(?:Updated|Renewed)[\s\t]+([^\n\r]+)/i);
      if (m) updated = m[1].trim();
    }
  }

  const hasData = soldTotal > 0 || viewsTotal > 0 || favorites > 0 || revenue > 0 || viewsAvg > 0;
  if (!hasData) return null;
  if (soldTotal === 0 && soldDaily > 0) { soldTotal = soldDaily; soldDaily = 0; }
  if (soldDaily > 0 && soldTotal > 0 && soldDaily > soldTotal) {
    [soldDaily, soldTotal] = [soldTotal, soldDaily];
  }
  return { soldDaily, viewsDaily, soldTotal, revenue, revenueCurrency, viewsAvg, viewsTotal, favRate, favorites, created, updated, country };
}

// ── Extract toàn bộ data từ 1 card ───────────────────────────────────────────
function extractCard(card, idx) {
  const listingId = card.getAttribute('data-listing-id');
  if (!listingId) return null;

  const title = card.querySelector('h3')?.textContent?.trim()
    ?? card.querySelector('a[title]')?.getAttribute('title') ?? '';

  let rawPrice = 0, rawCurrency = 'USD';
  for (const el of card.querySelectorAll('.currency-value')) {
    if (el.closest('[data-heyetsy-listing-id]')) continue;
    const v = parseFloat(el.textContent?.replace(/[^0-9.]/g, '') ?? '0');
    if (v > 0) {
      rawPrice = v;
      const sym = (
        el.previousElementSibling?.textContent ??
        el.parentElement?.querySelector('.currency-symbol')?.textContent ?? '$'
      ).trim();
      if (sym === '₫' || sym === 'đ') rawCurrency = 'VND';
      else if (sym === '€') rawCurrency = 'EUR';
      else if (sym === '£') rawCurrency = 'GBP';
      break;
    }
  }

  const popover = card.querySelector('button[class*="wt-popover__trigger"]')
    ?? card.querySelector('[class*="wt-popover"]');
  const byM = popover?.textContent?.match(/(?:Ad[·•・])?By\s+([^\n\r]+)/);
  const shopName = byM ? byM[1].trim() : 'Unknown Shop';
  const imageUrl = card.querySelector('img')?.src ?? '';
  const cardText = card.textContent ?? '';
  const reviewM = cardText.match(/\(([0-9.,]+[kK]?)\)/);
  const reviewsCount = reviewM
    ? reviewM[1].toLowerCase().includes('k')
      ? Math.floor(parseFloat(reviewM[1]) * 1000)
      : parseInt(reviewM[1].replace(/,/g, '')) || 0
    : 0;
  const ratingM = cardText.match(/(\d+\.\d+)\s*\(/);
  const rating = ratingM ? parseFloat(ratingM[1]) : 4.5;
  const hey = extractHeyWidget(card);

  return {
    etsyListingId: listingId,
    url: `https://www.etsy.com/listing/${listingId}`,
    title: title || `Listing #${listingId}`,
    shopName,
    price: rawPrice,
    currency: rawCurrency,
    rating,
    reviewsCount,
    imageUrl,
    country: hey?.country ?? 'US',
    etsyCreatedAt: parseHeyDate(hey?.created ?? null),
    etsyUpdatedAt: parseHeyDate(hey?.updated ?? null),
    soldTotal: hey?.soldTotal ?? 0,
    revenue: hey?.revenue ?? 0,
    soldDaily: hey?.soldDaily ?? 0,
    viewsDaily: hey?.viewsDaily ?? 0,
    viewsTotal: hey?.viewsTotal ?? 0,
    favorites: hey?.favorites ?? null,
    favRate: hey?.favRate ?? 0,
    isHot: hey ? (hey.soldTotal > 500 || hey.soldDaily > 10) : false,
    hasHeyEtsy: !!hey,
    heyEtsy: hey ?? null,
    emoji: EMOJIS[idx % EMOJIS.length],
  };
}

// ── Load danh sách listing đã được theo dõi ──────────────────────────────────
async function loadTracked() {
  try {
    const res = await fetch(`${TOPTEAMTRACKER_URL}/api/extension/tracked`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return;
    const list = await res.json();
    trackedMap.clear();
    for (const item of list) {
      if (!item.etsyListingId) continue;
      const key = String(item.etsyListingId);
      if (!trackedMap.has(key)) trackedMap.set(key, []);
      trackedMap.get(key).push({
        collectionId: item.collectionId,
        collectionName: item.collectionName,
        collectionColor: item.collectionColor || '#f1641e',
      });
    }
  } catch {}
}

function injectTrackedBadge(card, listingId) {
  if (card.querySelector('.ep-tracked')) return;
  const cols = trackedMap.get(String(listingId));
  if (!cols || cols.length === 0) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'ep-tracked';
  wrapper.style.cssText = `
    position:absolute;top:8px;left:38px;z-index:9999;
    display:flex;align-items:center;gap:4px;flex-wrap:nowrap;
    font-family:system-ui,sans-serif;pointer-events:none;
    max-width:calc(100% - 50px);overflow:hidden;
  `;

  const visible = cols.slice(0, 3);
  const overflow = cols.length - visible.length;

  visible.forEach(c => {
    const chip = document.createElement('span');
    chip.innerHTML = `
      <span style="width:7px;height:7px;border-radius:50%;background:${c.collectionColor || '#f1641e'};flex-shrink:0;box-shadow:0 0 4px ${c.collectionColor || '#f1641e'}99"></span>
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100px">${c.collectionName}</span>
    `;
    chip.style.cssText = `
      display:inline-flex;align-items:center;gap:5px;
      background:rgba(12,10,9,0.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
      border:1px solid rgba(241,100,30,0.45);border-radius:20px;
      padding:4px 9px 4px 7px;font-size:11px;color:#f5f0eb;font-weight:600;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);flex-shrink:0;
    `;
    wrapper.appendChild(chip);
  });

  if (overflow > 0) {
    const more = document.createElement('span');
    more.textContent = `+${overflow}`;
    more.style.cssText = `
      display:inline-flex;align-items:center;
      background:rgba(12,10,9,0.75);border:1px solid rgba(255,255,255,0.15);border-radius:20px;
      padding:4px 8px;font-size:11px;color:#a8978a;font-weight:600;flex-shrink:0;
    `;
    wrapper.appendChild(more);
  }

  card.appendChild(wrapper);
}

// ── Inject checkbox vào card ──────────────────────────────────────────────────
function injectCheckbox(card, listingId, idx) {
  if (card.querySelector('.ep-cb')) return;
  card.style.position = 'relative';

  const cb = document.createElement('div');
  cb.className = 'ep-cb';
  cb.innerHTML = `<svg width="11" height="11" viewBox="0 0 12 12" style="display:none;pointer-events:none"><path d="M2 6 L5 9 L10 3" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  cb.style.cssText = `
    position:absolute;top:8px;left:8px;width:24px;height:24px;border-radius:50%;
    background:rgba(0,0,0,0.6);border:1.5px solid rgba(255,255,255,0.5);
    cursor:pointer;z-index:9999;display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(6px);transition:all 0.15s ease;box-sizing:border-box;
  `;

  cb.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const data = extractCard(card, idx);
    if (!data) return;

    if (selected.has(listingId)) {
      selected.delete(listingId);
      cb.style.background = 'rgba(0,0,0,0.6)';
      cb.style.borderColor = 'rgba(255,255,255,0.5)';
      cb.querySelector('svg').style.display = 'none';
    } else {
      selected.set(listingId, data);
      cb.style.background = '#f1641e';
      cb.style.borderColor = '#f1641e';
      cb.querySelector('svg').style.display = 'block';
    }
    updateToolbar();
  });

  card.appendChild(cb);

  // Badge nếu listing đã được theo dõi
  injectTrackedBadge(card, listingId);
}

// ── Floating toolbar ──────────────────────────────────────────────────────────
function createToolbar() {
  if (toolbarEl) return;
  toolbarEl = document.createElement('div');
  toolbarEl.id = 'ep-toolbar';
  toolbarEl.style.cssText = `
    position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(100px);
    background:#161310;border:1px solid #2a221d;border-radius:18px;
    padding:12px 16px;display:flex;align-items:center;gap:10px;z-index:999999;
    box-shadow:0 8px 32px rgba(0,0,0,0.7),0 0 0 1px rgba(241,100,30,0.15);
    transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s ease;
    font-family:system-ui,sans-serif;pointer-events:none;opacity:0;min-width:320px;
  `;
  toolbarEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">
      <span id="ep-count" style="font-size:20px;font-weight:800;color:#f1641e;font-variant-numeric:tabular-nums;min-width:24px">0</span>
      <span style="font-size:13px;color:#a8978a">sản phẩm đã chọn</span>
    </div>
    <button id="ep-clear" style="
      background:transparent;border:1px solid #3a2e28;color:#a8978a;
      padding:7px 13px;border-radius:10px;cursor:pointer;font-size:12px;
      font-family:inherit;flex-shrink:0;
    ">Bỏ chọn</button>
    <button id="ep-save" style="
      background:#f1641e;border:none;color:white;
      padding:8px 18px;border-radius:11px;cursor:pointer;font-size:13px;font-weight:700;
      font-family:inherit;flex-shrink:0;
    ">Lưu vào TopTeamTracker →</button>
  `;
  document.body.appendChild(toolbarEl);

  toolbarEl.querySelector('#ep-clear').addEventListener('click', () => {
    selected.clear();
    document.querySelectorAll('.ep-cb').forEach(cb => {
      cb.style.background = 'rgba(0,0,0,0.6)';
      cb.style.borderColor = 'rgba(255,255,255,0.5)';
      cb.querySelector('svg').style.display = 'none';
    });
    updateToolbar();
  });

  toolbarEl.querySelector('#ep-save').addEventListener('click', openSaveDialog);
}

function updateToolbar() {
  if (!toolbarEl) createToolbar();
  const n = selected.size;
  toolbarEl.querySelector('#ep-count').textContent = n;
  if (n > 0) {
    toolbarEl.style.transform = 'translateX(-50%) translateY(0)';
    toolbarEl.style.opacity = '1';
    toolbarEl.style.pointerEvents = 'all';
  } else {
    toolbarEl.style.transform = 'translateX(-50%) translateY(100px)';
    toolbarEl.style.opacity = '0';
    toolbarEl.style.pointerEvents = 'none';
  }
}

// ── Helpers: recently used collections ───────────────────────────────────────
function getRecentColIds() {
  try { return JSON.parse(localStorage.getItem('ep_recent_cols') || '[]'); } catch { return []; }
}
function pushRecentColId(id) {
  const ids = [id, ...getRecentColIds().filter(x => x !== id)].slice(0, 5);
  try { localStorage.setItem('ep_recent_cols', JSON.stringify(ids)); } catch {}
}

// ── Save dialog ───────────────────────────────────────────────────────────────
async function openSaveDialog() {
  let collections = [];
  try {
    const res = await fetch(`${TOPTEAMTRACKER_URL}/api/extension/collections`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) collections = await res.json();
  } catch { /* TopTeamTracker chưa chạy */ }

  const keyword = new URLSearchParams(window.location.search).get('q') ?? '';
  const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];

  const overlay = document.createElement('div');
  overlay.id = 'ep-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999999;
    display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(6px);font-family:system-ui,sans-serif;
  `;

  overlay.innerHTML = `
    <div style="
      background:#161310;border:1px solid #2a221d;border-radius:22px;
      padding:28px;width:420px;max-width:calc(100vw - 32px);
      box-shadow:0 32px 80px rgba(0,0,0,0.8);
    ">
      <div style="font-size:21px;font-weight:800;color:#f5f0eb;margin-bottom:4px">Lưu vào TopTeamTracker</div>
      <div style="font-size:13px;color:#a8978a;margin-bottom:22px">
        <span style="color:#f1641e;font-weight:700">${selected.size}</span> sản phẩm đã chọn
        ${keyword ? `· từ khóa <span style="color:#f1641e">"${keyword}"</span>` : ''}
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px">

        <!-- Auto theo keyword -->
        <button id="ep-d-auto" style="
          display:flex;align-items:center;gap:14px;padding:14px 16px;
          border-radius:14px;border:1px solid #2a221d;background:#1f1a16;
          cursor:pointer;text-align:left;transition:border-color 0.15s;
        ">
          <div style="width:42px;height:42px;border-radius:12px;background:#f1641e22;border:1px solid #f1641e44;display:grid;place-items:center;flex-shrink:0;font-size:20px">🔍</div>
          <div style="min-width:0">
            <div style="font-size:14px;font-weight:700;color:#f5f0eb">Tạo mới theo từ khóa</div>
            <div style="font-size:12px;color:#f1641e;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${keyword || 'search hiện tại'}</div>
          </div>
        </button>

        <!-- Tên tùy chỉnh -->
        <div style="padding:14px 16px;border-radius:14px;border:1px solid #2a221d;background:#1f1a16">
          <div style="font-size:11px;color:#a8978a;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.12em">Tên tự đặt</div>
          <div style="display:flex;gap:8px">
            <input id="ep-d-name" placeholder="vd: Birthday Romper Top" style="
              flex:1;padding:9px 12px;border-radius:10px;
              background:#0c0a09;border:1px solid #2a221d;color:#f5f0eb;
              font-size:13px;outline:none;font-family:inherit;transition:border-color 0.15s;
            " />
            <button id="ep-d-custom" style="
              background:#f1641e;border:none;color:white;padding:9px 16px;
              border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;
              font-family:inherit;white-space:nowrap;
            ">Tạo →</button>
          </div>
        </div>

        ${collections.length > 0 ? `
        <!-- Collections có sẵn — rendered by JS -->
        <div id="ep-col-panel" style="border-radius:14px;border:1px solid #2a221d;background:#1f1a16;overflow:hidden">
          <div style="padding:10px 16px 8px;display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:11px;color:#a8978a;text-transform:uppercase;letter-spacing:0.12em">Thêm vào có sẵn</span>
            <span style="font-size:11px;color:#6b5744">${collections.length} collections</span>
          </div>
          <div style="padding:0 8px 6px">
            <div style="position:relative">
              <input id="ep-col-search" placeholder="Tìm nhanh collection..." autocomplete="off" style="
                width:100%;padding:8px 10px 8px 30px;border-radius:9px;box-sizing:border-box;
                background:#0c0a09;border:1px solid #2a221d;color:#f5f0eb;
                font-size:12.5px;outline:none;font-family:inherit;transition:border-color 0.15s;
              "/>
              <span style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:#6b5744;pointer-events:none;font-size:13px">🔍</span>
            </div>
          </div>
          <div id="ep-col-list" style="max-height:210px;overflow-y:auto;padding:0 8px 8px"></div>
        </div>
        ` : ''}
      </div>

      <button id="ep-d-cancel" style="
        width:100%;padding:11px;border-radius:12px;
        border:1px solid #2a221d;background:transparent;
        color:#a8978a;cursor:pointer;font-size:13px;font-family:inherit;
      ">Hủy</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // ── Collection list renderer ─────────────────────────────────────────────────
  const colList = overlay.querySelector('#ep-col-list');
  const colSearch = overlay.querySelector('#ep-col-search');

  if (colList && collections.length > 0) {
    const recentIds = getRecentColIds();

    function colRow(c, isRecent) {
      const btn = document.createElement('button');
      btn.className = 'ep-d-col';
      btn.dataset.id = c.id;
      btn.dataset.name = c.name;
      btn.style.cssText = `
        width:100%;display:flex;align-items:center;gap:10px;padding:9px 10px;
        border-radius:10px;border:none;background:transparent;
        cursor:pointer;text-align:left;font-family:system-ui,sans-serif;
        transition:background 0.12s;
      `;
      btn.innerHTML = `
        <span style="width:10px;height:10px;border-radius:50%;background:${c.color};flex-shrink:0"></span>
        <span style="font-size:13px;color:#f5f0eb;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</span>
        ${isRecent ? '<span style="font-size:10px;color:#f1641e;flex-shrink:0;background:rgba(241,100,30,0.12);padding:2px 6px;border-radius:6px;border:1px solid rgba(241,100,30,0.25)">recent</span>' : ''}
        <span style="font-size:11px;color:#6b5744;flex-shrink:0">${c.listingsCount ?? 0} SP</span>
      `;
      btn.addEventListener('mouseenter', () => btn.style.background = '#f1641e11');
      btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
      btn.addEventListener('click', () => {
        overlay.remove();
        saveToTracker(c.id, c.name, keyword, null);
      });
      return btn;
    }

    function renderColList(query) {
      colList.innerHTML = '';
      const q = query.trim().toLowerCase();

      let results;
      if (q) {
        // Search mode: filter toàn bộ, hiện tối đa 20
        results = collections.filter(c => c.name.toLowerCase().includes(q)).slice(0, 20);
      } else {
        // Default: recents trước, sau đó fill tới 8
        const recentCols = recentIds.map(id => collections.find(c => c.id === id)).filter(Boolean);
        const recentSet = new Set(recentIds);
        const others = collections.filter(c => !recentSet.has(c.id));
        const fill = Math.max(0, 8 - recentCols.length);
        results = [...recentCols.map(c => ({ c, isRecent: true })), ...others.slice(0, fill).map(c => ({ c, isRecent: false }))];

        if (recentCols.length > 0) {
          const sep = document.createElement('div');
          sep.style.cssText = 'font-size:10px;color:#6b5744;text-transform:uppercase;letter-spacing:0.1em;padding:4px 10px 2px;font-weight:600';
          sep.textContent = 'Dùng gần đây';
          colList.appendChild(sep);
          recentCols.forEach(c => colList.appendChild(colRow(c, true)));

          if (others.length > 0) {
            const sep2 = document.createElement('div');
            sep2.style.cssText = 'font-size:10px;color:#6b5744;text-transform:uppercase;letter-spacing:0.1em;padding:6px 10px 2px;font-weight:600;border-top:1px solid #2a221d;margin-top:4px';
            sep2.textContent = 'Tất cả';
            colList.appendChild(sep2);
            others.slice(0, fill).forEach(c => colList.appendChild(colRow(c, false)));
          }
        } else {
          collections.slice(0, 8).forEach(c => colList.appendChild(colRow(c, false)));
        }

        // Footer hint nếu còn nhiều hơn
        const remaining = collections.length - 8;
        if (remaining > 0 && !q) {
          const hint = document.createElement('div');
          hint.style.cssText = 'text-align:center;padding:6px 10px 2px;font-size:11.5px;color:#6b5744';
          hint.textContent = `+ ${remaining} collections khác — gõ để tìm`;
          colList.appendChild(hint);
        }
        return;
      }

      if (results.length === 0) {
        colList.innerHTML = '<div style="padding:14px;text-align:center;color:#6b5744;font-size:12.5px">Không tìm thấy</div>';
        return;
      }
      results.forEach(c => colList.appendChild(colRow(c, false)));
    }

    renderColList('');

    let debounceTimer;
    colSearch.addEventListener('input', e => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => renderColList(e.target.value), 120);
    });
    colSearch.addEventListener('focus', () => colSearch.style.borderColor = '#f1641e');
    colSearch.addEventListener('blur', () => colSearch.style.borderColor = '#2a221d');
  }

  // ── Static actions ───────────────────────────────────────────────────────────
  const autoBtn = overlay.querySelector('#ep-d-auto');
  autoBtn.addEventListener('mouseenter', () => autoBtn.style.borderColor = '#f1641e66');
  autoBtn.addEventListener('mouseleave', () => autoBtn.style.borderColor = '#2a221d');

  const nameInput = overlay.querySelector('#ep-d-name');
  nameInput.addEventListener('focus', () => nameInput.style.borderColor = '#f1641e');
  nameInput.addEventListener('blur', () => nameInput.style.borderColor = '#2a221d');
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') overlay.querySelector('#ep-d-custom').click(); });

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#ep-d-cancel').addEventListener('click', () => overlay.remove());

  function findConflict(name) {
    return collections.find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase()) ?? null;
  }

  autoBtn.addEventListener('click', () => {
    const name = keyword || 'TopTeamTracker Search';
    const conflict = findConflict(name);
    if (conflict) { showConflictUI(overlay.children[0], conflict, keyword, randomColor); return; }
    overlay.remove();
    saveToTracker(null, name, keyword, randomColor);
  });

  overlay.querySelector('#ep-d-custom').addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    const conflict = findConflict(name);
    if (conflict) { showConflictUI(overlay.children[0], conflict, keyword, randomColor); return; }
    overlay.remove();
    saveToTracker(null, name, keyword, randomColor);
  });
}

// ── Conflict UI khi tên collection bị trùng ──────────────────────────────────
function showConflictUI(dialogBox, existingCol, keyword, randomColor) {
  const name = existingCol.name;
  const count = existingCol.listingsCount ?? 0;
  dialogBox.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <div style="width:44px;height:44px;border-radius:12px;background:#facc1520;border:1px solid #facc1544;display:grid;place-items:center;flex-shrink:0;font-size:22px">⚠️</div>
      <div>
        <div style="font-size:17px;font-weight:800;color:#f5f0eb">Tên đã được dùng</div>
        <div style="font-size:13px;color:#a8978a;margin-top:3px">
          "<span style="color:#f1641e;font-weight:600">${name}</span>" · ${count} sản phẩm
        </div>
      </div>
    </div>
    <div style="font-size:13px;color:#a8978a;margin-bottom:18px;line-height:1.5">
      Collection <span style="color:#f5f0eb;font-weight:600">"${name}"</span> đã tồn tại.
      Bạn muốn thêm vào đó hay đặt lại tên mới?
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
      <button id="ep-c-use" style="
        padding:13px 16px;border-radius:13px;border:none;
        background:#f1641e;color:white;cursor:pointer;
        font-size:14px;font-weight:700;font-family:inherit;
      ">Thêm ${selected.size} SP vào collection này →</button>
      <button id="ep-c-rename" style="
        padding:12px 16px;border-radius:13px;
        border:1px solid #3a2e28;background:transparent;
        color:#f5f0eb;cursor:pointer;font-size:13px;font-family:inherit;
      ">Đặt lại tên khác</button>
    </div>
    <button id="ep-c-cancel" style="
      width:100%;padding:11px;border-radius:12px;
      border:1px solid #2a221d;background:transparent;
      color:#a8978a;cursor:pointer;font-size:13px;font-family:inherit;
    ">Hủy</button>
  `;
  dialogBox.querySelector('#ep-c-use').addEventListener('click', () => {
    dialogBox.closest('#ep-overlay').remove();
    saveToTracker(existingCol.id, existingCol.name, keyword, null);
  });
  dialogBox.querySelector('#ep-c-rename').addEventListener('click', () => {
    dialogBox.closest('#ep-overlay').remove();
    openSaveDialog();
  });
  dialogBox.querySelector('#ep-c-cancel').addEventListener('click', () => {
    dialogBox.closest('#ep-overlay').remove();
  });
}

// ── Gọi TopTeamTracker API ────────────────────────────────────────────────────
async function saveToTracker(collectionId, collectionName, keyword, color) {
  showToast(`⏳ Đang lưu ${selected.size} sản phẩm...`, '#3b82f6');

  // Re-read mỗi card ngay trước khi gửi để lấy HeyEtsy data mới nhất
  // (HeyEtsy inject widget async, có thể chưa xong lúc user tick checkbox)
  const freshListings = [];
  let idx = 0;
  for (const [listingId, cachedData] of selected.entries()) {
    const card = document.querySelector(`[data-listing-id="${listingId}"]`);
    const fresh = card ? extractCard(card, idx) : null;
    // Nếu fresh có HeyEtsy data thì dùng fresh, không thì fallback về cached
    if (fresh && fresh.hasHeyEtsy && !cachedData.hasHeyEtsy) {
      freshListings.push(fresh);
    } else if (fresh && !cachedData.hasHeyEtsy) {
      // Merge: giữ emoji/idx từ cached, lấy data từ fresh
      freshListings.push({ ...cachedData, ...fresh, emoji: cachedData.emoji });
    } else {
      freshListings.push(cachedData);
    }
    idx++;
  }

  try {
    const res = await fetch(`${TOPTEAMTRACKER_URL}/api/extension/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collectionId,
        collectionName,
        keyword,
        color,
        listings: freshListings,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const json = await res.json();
    if (res.ok) {
      const dupMsg = json.duplicates > 0 ? ` · ${json.duplicates} trùng (bỏ qua)` : '';
      const failMsg = json.failed > 0 ? ` · ${json.failed} lỗi` : '';
      showToast(`✅ Đã lưu ${json.saved} SP mới vào "${json.collectionName}"${dupMsg}${failMsg}`, json.saved > 0 ? '#22c55e' : '#f97316');

      // Cập nhật trackedMap + badge ngay lập tức
      if (json.saved > 0 && json.collectionId) {
        pushRecentColId(json.collectionId);
        for (const [listingId] of selected.entries()) {
          const tKey = String(listingId);
          if (!trackedMap.has(tKey)) trackedMap.set(tKey, []);
          const already = trackedMap.get(tKey).some(t => t.collectionId === json.collectionId);
          if (!already) {
            trackedMap.get(tKey).push({
              collectionId: json.collectionId,
              collectionName: json.collectionName,
              collectionColor: '#f1641e',
            });
          }
          const card = document.querySelector(`[data-listing-id="${String(listingId)}"]`);
          if (card) {
            card.querySelector('.ep-tracked')?.remove();
            injectTrackedBadge(card, String(listingId));
          }
        }
      }

      selected.clear();
      document.querySelectorAll('.ep-cb').forEach(cb => {
        cb.style.background = 'rgba(0,0,0,0.6)';
        cb.style.borderColor = 'rgba(255,255,255,0.5)';
        cb.querySelector('svg').style.display = 'none';
      });
      updateToolbar();
    } else {
      showToast(`❌ Lỗi: ${json.error ?? 'Không thể lưu'}`, '#ef4444');
    }
  } catch {
    showToast('❌ TopTeamTracker chưa chạy. Mở https://topteamtracker.id.vn trước.', '#ef4444');
  }
}

// ── Toast notification ────────────────────────────────────────────────────────
function showToast(msg, color = '#f1641e') {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;top:18px;right:18px;z-index:99999999;
    background:#161310;border:1px solid ${color}44;border-left:3px solid ${color};
    padding:11px 16px;border-radius:12px;color:#f5f0eb;font-size:13px;font-weight:500;
    box-shadow:0 8px 28px rgba(0,0,0,0.6);max-width:360px;line-height:1.5;
    font-family:system-ui,sans-serif;
    animation:ep-in 0.2s cubic-bezier(0.34,1.56,0.64,1);
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 3500);
}

// ── Inject checkboxes vào tất cả cards ────────────────────────────────────────
function processCards() {
  document.querySelectorAll('[data-listing-id]').forEach(card => {
    const id = card.getAttribute('data-listing-id');
    if (!id || seenIds.has(id)) return;
    seenIds.add(id);
    injectCheckbox(card, id, cardIndex++);
  });
}

// ── CSS animation ─────────────────────────────────────────────────────────────
function injectStyle() {
  if (document.getElementById('ep-style')) return;
  const s = document.createElement('style');
  s.id = 'ep-style';
  s.textContent = `@keyframes ep-in{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}`;
  document.head.appendChild(s);
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  if (initialized) return;
  initialized = true;
  injectStyle();
  await loadTracked(); // load tracked trước để badge hiện đúng
  processCards();
  createToolbar();

  // Watch thêm card (infinite scroll, pagination)
  const obs = new MutationObserver(() => processCards());
  obs.observe(document.body, { childList: true, subtree: true });
}

// SPA navigation (Etsy dùng client-side routing)
let lastHref = location.href;
new MutationObserver(() => {
  if (location.href === lastHref) return;
  lastHref = location.href;
  initialized = false;
  seenIds.clear();
  cardIndex = 0;
  selected.clear();
  if (toolbarEl) { toolbarEl.remove(); toolbarEl = null; }
  setTimeout(init, 600);
}).observe(document.body, { childList: true, subtree: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
