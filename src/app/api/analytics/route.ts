import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { hashApiKey, validateKeyFormat } from '@/lib/api-key'
import type { AnalyticsIngestBody } from '@/lib/types'

/**
 * POST /api/analytics
 *
 * Receives batched analytics events from Graft Companion extensions.
 * Validates the team API key, verifies script ownership, then bulk-inserts events.
 *
 * Authentication: Header `X-Graft-Key: graft_xxxxx...`
 * No user JWT required — same pattern as /api/companion/sync
 *
 * Body: { events: [{ script_id, event_type, page_url, companion_id, metadata }] }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiKey = request.headers.get('X-Graft-Key')

  if (!apiKey || !validateKeyFormat(apiKey)) {
    return NextResponse.json({ error: 'Missing or invalid X-Graft-Key header' }, { status: 401 })
  }

  let body: AnalyticsIngestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { events } = body
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: 'events must be a non-empty array' }, { status: 400 })
  }

  // Cap batch size to prevent abuse
  if (events.length > 100) {
    return NextResponse.json({ error: 'Maximum 100 events per request' }, { status: 400 })
  }

  const db = createAdminClient()
  const keyHash = hashApiKey(apiKey)

  // Validate the API key and get team
  const { data: keyRecord, error: keyError } = await db
    .from('team_api_keys')
    .select('team_id')
    .eq('key_hash', keyHash)
    .single()

  if (keyError || !keyRecord) {
    return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 })
  }

  // Get all script IDs belonging to this team (for validation)
  const scriptIds = [...new Set(events.map(e => e.script_id))]
  const { data: teamScripts } = await db
    .from('scripts')
    .select('id')
    .eq('team_id', keyRecord.team_id)
    .in('id', scriptIds)

  const validScriptIds = new Set((teamScripts || []).map(s => s.id))

  // Build the insert payload — only include events for valid scripts
  const validatedEvents = events
    .filter(e => validScriptIds.has(e.script_id))
    .map(e => ({
      script_id: e.script_id,
      event_type: e.event_type,
      page_url: e.page_url ?? null,
      companion_id: e.companion_id ?? null,
      metadata: e.metadata ?? {},
    }))

  if (validatedEvents.length === 0) {
    return NextResponse.json(
      { error: 'None of the provided script_ids belong to this team' },
      { status: 403 }
    )
  }

  const { error: insertError } = await db
    .from('analytics_events')
    .insert(validatedEvents)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    accepted: validatedEvents.length,
    rejected: events.length - validatedEvents.length,
  })
}
