-- TopTeamTracker — Team + Extension migration
-- Chạy trong Supabase SQL Editor

-- 1. Thêm id column vào workspace_members
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- Tạo unique index cho id (làm việc như PK thứ hai)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_id ON workspace_members(id);

-- 2. Thêm username và suspended vào profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT false;

-- 3. Index cho username lookup (cho đăng nhập bằng username)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- 4. RLS: cho phép đọc profiles (để username lookup khi đăng nhập)
DROP POLICY IF EXISTS "profiles_read_all" ON profiles;
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (true);

-- 5. Thêm harvest_token vào workspaces (cho extension auth)
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS harvest_token UUID DEFAULT gen_random_uuid();

-- Sinh token cho các workspace chưa có (nếu có)
UPDATE workspaces SET harvest_token = gen_random_uuid() WHERE harvest_token IS NULL;
