import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { hashApiKey, validateKeyFormat } from '@/lib/api-key'
import type { CompanionSyncResponse, CompanionScript } from '@/lib/types'

/**
 * GET /api/companion/sync
 *
 * The heartbeat endpoint polled by every Graft Companion extension every 30 seconds.
 * Validates the team API key, returns all active scripts with their current code.
 *
 * Authentication: Header `X-Graft-Key: graft_xxxxx...`
 * No user JWT required — uses admin client with service role.
 *
 * This is the core of the entire platform. The Companion calls this,
 * gets the latest scripts, and injects them into the right browser tabs.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const apiKey = request.headers.get('X-Graft-Key')

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing X-Graft-Key header' },
      { status: 401 }
    )
  }

  if (!validateKeyFormat(apiKey)) {
    return NextResponse.json(
      { error: 'Invalid API key format' },
      { status: 401 }
    )
  }

  const db = createAdminClient()
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

  // Update last_used_at (fire and forget — don't await)
  db.from('team_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id)
    .then(() => {})

  // Fetch all active scripts for this team
  const { data: scripts, error: scriptsError } = await db
    .from('scripts')
    .select('id, name, target_urls, remote_config, current_version_id')
    .eq('team_id', keyRecord.team_id)
    .eq('is_active', true)

  if (scriptsError) {
    return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 })
  }

  if (!scripts?.length) {
    const response: CompanionSyncResponse = { scripts: [], synced_at: new Date().toISOString() }
    return NextResponse.json(response)
  }

  // Fetch the code for each current version
  const versionIds = scripts
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

  const formattedScripts: CompanionScript[] = scripts
    .filter(s => s.current_version_id && versionMap[s.current_version_id])
    .map(s => {
      const version = versionMap[s.current_version_id!]
      return {
        id: s.id,
        name: s.name,
        code: version.code,
        target_urls: s.target_urls,
        remote_config: s.remote_config,
        version: version.version_number,
      }
    })

  const response: CompanionSyncResponse = {
    scripts: formattedScripts,
    synced_at: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    headers: {
      // Prevent any caching — Companion must always get fresh data
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
