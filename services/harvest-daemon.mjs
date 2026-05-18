/**
 * TopTeamTracker — VPS Harvest Daemon
 *
 * N workers Playwright chạy song song, chia sẻ 1 queue chung.
 * Mỗi worker là 1 Chrome profile riêng → có thể login nhiều HeyEtsy seat khác nhau.
 *
 * === Setup VPS (Ubuntu) ===
 *   sudo apt-get install -y xvfb libatk-bridge2.0-0 libgbm1 libasound2
 *   Xvfb :99 -screen 0 1366x768x24 &
 *   export DISPLAY=:99
 *   npm install
 *   npx playwright install chromium
 *
 * === Chạy ===
 *   node services/harvest-daemon.mjs             # chạy 1 lần ngay bây giờ
 *   node services/harvest-daemon.mjs --daemon    # daemon mode, chạy theo lịch mỗi ngày
 *
 * === Env vars ===
 *   ETSYPULSE_API_URL     URL web app (default: http://localhost:3000)
 *   N_WORKERS             Số worker song song (default: 3)
 *   HEYETSY_EXT_PATH      Đường dẫn tuyệt đối tới thư mục HeyEtsy extension đã unpack
 *   PROFILES_DIR          Nơi lưu Chrome profiles (default: ./chrome-profiles)
 *   DELAY_MS              Delay giữa 2 listing trong 1 worker (default: 5000)
 *   HEYETSY_TIMEOUT_MS    Timeout chờ HeyEtsy widget (default: 12000)
 *   HARVEST_HOUR          Giờ chạy trong daemon mode (default: 2)
 *   HARVEST_MINUTE        Phút chạy trong daemon mode (default: 0)
 */

import { chromium }    from 'playwright';
import { mkdir }       from 'fs/promises';
import { existsSync }  from 'fs';
import path            from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const API_URL         = process.env.ETSYPULSE_API_URL    ?? 'http://localhost:3000';
const N_WORKERS       = Math.max(1, parseInt(process.env.N_WORKERS           ?? '3',     10));
const HEYETSY_EXT     = process.env.HEYETSY_EXT_PATH;
const PROFILES_DIR    = process.env.PROFILES_DIR         ?? path.join(__dirname, '../chrome-profiles');
const DELAY_MS        = parseInt(process.env.DELAY_MS                        ?? '5000',  10);
const HEY_TIMEOUT     = parseInt(process.env.HEYETSY_TIMEOUT_MS              ?? '12000', 10);
const HARVEST_HOUR    = parseInt(process.env.HARVEST_HOUR                    ?? '2',     10);
const HARVEST_MINUTE  = parseInt(process.env.HARVEST_MINUTE                  ?? '0',     10);
const DAEMON_MODE     = process.argv.includes('--daemon');
const HARVEST_TOKEN   = process.env.HARVEST_TOKEN ?? ''; // lấy từ Admin Panel → Workspace

// ── API helpers ───────────────────────────────────────────────────────────────
const AUTH_HEADERS = HARVEST_TOKEN ? { 'X-Harvest-Token': HARVEST_TOKEN } : {};

