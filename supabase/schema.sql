-- ============================================================
-- GRAFT PLATFORM — Complete Database Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TEAMS
-- A workspace/organization. One team can have many scripts.
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text        NOT NULL,
  slug       text        NOT NULL UNIQUE, -- URL-safe identifier e.g. "acme-dev"
  owner_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TEAM MEMBERS
-- Who belongs to a team and in what capacity.
-- ============================================================
CREATE TABLE IF NOT EXISTS team_members (
  id        uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id   uuid        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      text        NOT NULL DEFAULT 'member'
                        CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- ============================================================
-- SCRIPTS
-- A deployable browser automation. The core entity in Graft.
-- Once deployed, the Companion extension runs this code on
-- matching pages across the entire team automatically.
-- ============================================================
CREATE TABLE IF NOT EXISTS scripts (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id       uuid        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  owner_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  description   text,
  -- Array of URL match patterns e.g. {"*://github.com/*","*://jira.company.com/*"}
  target_urls   text[]      NOT NULL DEFAULT '{}',
  is_active     boolean     NOT NULL DEFAULT true,
  -- Points to the currently deployed version (set on each deploy)
  -- Added as ALTER below to handle circular reference
  remote_config jsonb       NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SCRIPT VERSIONS
-- Append-only. Every deploy creates a new row. No deletions.
-- This is the source of truth for what runs in the browser.
-- ============================================================
CREATE TABLE IF NOT EXISTS script_versions (
  id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id      uuid        NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  version_number integer     NOT NULL,
  code           text        NOT NULL,
  deployed_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  deployed_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (script_id, version_number)
);

-- Now add the FK from scripts → script_versions (resolves circular ref)
ALTER TABLE scripts
  ADD COLUMN IF NOT EXISTS current_version_id uuid
  REFERENCES script_versions(id) ON DELETE SET NULL;

-- ============================================================
-- TEAM API KEYS
-- Used by the Graft Companion extension to authenticate.
-- The full key is shown ONCE on creation and never stored.
-- Only the SHA-256 hash is stored here.
-- ============================================================
CREATE TABLE IF NOT EXISTS team_api_keys (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id      uuid        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  -- First 16 chars of the key for UI display (e.g., "graft_abc12345...")
  key_prefix   text        NOT NULL,
  -- SHA-256 hash of the full key — this is what we validate against
  key_hash     text        NOT NULL UNIQUE,
  label        text        NOT NULL DEFAULT 'Default Key',
  created_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

-- ============================================================
-- ANALYTICS EVENTS
-- Telemetry reported back from the Companion extension.
-- Records every script execution, error, and config fetch.
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id    uuid        NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  event_type   text        NOT NULL
                           CHECK (event_type IN ('script_fired', 'script_error', 'config_fetched')),
  page_url     text,
  -- Anonymous browser fingerprint set by the Companion
  companion_id text,
  metadata     jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- All tables locked down. Server-side admin client bypasses RLS
-- for Companion sync and analytics ingestion endpoints.
-- ============================================================
ALTER TABLE teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_api_keys    ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Teams
CREATE POLICY "Members can view their teams"
  ON teams FOR SELECT
  USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their team"
  ON teams FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their team"
  ON teams FOR DELETE
  USING (owner_id = auth.uid());

-- Team Members
CREATE POLICY "Members can view team membership"
  ON team_members FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Owners and admins can add members"
  ON team_members FOR INSERT
  WITH CHECK (team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Owners and admins can remove members"
  ON team_members FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Scripts
CREATE POLICY "Team members can view scripts"
  ON scripts FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team members can create scripts"
  ON scripts FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Owner or admin can update scripts"
  ON scripts FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owner or team owner can delete scripts"
  ON scripts FOR DELETE
  USING (
    owner_id = auth.uid() OR
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Script Versions
CREATE POLICY "Team members can view versions"
  ON script_versions FOR SELECT
  USING (script_id IN (
    SELECT id FROM scripts
    WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  ));

CREATE POLICY "Team members can create versions"
  ON script_versions FOR INSERT
  WITH CHECK (script_id IN (
    SELECT id FROM scripts
    WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  ));

-- API Keys (owners and admins only)
CREATE POLICY "Admins can manage API keys"
  ON team_api_keys FOR ALL
  USING (team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Analytics (team members can view their own script events)
CREATE POLICY "Team members can view analytics"
  ON analytics_events FOR SELECT
  USING (script_id IN (
    SELECT id FROM scripts
    WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  ));

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_team_members_user_id    ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id    ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_scripts_team_id         ON scripts(team_id);
CREATE INDEX IF NOT EXISTS idx_scripts_is_active       ON scripts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_script_versions_script  ON script_versions(script_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_script_id     ON analytics_events(script_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at    ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash           ON team_api_keys(key_hash);

-- ============================================================
-- TRIGGER: auto-update scripts.updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scripts_updated_at ON scripts;
CREATE TRIGGER trg_scripts_updated_at
  BEFORE UPDATE ON scripts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
