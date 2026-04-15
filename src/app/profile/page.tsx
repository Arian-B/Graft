'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useAuth, apiFetch } from '@/lib/auth'
import type { Team } from '@/lib/types'

interface UserProfile {
  id: string
  email: string
  name: string
  github_username: string
  avatar_url: string
  created_at: string
}

export default function ProfilePage() {
  const { user, loading, signOut, signInWithGitHub } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teams, setTeams] = useState<(Team & { role: string; joined_at: string })[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    apiFetch('/api/me')
      .then(r => r.json())
      .then(data => {
        if (data.user)  setProfile(data.user)
        if (data.teams) setTeams(data.teams)
        setDataLoading(false)
      })
  }, [user])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  const roleColor = (role: string) => {
    if (role === 'owner') return 'badge-primary'
    if (role === 'admin') return 'badge-blue'
    return 'badge-zinc'
  }

  if (loading || !user) return null

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>

        {dataLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: 200, height: 24, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: 140, height: 16 }} />
              </div>
            </div>
            <div className="skeleton" style={{ height: 120 }} />
            <div className="skeleton" style={{ height: 180 }} />
          </div>
        ) : profile ? (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── Profile card ──────────────────────────────────── */}
            <div className="graft-card" style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>

                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    style={{
                      width: 80, height: 80, borderRadius: '50%',
                      border: '2px solid var(--border)',
                    }}
                  />
                  {/* GitHub logo badge */}
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 24, height: 24,
                    background: '#24292e',
                    borderRadius: '50%',
                    border: '2px solid var(--bg-surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </div>
                </div>

                {/* Name + username */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{
                    fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em',
                    marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {profile.name || profile.github_username}
                  </h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <a
                      href={`https://github.com/${profile.github_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 14, color: 'var(--text-2)',
                        textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      @{profile.github_username} ↗
                    </a>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                      {profile.email}
                    </span>
                  </div>
                </div>

                {/* GitHub profile link */}
                <a
                  href={`https://github.com/${profile.github_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  View GitHub profile
                </a>
              </div>

              {/* Meta row */}
              <hr className="divider" style={{ marginBottom: 18 }} />
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                {[
                  { label: 'Joined Graft', value: formatDate(profile.created_at) },
                  { label: 'Teams', value: String(teams.length) },
                  { label: 'Graft ID', value: profile.id.substring(0, 8) + '...', mono: true },
                ].map(({ label, value, mono }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      {label}
                    </div>
                    <div style={{
                      fontSize: 14, fontWeight: 500, color: 'var(--text-2)',
                      fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
                    }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Profile sync note ──────────────────────────────── */}
            <div style={{
              padding: '12px 16px',
              background: 'rgba(59,130,246,0.06)',
              border: '1px solid rgba(59,130,246,0.15)',
              borderRadius: 8,
              fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6,
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
              <span>
                Your name, username, and avatar are synced directly from GitHub.
                If you change your GitHub profile, the changes will appear in Graft the next time you sign in.
                You never need to update a profile form.
              </span>
            </div>

            {/* ── Teams ──────────────────────────────────────────── */}
            {teams.length > 0 && (
              <div className="graft-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700 }}>Your teams</h2>
                </div>
                <div>
                  {teams.map((team, i) => (
                    <div
                      key={team.id}
                      style={{
                        padding: '14px 20px',
                        borderBottom: i < teams.length - 1 ? '1px solid var(--border)' : 'none',
                        display: 'flex', alignItems: 'center', gap: 14,
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 9,
                        background: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800, color: 'var(--primary-foreground)', flexShrink: 0,
                      }}>
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{team.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {team.slug} · joined {formatDate(team.joined_at)}
                        </div>
                      </div>
                      <span className={`badge ${roleColor(team.role)}`}>{team.role}</span>
                      <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                        Open →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Account actions ────────────────────────────────── */}
            <div className="graft-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Account</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* Sign out */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 16,
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Sign out</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Ends your current session on this device.
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
                </div>

                <hr className="divider" />

                {/* Switch account */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 16,
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Switch GitHub account</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Sign out and log in with a different GitHub account.
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      // Sign out first, then trigger OAuth with account chooser
                      const { getSupabaseBrowser } = await import('@/lib/auth')
                      await getSupabaseBrowser().auth.signOut()
                      await signInWithGitHub()
                    }}
                  >
                    Switch account
                  </button>
                </div>

              </div>
            </div>

          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ color: 'var(--text-muted)' }}>Failed to load profile.</p>
            <button className="btn btn-ghost btn-sm" onClick={() => router.refresh()} style={{ marginTop: 12 }}>
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