async function fetchHarvestList() {
  const res = await fetch(`${API_URL}/api/extension/harvest-list`, {
    headers: AUTH_HEADERS,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`harvest-list HTTP ${res.status}`);
  return res.json(); // [{ etsyListingId, url, lastSnapshotAt }]
}

async function postSnapshot(etsyListingId, data) {
  const res = await fetch(`${API_URL}/api/extension/snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ etsyListingId, ...data }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`snapshot API HTTP ${res.status}`);
}

// ── Browser launch (persistent context → HeyEtsy stays logged in) ─────────────
async function launchWorkerBrowser(workerIndex) {
  const profileDir = path.join(PROFILES_DIR, `worker-${workerIndex}`);
  await mkdir(profileDir, { recursive: true });

  const args = [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--window-size=1366,768',
  ];

  if (HEYETSY_EXT && existsSync(HEYETSY_EXT)) {
    args.push(
      `--disable-extensions-except=${HEYETSY_EXT}`,
      `--load-extension=${HEYETSY_EXT}`,
    );
  } else if (HEYETSY_EXT) {
    console.warn(`[W${workerIndex}] HEYETSY_EXT_PATH không tồn tại: ${HEYETSY_EXT}`);
  }

  return chromium.launchPersistentContext(profileDir, {
    headless: false, // extensions require non-headless
    args,
    viewport: { width: 1366, height: 768 },
    locale: 'en-US',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
}

// ── HeyEtsy extraction (runs inside browser) ─────────────────────────────────
async function extractData(page, timeoutMs) {
  // Poll for HeyEtsy widget
  let heyData = null;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    heyData = await page.evaluate(() => {
      const container = document.querySelector('[data-heyetsy-listing-id]');
      if (!container) return null;

      let soldDaily = 0, viewsDaily = 0, soldTotal = 0, revenue = 0;
      let viewsAvg = 0, viewsTotal = 0, favorites = 0;
      let created = null, updated = null;

      for (const icon of container.querySelectorAll('.heyetsy-icon')) {
        const tooltipEl = icon.querySelector('.heyetsy-tooltip');
        const label = (tooltipEl?.innerText ?? tooltipEl?.textContent ?? '').trim().toLowerCase();
        const paraEl = icon.querySelector('p');
        const valueEl = paraEl ?? tooltipEl?.nextElementSibling;
        const raw = (valueEl?.innerText ?? valueEl?.textContent ?? '').trim();
        const stripped = raw.replace(/\+[^0-9]*$/, '').replace(/[^0-9.km]/gi, '');
        const num = /k$/i.test(stripped) ? parseFloat(stripped) * 1_000
          : /m$/i.test(stripped) ? parseFloat(stripped) * 1_000_000
          : parseFloat(stripped) || 0;

        if (label.includes('sold') && label.includes('24'))                                          soldDaily  = num;
        else if (label.includes('total') && (label.includes('sales') || label.includes('sold')))     soldTotal  = num;
        else if (label.includes('view') && label.includes('24'))                                     viewsDaily = num;
        else if (label.includes('revenue'))                                                          revenue    = raw === 'N/A' ? 0 : num;
        else if (label.includes('average') && label.includes('view'))                                viewsAvg   = num;
        else if (label.includes('total') && label.includes('view'))                                  viewsTotal = num;
        else if (label.includes('number of favorites') || (label.includes('total') && label.includes('favorites'))) favorites = num;
        else if (label.includes('creat')) {
          const d = raw.match(/\d{1,2}\/\d{1,2}\/\d{4}/) ?? raw.match(/\d{4}-\d{2}-\d{2}/);
          created = d?.[0] ?? null;
        }
        else if (label.includes('updat') || label.includes('renew')) updated = raw || null;
      }

      const text = container.innerText ?? container.textContent ?? '';
      if (!created) { const m = text.match(/Created[\s\t]+(\d{1,2}\/\d{1,2}\/\d{4})/i); if (m) created = m[1]; }
      if (!updated) { const m = text.match(/(?:Updated|Renewed)[\s\t]+([^\n\r]+)/i);     if (m) updated = m[1].trim(); }

      if (soldTotal === 0 && soldDaily > 0) { soldTotal = soldDaily; soldDaily = 0; }
      if (soldDaily > 0 && soldTotal > 0 && soldDaily > soldTotal) { [soldDaily, soldTotal] = [soldTotal, soldDaily]; }

      const hasData = soldTotal > 0 || viewsTotal > 0 || favorites > 0 || revenue > 0 || viewsAvg > 0;
      if (!hasData) return null;
      return { soldDaily, viewsDaily, soldTotal, revenue, viewsAvg, viewsTotal, favorites, created, updated };
    });

    if (heyData) break;
    await page.waitForTimeout(600);
  }

  // Always extract page-native data
  const pageData = await page.evaluate(() => {
    let price = 0;
    for (const el of document.querySelectorAll('.currency-value')) {
      const v = parseFloat(el.textContent?.replace(/[^0-9.]/g, '') ?? '0');
      if (v > 0) { price = v; break; }
    }
    const ratingEl = document.querySelector('[data-rating-value]');
    const ratingText = document.body.innerText.match(/(\d+\.\d+)\s*out of 5/)?.[1] ?? '0';
    const rating = parseFloat(ratingEl?.getAttribute?.('data-rating-value') ?? ratingText) || 0;

    const rTxt = document.body.innerText.match(/\(([0-9,]+[kK]?)\s*review/i)?.[1] ?? '0';
    const reviewsCount = rTxt.toLowerCase().includes('k')
      ? Math.floor(parseFloat(rTxt) * 1000)
      : parseInt(rTxt.replace(/,/g, '')) || 0;

    const fTxt = document.body.innerText.match(/([0-9,]+[kK]?)\s*(?:person|people).*?(?:favor|love)/i)?.[1] ?? '0';
    const pageFavorites = fTxt.toLowerCase().includes('k')
      ? Math.floor(parseFloat(fTxt) * 1000)
      : parseInt(fTxt.replace(/,/g, '')) || 0;

    return { price, rating, reviewsCount, pageFavorites };
  });

  if (heyData) {
    return {
      soldDaily:    heyData.soldDaily,
      viewsDaily:   heyData.viewsDaily,
      soldTotal:    heyData.soldTotal,
      viewsTotal:   heyData.viewsTotal,
      revenueUsd:   heyData.revenue,
      price:        pageData.price  || 0,
      rating:       pageData.rating || 0,
      reviewsCount: pageData.reviewsCount || 0,
      favorites:    heyData.favorites || pageData.pageFavorites || null,
      source:       'heyetsy',
      confidence:   0.9,
    };
  }

  // HeyEtsy không load được → Tier 1 estimate
  return {
    soldDaily: 0, viewsDaily: 0, soldTotal: 0, viewsTotal: 0, revenueUsd: 0,
    price:        pageData.price  || 0,
    rating:       pageData.rating || 0,
    reviewsCount: pageData.reviewsCount || 0,
    favorites:    pageData.pageFavorites || null,
    source:       'estimate',
    confidence:   0.4,
  };
}

// ── Worker: kéo listing từ queue cho đến hết ──────────────────────────────────
async function runWorker(workerId, queue, stats) {
  let context;
  try {
    context = await launchWorkerBrowser(workerId);
    const page = await context.newPage();

    // Block images và fonts để load nhanh hơn
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,eot}', r => r.abort());

    while (queue.length > 0) {
      const listing = queue.shift();
      if (!listing) break;

      let ok = false;
      for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
        try {
          await page.goto(listing.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
          const data = await extractData(page, HEY_TIMEOUT);
          await postSnapshot(listing.etsyListingId, data);

          stats.done++;
          stats.heyetsy += data.source === 'heyetsy' ? 1 : 0;
          const done = stats.done + stats.errors;
          const pct  = Math.round(done / stats.total * 100);
          console.log(
            `[W${workerId}] ✓ ${listing.etsyListingId} | ${data.source.padEnd(8)} | ${done}/${stats.total} (${pct}%)`
          );
          ok = true;
        } catch (err) {
          if (attempt < 3) {
            console.warn(`[W${workerId}] retry ${attempt}/2 for ${listing.etsyListingId}: ${err.message}`);
            await page.waitForTimeout(4_000);
          } else {
            stats.errors++;
            console.error(`[W${workerId}] ✗ ${listing.etsyListingId}: ${err.message}`);
          }
        }
      }

      if (queue.length > 0) {
        // Random delay để tránh pattern detection
        const delay = DELAY_MS + Math.floor(Math.random() * 3_000);
        await page.waitForTimeout(delay);
      }
    }

    await page.close();
  } catch (fatal) {
    console.error(`[W${workerId}] Worker crashed:`, fatal.message);
  } finally {
    await context?.close().catch(() => {});
  }
}

// ── Main harvest run ──────────────────────────────────────────────────────────
async function runHarvest() {
  const startLabel = new Date().toLocaleString('vi-VN');
  console.log(`\n[${startLabel}] ═══ Bắt đầu harvest ═══`);

  let listings;
  try {
    listings = await fetchHarvestList();
  } catch (e) {
    console.error('[Harvest] Không fetch được danh sách listing:', e.message);
    return;
  }

  if (!listings.length) {
    console.log('[Harvest] Không có listing nào cần harvest');
    return;
  }

  const queue  = [...listings]; // shared mutable queue
  const stats  = { total: listings.length, done: 0, errors: 0, heyetsy: 0 };
  const t0     = Date.now();
  const nw     = Math.min(N_WORKERS, listings.length);

  console.log(`[Harvest] ${listings.length} listings | ${nw} workers | HeyEtsy: ${HEYETSY_EXT ? 'ON' : 'OFF'}`);
  console.log(`[Harvest] Delay: ${DELAY_MS}ms | HeyEtsy timeout: ${HEY_TIMEOUT}ms`);

  const workerJobs = Array.from({ length: nw }, (_, i) => runWorker(i + 1, queue, stats));
  await Promise.all(workerJobs);

  const mins = Math.round((Date.now() - t0) / 60_000);
  console.log(`\n[Harvest] ═══ Hoàn thành ═══`);
  console.log(`[Harvest] ✓ ${stats.done} ok (${stats.heyetsy} HeyEtsy · ${stats.done - stats.heyetsy} estimate)`);
  console.log(`[Harvest] ✗ ${stats.errors} lỗi`);
  console.log(`[Harvest] ⏱ ${mins} phút`);
}

// ── Scheduling ────────────────────────────────────────────────────────────────
function msUntilNext(hour, minute) {
  const now  = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return { ms: next.getTime() - now.getTime(), next };
}

async function daemonLoop() {
  console.log(`[Daemon] Khởi động. Schedule: ${HARVEST_HOUR}:${String(HARVEST_MINUTE).padStart(2,'0')} hàng ngày`);
  console.log(`[Daemon] Workers: ${N_WORKERS} | API: ${API_URL}`);
  console.log(`[Daemon] Token: ${HARVEST_TOKEN ? HARVEST_TOKEN.slice(0,8) + '...' : '(chưa cấu hình — sẽ báo 401)'}`);
  console.log(`[Daemon] HeyEtsy ext: ${HEYETSY_EXT ?? '(chưa cấu hình)'}`);

  while (true) {
    const { ms, next } = msUntilNext(HARVEST_HOUR, HARVEST_MINUTE);
    console.log(`[Daemon] Lần chạy tiếp theo: ${next.toLocaleString('vi-VN')} (${Math.round(ms / 60_000)} phút nữa)`);
    await new Promise(r => setTimeout(r, ms));
    await runHarvest().catch(e => console.error('[Daemon] Harvest error:', e.message));
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
if (DAEMON_MODE) {
  daemonLoop().catch(console.error);
} else {
  runHarvest().catch(e => { console.error(e.message); process.exit(1); });
}
