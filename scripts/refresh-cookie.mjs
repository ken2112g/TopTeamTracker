/**
 * EtsyPulse — Tự động lấy DataDome cookie từ Etsy
 * Chạy: npm run cookie:refresh
 *
 * Cách hoạt động:
 *  1. Mở Chrome (có Stealth) → truy cập etsy.com
 *  2. Nếu DataDome hiện captcha → user giải tay trong cửa sổ browser
 *  3. Sau khi xác thực xong → lấy cookie datadome
 *  4. Ghi tự động vào .env.local
 *  5. Nhắc restart server
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENV_PATH = join(ROOT, '.env.local');

chromium.use(StealthPlugin());

const BANNER = `
╔══════════════════════════════════════════════════════╗
║          EtsyPulse — Cookie Refresher v1.0           ║
╚══════════════════════════════════════════════════════╝
`;

async function updateEnvFile(newCookieValue) {
  let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf-8') : '';

  if (content.includes('ETSY_DATADOME_COOKIE=')) {
    content = content.replace(/ETSY_DATADOME_COOKIE=.*/g, `ETSY_DATADOME_COOKIE=${newCookieValue}`);
  } else {
    content = content.trimEnd() + `\nETSY_DATADOME_COOKIE=${newCookieValue}\n`;
  }

  writeFileSync(ENV_PATH, content, 'utf-8');
}

async function main() {
  console.log(BANNER);
  console.log('🔧 Khởi động Chrome với Stealth mode...\n');

  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      args: [
        '--window-size=1360,900',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-infobars',
      ],
      timeout: 30_000,
    });
  } catch (err) {
    if (err.message?.includes('Executable doesn\'t exist')) {
      console.error('❌ Chưa cài Chromium. Chạy lệnh sau rồi thử lại:\n');
      console.error('   npx playwright install chromium\n');
    } else {
      console.error('❌ Không mở được Chrome:', err.message);
    }
    process.exit(1);
  }

  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1360, height: 900 },
    locale: 'en-US',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  });

  const page = await ctx.newPage();

  // Ẩn dấu hiệu automation
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  console.log('🌐 Đang mở etsy.com...');
  console.log('   👉 Nếu thấy captcha trong cửa sổ browser → giải tay!\n');

  try {
    await page.goto('https://www.etsy.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
  } catch {
    console.log('⚠️  Timeout khi load trang, tiếp tục chờ cookie...\n');
  }

  // Hành vi giống người dùng thật
  await page.waitForTimeout(1500);
  await page.mouse.move(400 + Math.random() * 200, 300 + Math.random() * 150);
  await page.waitForTimeout(800);

  console.log('⏳ Đang chờ DataDome xác thực (tối đa 3 phút)...');

  let datadome = '';
  const MAX_WAIT_MS = 180_000; // 3 phút
  const POLL_INTERVAL = 2_000;
  let elapsed = 0;

  while (elapsed < MAX_WAIT_MS) {
    await page.waitForTimeout(POLL_INTERVAL);
    elapsed += POLL_INTERVAL;

    try {
      const cookies = await ctx.cookies('https://www.etsy.com');
      const dd = cookies.find((c) => c.name === 'datadome');
      if (dd && dd.value.length > 20) {
        datadome = dd.value;
        break;
      }
    } catch {
      // context có thể bị đóng nếu browser crash
      break;
    }

    const secs = Math.floor(elapsed / 1000);
    process.stdout.write(`\r   ${secs}s đã qua...`);
  }

  try {
    await browser.close();
  } catch {}

  if (!datadome) {
    console.error('\n\n❌ Không lấy được cookie sau 3 phút.');
    console.error('   → Thử lại, hoặc copy thủ công từ Chrome DevTools > Application > Cookies > datadome\n');
    process.exit(1);
  }

  console.log('\n\n✅ Lấy được DataDome cookie!\n');

  await updateEnvFile(datadome);

  console.log('💾 Đã ghi vào .env.local');
  console.log('\n══════════════════════════════════════════\n');
  console.log('🔄 Restart server để áp dụng cookie mới:');
  console.log('   Ctrl+C  →  npm run dev\n');
  console.log('⏱  Cookie thường có hiệu lực 6-24 giờ.');
  console.log('   Chạy lại lệnh này khi search báo cookie hết hạn.\n');
}

main().catch((err) => {
  console.error('\n❌ Lỗi không xử lý được:', err.message ?? err);
  process.exit(1);
});
