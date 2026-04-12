import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, extractToken } from '@/lib/supabase'

/**
 * GET /api/analytics/summary?team_id=UUID&days=7
 *
 * Team-wide analytics aggregation across ALL scripts.
 * Shows top-level health metrics for the team's entire deployment.
 *
 * Useful for:
 *  - Dashboard header stats (total fires today, error rate, active browsers)
 *  - Per-script breakdown (which scripts are most active / erroring most)
 *
 * Query params:
 *   team_id  (required)
 *   days     (optional, default 7, max 30)
 */
export async function GET(request: NextRequest) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('team_id')
  const days   = Math.min(parseInt(searchParams.get('days') || '7'), 30)

  if (!teamId) {
    return NextResponse.json({ error: 'team_id query param is required' }, { status: 400 })
  }

  // Verify user is a member of this team (RLS will also enforce this)
  const { data: membership } = await db
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden — not a member of this team' }, { status: 403 })
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // Get all scripts for this team
  const { data: scripts } = await db
    .from('scripts')
    .select('id, name, is_active')
    .eq('team_id', teamId)

  if (!scripts?.length) {
    return NextResponse.json({
      team_id: teamId,
      period_days: days,
      summary: { total_fires: 0, total_errors: 0, error_rate_pct: 0, unique_companions: 0, active_scripts: 0 },
      per_script: [],
    })
  }

  const scriptIds = scripts.map(s => s.id)

  // Fetch all events for the period in one query
  const { data: events } = await db
    .from('analytics_events')
    .select('script_id, event_type, companion_id')
    .in('script_id', scriptIds)
    .gte('created_at', since)

  const allEvents = events || []

  // Team-wide totals
  const totalFires  = allEvents.filter(e => e.event_type === 'script_fired').length
  const totalErrors = allEvents.filter(e => e.event_type === 'script_error').length
  const uniqueCompanions = new Set(allEvents.map(e => e.companion_id).filter(Boolean)).size
  const errorRate = totalFires > 0 ? parseFloat(((totalErrors / totalFires) * 100).toFixed(1)) : 0

  // Per-script breakdown
  const perScript = scripts.map(script => {
    const scriptEvents = allEvents.filter(e => e.script_id === script.id)
    const fires  = scriptEvents.filter(e => e.event_type === 'script_fired').length
    const errors = scriptEvents.filter(e => e.event_type === 'script_error').length
    const companions = new Set(scriptEvents.map(e => e.companion_id).filter(Boolean)).size

    return {
      script_id:   script.id,
      name:        script.name,
      is_active:   script.is_active,
      fires,
      errors,
      error_rate_pct: fires > 0 ? parseFloat(((errors / fires) * 100).toFixed(1)) : 0,
      unique_companions: companions,
    }
  }).sort((a, b) => b.fires - a.fires) // Sort by most active first

  return NextResponse.json({
    team_id: teamId,
    period_days: days,
    summary: {
      total_fires:       totalFires,
      total_errors:      totalErrors,
      error_rate_pct:    errorRate,
      unique_companions: uniqueCompanions,
      active_scripts:    scripts.filter(s => s.is_active).length,
      total_scripts:     scripts.length,
    },
    per_script: perScript,
  })
}
