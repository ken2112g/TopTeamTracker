-- TopTeamTracker — Auth & Workspace Schema Migration
-- Chạy trong Supabase SQL Editor

-- ── 1. Profiles (mirrors auth.users, auto-populated by trigger) ───────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Workspaces ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  owner_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  plan        TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Workspace members ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role          TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- ── 4. Add workspace_id to existing tables ────────────────────────────────────
ALTER TABLE collections ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE listings    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Index để query nhanh
CREATE INDEX IF NOT EXISTS idx_collections_workspace ON collections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_listings_workspace    ON listings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

-- ── 5. Trigger: tự tạo profile khi user đăng ký ──────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 6. RLS Policies ───────────────────────────────────────────────────────────
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces         ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots          ENABLE ROW LEVEL SECURITY;

-- Profiles: user chỉ đọc được profile của mình
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (id = auth.uid());

-- Workspaces: thành viên mới đọc được workspace của mình
CREATE POLICY "workspace_member_read" ON workspaces FOR SELECT USING (
  id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "workspace_owner_write" ON workspaces FOR ALL USING (owner_id = auth.uid());

-- Workspace members
CREATE POLICY "wm_read" ON workspace_members FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "wm_owner_write" ON workspace_members FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Collections: chỉ workspace member mới xem được
CREATE POLICY "collections_workspace" ON collections FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- Listings: chỉ workspace member mới xem được
CREATE POLICY "listings_workspace" ON listings FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- Snapshots: xem được nếu listing thuộc workspace của mình
CREATE POLICY "snapshots_workspace" ON snapshots FOR ALL USING (
  listing_id IN (
    SELECT id FROM listings WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
);
