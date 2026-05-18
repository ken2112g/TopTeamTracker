/**
 * TopTeamTracker — Setup Chrome Profiles
 *
 * Chạy 1 lần để mở từng Chrome profile và cho phép bạn đăng nhập HeyEtsy.
 * Sau khi đăng nhập xong, đóng cửa sổ Chrome → script chuyển sang profile tiếp theo.
 *
 * Chạy: node services/setup-profiles.mjs
 *
 * Env vars:
 *   HEYETSY_EXT_PATH   Đường dẫn tới HeyEtsy extension đã unpack (required)
 *   N_WORKERS          Số profiles cần setup (default: 3)
 *   PROFILES_DIR       Nơi lưu profiles (default: ./chrome-profiles)
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const N_WORKERS    = parseInt(process.env.N_WORKERS   ?? '3',   10);
const HEYETSY_EXT  = process.env.HEYETSY_EXT_PATH;
const PROFILES_DIR = process.env.PROFILES_DIR ?? path.join(__dirname, '../chrome-profiles');

function waitForEnter(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, () => { rl.close(); resolve(); }));
}

async function setupProfile(workerIndex) {
  const profileDir = path.join(PROFILES_DIR, `worker-${workerIndex}`);
  await mkdir(profileDir, { recursive: true });

  const args = ['--no-sandbox', '--window-size=1366,768'];
  if (HEYETSY_EXT) {
    args.push(
      `--disable-extensions-except=${HEYETSY_EXT}`,
      `--load-extension=${HEYETSY_EXT}`,
    );
  }

  console.log(`\n[Setup] Mở profile Worker ${workerIndex}...`);
  console.log(`[Setup] → Đăng nhập HeyEtsy bằng tài khoản seat ${workerIndex}`);
  console.log(`[Setup] → Sau khi xong, nhấn Enter ở đây để đóng và chuyển sang profile tiếp theo`);

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    args,
    viewport: { width: 1366, height: 768 },
  });

  const page = await context.newPage();
  await page.goto('https://www.etsy.com/listing/1780546310', { waitUntil: 'domcontentloaded' });

  await waitForEnter('\n[Setup] Nhấn Enter khi đã đăng nhập HeyEtsy xong... ');
  await context.close();
  console.log(`[Setup] ✓ Profile Worker ${workerIndex} đã lưu`);
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  TopTeamTracker — Setup HeyEtsy Profiles ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\nSẽ mở ${N_WORKERS} Chrome profiles để bạn đăng nhập HeyEtsy.`);
  console.log(`Mỗi profile dùng 1 HeyEtsy seat khác nhau.\n`);

  if (!HEYETSY_EXT) {
    console.warn('⚠  HEYETSY_EXT_PATH chưa được set — Chrome sẽ mở không có HeyEtsy extension');
    console.warn('   Set biến môi trường: HEYETSY_EXT_PATH=/path/to/heyetsy-extension\n');
  }

  for (let i = 1; i <= N_WORKERS; i++) {
    await setupProfile(i);
  }

  console.log('\n✅ Setup hoàn thành! Giờ có thể chạy harvest:');
  console.log('   npm run harvest:now');
}

main().catch(console.error);
