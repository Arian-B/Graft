import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, extractToken } from '@/lib/supabase'
import type { CreateScriptBody } from '@/lib/types'

// GET /api/scripts?team_id=UUID — List all scripts for a team
export async function GET(request: NextRequest) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('team_id')

  if (!teamId) {
    return NextResponse.json({ error: 'team_id query param is required' }, { status: 400 })
  }

  // Fetch scripts + their total version count
  const { data: scripts, error } = await db
    .from('scripts')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!scripts?.length) return NextResponse.json({ scripts: [] })

  // Fetch current versions for all scripts in one query
  const versionIds = scripts
    .map(s => s.current_version_id)
    .filter(Boolean) as string[]

  const { data: versions } = versionIds.length
    ? await db
        .from('script_versions')
        .select('id, version_number, deployed_at')
        .in('id', versionIds)
    : { data: [] }

  const versionMap = Object.fromEntries(
    (versions || []).map(v => [v.id, v])
  )

  // Count versions per script
  const { data: counts } = await db
    .from('script_versions')
    .select('script_id')
    .in('script_id', scripts.map(s => s.id))

  const countMap: Record<string, number> = {}
  ;(counts || []).forEach((c: any) => {
    countMap[c.script_id] = (countMap[c.script_id] || 0) + 1
  })

  const enriched = scripts.map(script => ({
    ...script,
    current_version: script.current_version_id
      ? versionMap[script.current_version_id] ?? null
      : null,
    version_count: countMap[script.id] || 0,
  }))

  return NextResponse.json({ scripts: enriched })
}

// POST /api/scripts — Create a new script + deploy version 1
export async function POST(request: NextRequest) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: CreateScriptBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { team_id, name, description, target_urls, code } = body

  if (!team_id || !name?.trim() || !code?.trim()) {
    return NextResponse.json({ error: 'team_id, name, and code are required' }, { status: 400 })
  }

  if (!Array.isArray(target_urls) || target_urls.length === 0) {
    return NextResponse.json({ error: 'target_urls must be a non-empty array' }, { status: 400 })
  }

  // 1. Create the script record (no current_version_id yet)
  const { data: script, error: scriptError } = await db
    .from('scripts')
    .insert({
      team_id,
      owner_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      target_urls,
    })
    .select()
    .single()

  if (scriptError) return NextResponse.json({ error: scriptError.message }, { status: 500 })

  // 2. Create version 1
  const { data: version, error: versionError } = await db
    .from('script_versions')
    .insert({
      script_id: script.id,
      version_number: 1,
      code: code.trim(),
      deployed_by: user.id,
    })
    .select()
    .single()

  if (versionError) return NextResponse.json({ error: versionError.message }, { status: 500 })

  // 3. Point script at version 1
  const { data: updatedScript, error: updateError } = await db
    .from('scripts')
    .update({ current_version_id: version.id })
    .eq('id', script.id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json(
    { script: updatedScript, version, message: 'Script created and deployed as v1' },
    { status: 201 }
  )
}
