/**
 * One-time migration: bỏ unique constraint global trên etsy_listing_id,
 * thay bằng composite unique (etsy_listing_id, collection_id).
 *
 * Chạy: node scripts/migrate-constraints.mjs
 *
 * Cần SUPABASE_ACCESS_TOKEN trong .env.local
 * Lấy tại: https://supabase.com/dashboard/account/tokens → "Generate new token"
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env.local ────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  const raw = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
  return env;
}

const env = loadEnv();

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || '';
const ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN || '';

// Extract project ref from URL: https://xxx.supabase.co → xxx
const PROJECT_REF = SUPABASE_URL.replace('https://', '').split('.')[0];

if (!ACCESS_TOKEN) {
  console.error(`
❌  SUPABASE_ACCESS_TOKEN chưa được set.

Làm theo các bước sau:
  1. Mở https://supabase.com/dashboard/account/tokens
  2. Click "Generate new token" → đặt tên "TopTeamTracker Migration"
  3. Copy token, mở file .env.local và thêm dòng:

     SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxx

  4. Chạy lại: node scripts/migrate-constraints.mjs
`);
  process.exit(1);
}

// ── SQL migration ──────────────────────────────────────────────────────────
const MIGRATION_SQL = `
-- Xóa unique constraint global trên etsy_listing_id (nếu tồn tại)
DO $$
DECLARE
  cname text;
BEGIN
  SELECT constraint_name INTO cname
  FROM information_schema.table_constraints
  WHERE table_name = 'listings'
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%etsy_listing_id%'
    AND constraint_name NOT LIKE '%collection%'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE listings DROP CONSTRAINT ' || quote_ident(cname);
    RAISE NOTICE 'Dropped constraint: %', cname;
  ELSE
    RAISE NOTICE 'No global unique constraint found on etsy_listing_id — skipping drop';
  END IF;
END $$;

-- Thêm composite unique (etsy_listing_id, collection_id) nếu chưa có
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'listings'
      AND constraint_name = 'listings_etsy_listing_id_collection_id_key'
  ) THEN
    ALTER TABLE listings
      ADD CONSTRAINT listings_etsy_listing_id_collection_id_key
      UNIQUE (etsy_listing_id, collection_id);
    RAISE NOTICE 'Added composite unique constraint (etsy_listing_id, collection_id)';
  ELSE
    RAISE NOTICE 'Composite unique constraint already exists — skipping';
  END IF;
END $$;

-- Thêm cột etsy_created_at nếu chưa có
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'etsy_created_at'
  ) THEN
    ALTER TABLE listings ADD COLUMN etsy_created_at timestamptz;
    RAISE NOTICE 'Added column etsy_created_at';
  ELSE
    RAISE NOTICE 'Column etsy_created_at already exists — skipping';
  END IF;
END $$;

-- Thêm cột etsy_updated_at nếu chưa có
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'etsy_updated_at'
  ) THEN
    ALTER TABLE listings ADD COLUMN etsy_updated_at timestamptz;
    RAISE NOTICE 'Added column etsy_updated_at';
  ELSE
    RAISE NOTICE 'Column etsy_updated_at already exists — skipping';
  END IF;
END $$;
`;

async function runMigration() {
  console.log(`\n🚀  Running migration on project: ${PROJECT_REF}\n`);

  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: MIGRATION_SQL }),
    });
  } catch (err) {
    console.error('❌  Network error:', err.message);
    process.exit(1);
  }

  if (!res.ok) {
    const body = await res.text();
    console.error(`❌  API error ${res.status}:`, body);
    if (res.status === 401) {
      console.error('\n💡  Token không hợp lệ hoặc hết hạn. Tạo token mới tại:');
      console.error('    https://supabase.com/dashboard/account/tokens\n');
    }
    process.exit(1);
  }

  const result = await res.json();

  // Supabase trả về messages/notices từ RAISE NOTICE
  if (Array.isArray(result)) {
    for (const row of result) {
      const msg = Object.values(row)[0];
      if (msg) console.log('  ✓', msg);
    }
  }

  console.log('\n✅  Migration thành công!\n');
  console.log('   Giờ listing cùng etsy_id có thể tồn tại ở nhiều collection khác nhau.');
  console.log('   Chỉ trùng khi cùng SP thêm vào đúng 1 collection.\n');
}

runMigration();
