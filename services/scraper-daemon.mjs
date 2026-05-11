/**
 * EtsyPulse Scraper Daemon
 *
 * Chạy: npm run daemon  (terminal riêng, song song với npm run dev)
 *
 * Chức năng:
 *  - Giữ Playwright Chromium mở 24/7 với persistent profile (cookie không mất)
 *  - Tự động warmup etsy.com để DataDome cấp cookie hợp lệ
 *  - Tự refresh mỗi 90 phút để cookie không hết hạn
 *  - HTTP API trên :3001 để Next.js lấy cookie / data
 *
 * API:
 *  GET /health          → trạng thái daemon
 *  GET /cookie          → DataDome cookie hiện tại
 *  GET /search?q=...&limit=...  → search Etsy (fetch + cheerio, nhanh)
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createServer } from 'http';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROFILE_DIR = join(ROOT, 'tmp', 'chromium-profile');
const PORT = 3001;
const REFRESH_INTERVAL_MS = 90 * 60 * 1000; // 90 phút

chromium.use(StealthPlugin());

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  browser: null,
  currentCookie: '',
  lastRefresh: null,
  refreshCount: 0,
  isReady: false,
  lastError: null,
};

function log(msg) {
  process.stdout.write(`[${new Date().toLocaleTimeString('vi-VN')}] ${msg}\n`);
}

// ── Cookie management ─────────────────────────────────────────────────────────
async function extractCookie() {
  if (!state.browser) return false;
  try {
    const cookies = await state.browser.cookies('https://www.etsy.com');
    const dd = cookies.find((c) => c.name === 'datadome');
    if (dd && dd.value.length > 20) {
      state.currentCookie = dd.value;
      state.lastRefresh = new Date().toISOString();
      state.refreshCount++;
      state.isReady = true;
      state.lastError = null;
      log(`✅ Cookie ok (refresh #${state.refreshCount}, len=${dd.value.length})`);
      return true;
    }
  } catch (err) {
    state.lastError = err.message;
  }
  return false;
}

async function navigateEtsy() {
  if (!state.browser) return;
  const pages = state.browser.pages();
  let page = pages.length > 0 ? pages[0] : await state.browser.newPage();

  try {
    log('🌐 Navigating to etsy.com để refresh cookie...');
    await page.goto('https://www.etsy.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // Chờ DataDome xử lý (tối đa 30 giây)
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(2_000);
      const ok = await extractCookie();
      if (ok) return;
    }

    // Kiểm tra captcha
    const text = await page.evaluate(() => document.body?.innerText ?? '').catch(() => '');
    if (text.includes('captcha') || text.includes('temporarily restricted')) {
      log('⚠️  DataDome captcha! Vui lòng giải tay trong cửa sổ Chrome vừa mở.');
      state.lastError = 'captcha_detected';
      // Chờ thêm 5 phút để user giải captcha
      for (let i = 0; i < 150; i++) {
        await page.waitForTimeout(2_000);
        const ok = await extractCookie();
        if (ok) return;
      }
    }

    log('⚠️  Không lấy được cookie sau 30 giây, sẽ thử lại lần sau.');
  } catch (err) {
    log(`❌ Navigation error: ${err.message?.slice(0, 100)}`);
    state.lastError = err.message;
  }
}

// ── Browser bootstrap ─────────────────────────────────────────────────────────
async function startBrowser() {
  mkdirSync(PROFILE_DIR, { recursive: true });

  log(`📁 Profile dir: ${PROFILE_DIR}`);
  log('🚀 Khởi động Chrome (persistent profile, stealth mode)...');

  state.browser = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: [
      '--window-size=940,680',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
      '--disable-extensions-except',
    ],
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 940, height: 680 },
    locale: 'en-US',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    timeout: 30_000,
  });

  // Thêm hành vi người dùng thật
  state.browser.on('page', async (page) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    }).catch(() => {});
  });

  // Warmup ban đầu
  await navigateEtsy();

  // Auto-refresh định kỳ
  setInterval(navigateEtsy, REFRESH_INTERVAL_MS);
  log(`⏰ Auto-refresh mỗi ${REFRESH_INTERVAL_MS / 60_000} phút`);
}

// ── Cheerio search (dùng cookie đang có) ─────────────────────────────────────
const EMOJIS = ['🎁', '✨', '🌟', '🎨', '🛍️', '💎', '🌈', '🎀', '🏆', '🌺'];

function parsePrice(str) {
  return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
}

function parseReviewCount(text) {
  const t = text.trim().toLowerCase().replace(/,/g, '');
  if (t.includes('k')) return Math.floor(parseFloat(t) * 1000);
  return parseInt(t.replace(/[^0-9]/g, '')) || 0;
}

function parsePage(html, seen, limit, startIdx) {
  const $ = cheerio.load(html);
  const pageDataCurrency =
    $('body').attr('data-currency') ||
    html.match(/data-currency="([^"]+)"/)?.[1] ||
    'USD';
  const isVND = pageDataCurrency === 'VND';
  const VND_RATE = 25400;
  const results = [];

  $('[data-listing-id]').each((_, el) => {
    if (results.length + startIdx >= limit) return false;
    const listingId = $(el).attr('data-listing-id') || '';
    if (!listingId || seen.has(listingId)) return;
    seen.add(listingId);

    const title =
      $(el).find('h3').first().text().trim() ||
      $(el).find('a[title]').first().attr('title') ||
      '';
    const rawPrice = parsePrice($(el).find('.currency-value').first().text());
    const priceUSD = isVND ? Math.round((rawPrice / VND_RATE) * 100) / 100 : rawPrice;

    let shopName = 'Unknown Shop';
    const popoverText =
      $(el).find('button[class*="wt-popover__trigger"]').first().text().trim() ||
      $(el).find('[class*="wt-popover"]').first().text().trim();
    const byMatch = popoverText.match(/(?:Ad・)?By\s+([^\n\r]+)/);
    if (byMatch) shopName = byMatch[1].trim();

    const imageUrl = $(el).find('img').first().attr('src') || undefined;
    const cardText = $(el).text();
    const reviewMatch = cardText.match(/\(([0-9.,]+[kK]?)\)/);
    const reviewsCount = reviewMatch ? parseReviewCount(reviewMatch[1]) : 0;
    const ratingMatch = cardText.match(/(\d+\.\d+)\s*\(/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 4.5;

    const favorites = Math.floor(reviewsCount * 0.8);
    const estimatedSold = Math.floor(reviewsCount * 3.5);
    const viewsTotal = Math.floor(estimatedSold * 15);
    const soldDaily = Math.max(1, Math.floor(estimatedSold / 90));
    const viewsDaily = Math.max(5, Math.floor(viewsTotal / 90));
    const favRate = viewsTotal > 0 ? +((favorites / viewsTotal) * 100).toFixed(2) : 0;
    const idx = startIdx + results.length;

    results.push({
      etsyListingId: listingId,
      url: `https://www.etsy.com/listing/${listingId}`,
      title: title || `Listing #${listingId}`,
      shopName,
      price: priceUSD,
      rating,
      reviewsCount,
      imageUrl,
      currency: 'USD',
      country: 'US',
      estimatedSold,
      estimatedRevenue: Math.floor(estimatedSold * priceUSD),
      soldDaily,
      viewsDaily,
      viewsTotal,
      favorites,
      favRate,
      isHot: soldDaily > 8 || estimatedSold > 10000,
      emoji: EMOJIS[idx % EMOJIS.length],
    });
  });
  return results;
}

async function searchEtsy(keyword, limit) {
  if (!state.currentCookie) return { error: 'cookie_not_ready' };

  const results = [];
  const seen = new Set();
  const pagesNeeded = Math.ceil(limit / 11);

  for (let page = 1; page <= Math.min(pagesNeeded, 8); page++) {
    const url = `https://www.etsy.com/search?q=${encodeURIComponent(keyword)}&explicit=1&page=${page}`;
    const referer =
      page === 1
        ? 'https://www.etsy.com/'
        : `https://www.etsy.com/search?q=${encodeURIComponent(keyword)}&page=${page - 1}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        Referer: referer,
        Cookie: `datadome=${state.currentCookie}`,
      },
    });

    if (!res.ok) {
      if (page === 1) {
        log(`❌ Etsy ${res.status} — cookie có thể hết hạn, đang schedule refresh...`);
        setTimeout(navigateEtsy, 1000);
        return { error: 'cookie_expired' };
      }
      break;
    }

    const html = await res.text();
    if (html.includes('captcha-delivery') || html.includes('temporarily restricted')) {
      if (page === 1) {
        log('⚠️  DataDome phát hiện bot — đang refresh cookie...');
        state.isReady = false;
        setTimeout(navigateEtsy, 1000);
        return { error: 'cookie_expired' };
      }
      break;
    }

    const pageItems = parsePage(html, seen, limit, results.length);
    results.push(...pageItems);
    if (results.length >= limit) break;

    if (page < pagesNeeded) {
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));
    }
  }

  if (results.length === 0) return { error: 'no_results' };

  // Cookie dùng thành công → cập nhật lastRefresh
  state.lastRefresh = new Date().toISOString();
  return { results };
}

// ── HTTP Server ───────────────────────────────────────────────────────────────
function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

function startHttpServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // ── GET /health ──────────────────────────────────────────────────────────
    if (url.pathname === '/health') {
      return sendJSON(res, 200, {
        ready: state.isReady,
        hasCookie: state.currentCookie.length > 20,
        cookiePreview: state.currentCookie ? state.currentCookie.slice(0, 12) + '...' : null,
        lastRefresh: state.lastRefresh,
        refreshCount: state.refreshCount,
        lastError: state.lastError,
      });
    }

    // ── GET /cookie ──────────────────────────────────────────────────────────
    if (url.pathname === '/cookie') {
      if (!state.currentCookie) {
        return sendJSON(res, 503, { error: 'cookie_not_ready' });
      }
      return sendJSON(res, 200, { cookie: state.currentCookie });
    }

    // ── GET /search?q=...&limit=... ──────────────────────────────────────────
    if (url.pathname === '/search') {
      const q = url.searchParams.get('q') || '';
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 500);
      if (!q) return sendJSON(res, 400, { error: 'missing_q' });

      try {
        const result = await searchEtsy(q, limit);
        return sendJSON(res, 'error' in result ? 503 : 200, result);
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    sendJSON(res, 404, { error: 'not_found' });
  });

  server.listen(PORT, '127.0.0.1', () => {
    log(`\n🌐 HTTP API on http://localhost:${PORT}`);
    log('   GET /health         — trạng thái daemon');
    log('   GET /cookie         — DataDome cookie hiện tại');
    log('   GET /search?q=...   — search Etsy\n');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log(`❌ Port ${PORT} đang được dùng. Daemon có thể đang chạy rồi.`);
      process.exit(1);
    }
    throw err;
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║       EtsyPulse Scraper Daemon v1.0               ║');
  console.log('║  Giữ Chrome mở · Tự refresh cookie · API :3001   ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  startHttpServer();

  try {
    await startBrowser();
  } catch (err) {
    if (err.message?.includes("Executable doesn't exist")) {
      log('❌ Chromium chưa cài. Chạy: npx playwright install chromium');
    } else {
      log(`❌ Lỗi khởi động browser: ${err.message}`);
    }
    process.exit(1);
  }

  process.on('SIGINT', async () => {
    log('\n👋 Đang tắt daemon...');
    if (state.browser) await state.browser.close().catch(() => {});
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    if (state.browser) await state.browser.close().catch(() => {});
    process.exit(0);
  });

  log('✅ Daemon đang chạy. Nhấn Ctrl+C để tắt.\n');
}

main().catch((err) => {
  console.error('Fatal:', err.message ?? err);
  process.exit(1);
});
