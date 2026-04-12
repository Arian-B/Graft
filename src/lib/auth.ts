'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient, SupabaseClient, User } from '@supabase/supabase-js'

// ─── Browser Supabase Client (singleton) ─────────────────────────────────────

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession:     true,  // Store session in localStorage (survives tab/browser close)
          autoRefreshToken:   true,  // Silently refresh the access token before it expires
          detectSessionInUrl: true,  // Picks up the auth code from callback URL
          storageKey:         'graft-auth', // Named key so it doesn't conflict with other apps
        },
      }
    )
  }
  return browserClient
}

// ─── Auth Context ─────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user:    User | null
  loading: boolean
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  user:    null,
  loading: true,
  signInWithGitHub: async () => {},
  signOut: async () => {},
})

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext)
}

// ─── Authenticated fetch helper ───────────────────────────────────────────────

export async function authHeaders(): Promise<HeadersInit> {
  const supabase = getSupabaseBrowser()
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  }
}

export async function apiFetch(path: string, options?: RequestInit) {
  const headers = await authHeaders()
  return fetch(path, {
    ...options,
    headers: { ...headers, ...options?.headers },
  })
}
