import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRole  = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * createUserClient
 * Used in API routes for user-authenticated operations.
 * Passes the user's JWT so Row Level Security applies normally.
 *
 * Usage in an API route:
 *   const token = request.headers.get('Authorization')?.replace('Bearer ', '')
 *   const db = createUserClient(token)
 */
export function createUserClient(token?: string | null): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnon, {
    global: token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {},
    auth: { persistSession: false },
  })
}

/**
 * createAdminClient
 * Bypasses Row Level Security entirely.
 * ONLY use server-side in:
 *  - /api/companion/sync  (Companion has no user JWT)
 *  - /api/analytics       (Companion reports events without user auth)
 *
 * Never expose or use on the client side.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
export function createAdminClient(): SupabaseClient {
  if (!serviceRole) {
    throw new Error(
      '[Graft] SUPABASE_SERVICE_ROLE_KEY is not set in .env.local. ' +
      'Add it from: Supabase Dashboard → Settings → API → service_role key'
    )
  }
  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * extractToken
 * Helper to pull the Bearer token from request headers.
 */
export function extractToken(request: Request): string | null {
  return request.headers.get('Authorization')?.replace('Bearer ', '') ?? null
}
