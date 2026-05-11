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
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROFILE_DIR = join(ROOT, 'tmp', 'chromium-profile');
const PORT = 3001;
const REFRESH_INTERVAL_MS = 90 * 60 * 1000; // 90 phút

// ── Tìm Chrome thật trên máy ──────────────────────────────────────────────────
// Chrome thật có TLS fingerprint (JA3/JA4) đúng của Chrome.
// Playwright Chromium có fingerprint khác → DataDome phát hiện được.
function findRealChrome() {
  const candidates = [
    process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')
      : null,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

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

// Scroll dần dần như người dùng thật
async function humanScroll(page, targetY = 600) {
  await page.evaluate((target) => {
    return new Promise((resolve) => {
      let current = 0;
      const step = 80 + Math.floor(Math.random() * 40);
      const interval = setInterval(() => {
        current += step;
        window.scrollTo({ top: current, behavior: 'smooth' });
        if (current >= target) { clearInterval(interval); resolve(); }
      }, 120 + Math.floor(Math.random() * 60));
    });
  }, targetY).catch(() => {});
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

    // Chờ trang ổn định
    await page.waitForTimeout(1500 + Math.random() * 1000);

    // Di chuyển chuột + scroll như người thật
    await page.mouse.move(300 + Math.random() * 200, 200 + Math.random() * 100).catch(() => {});
    await page.waitForTimeout(400 + Math.random() * 300);
    await humanScroll(page, 400 + Math.random() * 300);
    await page.waitForTimeout(800 + Math.random() * 600);
    await page.mouse.move(500 + Math.random() * 200, 400 + Math.random() * 150).catch(() => {});
    await page.waitForTimeout(500 + Math.random() * 400);

    // Chờ DataDome xử lý (tối đa 30 giây)
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(2_000);
      const ok = await extractCookie();
      if (ok) return;
    }

    // Kiểm tra captcha
    const text = await page.evaluate(() => document.body?.innerText ?? '').catch(() => '');
    if (text.includes('captcha') || text.includes('temporarily restricted') || text.includes('Please verify')) {
      log('⚠️  DataDome captcha! Vui lòng giải tay trong cửa sổ Chrome vừa mở.');
      log('   → Sau khi giải xong, daemon sẽ tự nhận cookie.');
      state.lastError = 'captcha_detected';
      // Chờ tối đa 5 phút để user giải captcha
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

  const realChrome = findRealChrome();
  if (realChrome) {
    log(`✅ Dùng Chrome thật: ${realChrome}`);
  } else {
    log('⚠️  Không tìm thấy Chrome, fallback sang Playwright Chromium');
    log('   → Cài Chrome tại: https://google.com/chrome để bypass tốt hơn');
  }

  log(`📁 Profile dir: ${PROFILE_DIR}`);
  log('🚀 Khởi động Chrome (persistent profile, stealth mode)...');

  // Khi dùng Chrome thật, KHÔNG override userAgent — để Chrome tự dùng UA thật của nó.
  // UA thật khớp với TLS fingerprint → DataDome không phát hiện mismatch.
  const launchOptions = {
    executablePath: realChrome ?? undefined,
    headless: false,
    args: [
      '--window-size=1280,800',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    timeout: 30_000,
  };

  // Chỉ set userAgent tùy chỉnh nếu không tìm thấy Chrome thật
  if (!realChrome) {
    launchOptions.userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.207 Safari/537.36';
  }

  state.browser = await chromium.launchPersistentContext(PROFILE_DIR, launchOptions);

  state.browser.on('page', async (page) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // Thêm chrome object như Chrome thật
      if (!window.chrome) {
        window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
      }
    }).catch(() => {});
  });

  // Warmup ban đầu
  await navigateEtsy();

  // Auto-refresh định kỳ
  setInterval(navigateEtsy, REFRESH_INTERVAL_MS);
  log(`⏰ Auto-refresh mỗi ${REFRESH_INTERVAL_MS / 60_000} phút`);
}

// ── Search lock (tránh 2 search chạy song song, tranh browser) ───────────────
let searchLock = false;
const searchQueue = [];

function acquireSearchLock() {
  return new Promise((resolve) => {
    if (!searchLock) { searchLock = true; resolve(); }
    else searchQueue.push(resolve);
  });
}

function releaseSearchLock() {
  if (searchQueue.length > 0) searchQueue.shift()();
  else searchLock = false;
}

// ── Cheerio parse (dùng chung cho cả search) ──────────────────────────────────
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

// ── Browser-based search: toàn bộ request đi qua Chrome thật ────────────────
// Lý do: DataDome kiểm tra TLS fingerprint + Sec-CH-UA headers.
// fetch() của Node.js bị phát hiện dù có cookie hợp lệ.
// Dùng page.goto() đảm bảo DataDome luôn thấy đúng Chrome session.
async function searchEtsy(keyword, limit) {
  if (!state.browser || !state.isReady) return { error: 'browser_not_ready' };

  await acquireSearchLock();
  let page = null;

  try {
    page = await state.browser.newPage();
    const results = [];
    const seen = new Set();
    const pagesNeeded = Math.ceil(limit / 24); // Etsy render ~24 items/trang khi dùng browser

    for (let pageNum = 1; pageNum <= Math.min(pagesNeeded, 6); pageNum++) {
      const url = `https://www.etsy.com/search?q=${encodeURIComponent(keyword)}&explicit=1&page=${pageNum}`;
      log(`🔍 Browser search "${keyword}" trang ${pageNum}/${Math.min(pagesNeeded, 6)}...`);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      } catch (navErr) {
        log(`❌ Navigation lỗi trang ${pageNum}: ${navErr.message?.slice(0, 80)}`);
        if (pageNum === 1) return { error: navErr.message };
        break;
      }

      // Chờ listing cards render
      await page.waitForSelector('[data-listing-id]', { timeout: 12_000 }).catch(() => {});

      // Di chuột + scroll như người thật
      await page.mouse.move(400 + Math.random() * 300, 200 + Math.random() * 100).catch(() => {});
      await page.waitForTimeout(300 + Math.random() * 200);
      await humanScroll(page, 300 + Math.random() * 200);
      await page.waitForTimeout(500 + Math.random() * 400);

      // Kiểm tra DataDome block
      const bodyText = await page.evaluate(() => document.body?.innerText ?? '').catch(() => '');
      if (
        bodyText.includes('captcha-delivery') ||
        bodyText.includes('temporarily restricted') ||
        bodyText.includes('Please verify you are a human')
      ) {
        log('⚠️  DataDome chặn khi search! Đang refresh session...');
        state.isReady = false;
        setTimeout(navigateEtsy, 500);
        if (pageNum === 1) return { error: 'cookie_expired' };
        break;
      }

      const html = await page.content();
      const pageItems = parsePage(html, seen, limit, results.length);
      results.push(...pageItems);
      log(`   Trang ${pageNum}: +${pageItems.length} items (tổng: ${results.length})`);

      if (results.length >= limit) break;

      // Delay ngẫu nhiên giữa các trang
      if (pageNum < Math.min(pagesNeeded, 6)) {
        await page.waitForTimeout(1800 + Math.random() * 1200);
      }
    }

    // Cập nhật cookie sau khi search thành công (DataDome có thể rotate cookie)
    await extractCookie();

    if (results.length === 0) return { error: 'no_results' };
    return { results };

  } catch (err) {
    log(`❌ Browser search lỗi: ${err.message?.slice(0, 120)}`);
    return { error: err.message };
  } finally {
    if (page) await page.close().catch(() => {});
    releaseSearchLock();
  }
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
