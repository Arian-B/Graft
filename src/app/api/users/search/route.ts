import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, extractToken } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const q = searchParams.get('q')?.toLowerCase()

  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] })
  }

  // Use admin client to bypass RLS and query auth.users
  const adminDb = createAdminClient()

  // We can't easily ILIKE on jsonb fields efficiently in standard Supabase Data API
  // but we can search users from public.companion_registrations or just do a generic filter 
  // or RPC. Wait, auth.users isn't easily searchable by a partial JSONB field.
  // We can query auth.users directly via admin client if we just fetch all and filter in memory
  // (Assuming small user base for MVP, otherwise we'd need a profile table or Postgres function).
  
  const { data: { users }, error } = await adminDb.auth.admin.listUsers({ perPage: 1000 })
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const matchingUsers = users
    .filter(u => {
      const username = (u.user_metadata?.user_name || '').toLowerCase()
      const name = (u.user_metadata?.full_name || '').toLowerCase()
      return username.includes(q) || name.includes(q)
    })
    .map(u => ({
      id: u.id,
      username: u.user_metadata?.user_name,
      name: u.user_metadata?.full_name || u.user_metadata?.user_name,
      avatar_url: u.user_metadata?.avatar_url
    }))
    .slice(0, 5) // Return top 5 matches

  return NextResponse.json({ users: matchingUsers })
}
