import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, extractToken } from '@/lib/supabase'

/**
 * GET /api/scripts/[id]/analytics
 *
 * Returns analytics summary for a specific script.
 * Requires user authentication — only team members can view their script's analytics.
 *
 * Query params:
 *   ?days=7    (default: 7, max: 30) — number of days to look back
 *   ?event=script_fired|script_error|config_fetched (optional filter)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify user has access to this script (RLS handles this)
  const { data: script, error: scriptError } = await db
    .from('scripts')
    .select('id, name')
    .eq('id', params.id)
    .single()

  if (scriptError || !script) {
    return NextResponse.json({ error: 'Script not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const days = Math.min(parseInt(searchParams.get('days') || '7'), 30)
  const eventFilter = searchParams.get('event')

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // Build query
  let query = db
    .from('analytics_events')
    .select('id, event_type, page_url, companion_id, metadata, created_at')
    .eq('script_id', params.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (eventFilter) {
    query = query.eq('event_type', eventFilter)
  }

  const { data: events, error: eventsError } = await query

  if (eventsError) {
    return NextResponse.json({ error: eventsError.message }, { status: 500 })
  }

  // Compute summary stats
  const allEvents = events || []
  const totalFires   = allEvents.filter(e => e.event_type === 'script_fired').length
  const totalErrors  = allEvents.filter(e => e.event_type === 'script_error').length
  const uniquePages  = new Set(allEvents.map(e => e.page_url).filter(Boolean)).size
  const uniqueCompanions = new Set(allEvents.map(e => e.companion_id).filter(Boolean)).size
  const errorRate = totalFires > 0 ? ((totalErrors / totalFires) * 100).toFixed(1) : '0.0'

  return NextResponse.json({
    script_id: params.id,
    period_days: days,
    summary: {
      total_fires: totalFires,
      total_errors: totalErrors,
      error_rate_pct: parseFloat(errorRate),
      unique_pages: uniquePages,
      unique_companions: uniqueCompanions,
    },
    events: allEvents,
  })
}
