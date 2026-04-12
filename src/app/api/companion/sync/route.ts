import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { hashApiKey, validateKeyFormat } from '@/lib/api-key'
import type { CompanionSyncResponse, CompanionScript } from '@/lib/types'

/**
 * GET /api/companion/sync
 *
 * Headers:
 *   X-Graft-Key: <team api key>           — always required
 *   X-Graft-Companion-ID: <companion_id>  — optional, enables test script delivery
 *
 * Returns:
 *   - All `status = 'live' AND is_active = true` scripts → every Companion gets these
 *   - All `status = 'testing'` scripts owned by this companion's registered user
 *     → ONLY the developer's browser gets these, nobody else sees them
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const apiKey      = request.headers.get('X-Graft-Key')
  const companionId = request.headers.get('X-Graft-Companion-ID')

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing X-Graft-Key header' }, { status: 401 })
  }
  if (!validateKeyFormat(apiKey)) {
    return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 })
  }

  const db      = createAdminClient()
  const keyHash = hashApiKey(apiKey)

  // Validate the key and get the associated team
  const { data: keyRecord, error: keyError } = await db
    .from('team_api_keys')
    .select('id, team_id')
    .eq('key_hash', keyHash)
    .single()

  if (keyError || !keyRecord) {
    return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 })
  }

  // Update last_used_at (fire and forget)
  db.from('team_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id)
    .then(() => {})

  // ── Resolve developer identity from companion_id ───────────────────────────
  // If this companion is registered to a user, we'll also return their testing scripts
  let developerUserId: string | null = null

  if (companionId) {
    const { data: registration } = await db
      .from('companion_registrations')
      .select('user_id')
      .eq('companion_id', companionId)
      .single()

    if (registration) {
      developerUserId = registration.user_id
    }
  }

  // ── Fetch live scripts (all Companions get these) ──────────────────────────
  const liveQuery = db
    .from('scripts')
    .select('id, name, target_urls, remote_config, current_version_id, status, owner_id')
    .eq('team_id', keyRecord.team_id)
    .eq('is_active', true)
    .eq('status', 'live')

  // ── Fetch testing scripts (only this developer's browser gets these) ───────
  const testingQuery = developerUserId
    ? db
        .from('scripts')
        .select('id, name, target_urls, remote_config, current_version_id, status, owner_id')
        .eq('team_id', keyRecord.team_id)
        .eq('is_active', true)
        .eq('status', 'testing')
        .eq('owner_id', developerUserId)
    : null

  const [liveResult, testingResult] = await Promise.all([
    liveQuery,
    testingQuery || Promise.resolve({ data: [] }),
  ])

  const allScripts = [
    ...(liveResult.data || []),
    ...(testingResult.data || []),
  ]

  if (!allScripts.length) {
    const response: CompanionSyncResponse = { scripts: [], synced_at: new Date().toISOString() }
    return NextResponse.json(response)
  }

  // Fetch code for all current versions in one query
  const versionIds = allScripts
    .map(s => s.current_version_id)
    .filter(Boolean) as string[]

  const { data: versions } = versionIds.length
    ? await db
        .from('script_versions')
        .select('id, version_number, code')
        .in('id', versionIds)
    : { data: [] }

  const versionMap = Object.fromEntries(
    (versions || []).map(v => [v.id, v])
  )

  const formattedScripts: CompanionScript[] = allScripts
    .filter(s => s.current_version_id && versionMap[s.current_version_id])
    .map(s => {
      const version = versionMap[s.current_version_id!]
      return {
        id:            s.id,
        name:          s.name,
        code:          version.code,
        target_urls:   s.target_urls,
        remote_config: s.remote_config,
        version:       version.version_number,
        is_test:       s.status === 'testing', // Companion can show a test badge
      }
    })

  const response: CompanionSyncResponse = {
    scripts:   formattedScripts,
    synced_at: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
