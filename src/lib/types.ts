// ============================================================
// All TypeScript interfaces for the Graft platform.
// Single source of truth — used across API routes and the frontend.
// ============================================================

// ------ Enums -----------------------------------------------

export type TeamRole = 'owner' | 'admin' | 'member'
export type AnalyticsEventType = 'script_fired' | 'script_error' | 'config_fetched'

// ------ Database Row Types ----------------------------------

export interface Team {
  id: string
  name: string
  slug: string
  owner_id: string
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  joined_at: string
}

export type ScriptStatus = 'draft' | 'testing' | 'pending_review' | 'live' | 'rejected'

export interface Script {
  id: string
  team_id: string
  owner_id: string
  name: string
  description: string | null
  target_urls: string[]
  is_active: boolean
  current_version_id: string | null
  remote_config: Record<string, unknown>
  status: ScriptStatus
  rejection_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface ScriptVersion {
  id: string
  script_id: string
  version_number: number
  code: string
  deployed_by: string | null
  deployed_at: string
}

export interface TeamApiKey {
  id: string
  team_id: string
  key_prefix: string   // First 16 chars — safe to display
  key_hash: string     // SHA-256 hash — never returned to client
  label: string
  created_by: string | null
  created_at: string
  last_used_at: string | null
}

export interface AnalyticsEvent {
  id: string
  script_id: string
  event_type: AnalyticsEventType
  page_url: string | null
  companion_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ------ Enriched / Joined Types ----------------------------

export interface ScriptWithVersion extends Script {
  current_version: Pick<ScriptVersion, 'id' | 'version_number' | 'code' | 'deployed_at'> | null
  version_count: number
}

export interface CompanionScript {
  id: string
  name: string
  code: string
  target_urls: string[]
  remote_config: Record<string, unknown>
  version: number
  is_test: boolean   // true when status = 'testing' — Companion can show a dev badge
}

export interface CompanionSyncResponse {
  scripts: CompanionScript[]
  synced_at: string
}

// ------ API Request / Response Shapes ----------------------

export interface CreateTeamBody {
  name: string
  slug: string
}

export interface CreateScriptBody {
  team_id: string
  name: string
  description?: string
  target_urls: string[]
  code: string
}

export interface UpdateScriptBody {
  name?: string
  description?: string
  target_urls?: string[]
  is_active?: boolean
  remote_config?: Record<string, unknown>
}

export interface DeployScriptBody {
  code: string
}

export interface RollbackBody {
  version_number: number
}

export interface UpdateConfigBody {
  config: Record<string, unknown>
}

export interface CreateApiKeyBody {
  label: string
}

export interface ApiKeyCreatedResponse {
  id: string
  key: string          // Full key — shown ONCE, never stored
  key_prefix: string
  label: string
  created_at: string
}

export interface ApiKeySafe {
  id: string
  key_prefix: string
  label: string
  created_at: string
  last_used_at: string | null
}

export interface AnalyticsIngestEvent {
  script_id: string
  event_type: AnalyticsEventType
  page_url?: string
  companion_id?: string
  metadata?: Record<string, unknown>
}

export interface AnalyticsIngestBody {
  events: AnalyticsIngestEvent[]
}

export interface ApiError {
  error: string
  details?: string
}
