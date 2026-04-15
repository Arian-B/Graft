'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import { useAuth, apiFetch } from '@/lib/auth'
import { usePathname } from 'next/navigation'
import { Bell, Check, X, ChevronDown } from 'lucide-react'

type NavbarProps = {
  teams?: any[]
  activeTeam?: string | null
  onChangeTeam?: (teamId: string) => void
}

export default function Navbar({ teams = [], activeTeam = null, onChangeTeam }: NavbarProps) {
  const { user, loading, signInWithGitHub, signOut } = useAuth()
  const pathname = usePathname()
  
  const [invites, setInvites] = useState<any[]>([])
  const [showInbox, setShowInbox] = useState(false)
  const [showTeams, setShowTeams] = useState(false)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  useEffect(() => {
    if (user) {
      apiFetch('/api/me').then(r => r.json()).then(data => {
        if (data.invites) setInvites(data.invites)
      })
    }
  }, [user])

  const inboxRef = useRef<HTMLDivElement>(null)
  const teamsRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inboxRef.current && !inboxRef.current.contains(event.target as Node)) {
        setShowInbox(false)
      }
      if (teamsRef.current && !teamsRef.current.contains(event.target as Node)) {
        setShowTeams(false)
      }
    }
    if (showInbox || showTeams) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showInbox, showTeams])

  const handleInvite = async (id: string, action: 'accept' | 'decline') => {
    await apiFetch(`/api/me/invites/${id}/${action}`, { method: 'POST' })
    setInvites(prev => prev.filter(i => i.id !== id))
    // refresh page if accepted to load team
    if (action === 'accept') window.location.reload()
  }

  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      background: 'rgba(10,10,10,0.8)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}>
        {/* Logo & Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <Logo size={28} />
          </Link>

          {/* Vercel/Supabase style Workspace Team Dropdown */}
          {user && teams.length > 0 && typeof onChangeTeam === 'function' && (
            <div ref={teamsRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowTeams(!showTeams)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'transparent', border: 'none',
                  color: 'var(--text)', fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {teams.find(t => t.id === activeTeam)?.name || 'Select Workspace'}
                <ChevronDown size={14} color="var(--text-muted)" />
              </button>

              {showTeams && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 8,
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: 8, width: 220, zIndex: 200,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden'
                }}>
                  <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>
                    Your Teams
                  </div>
                  <div style={{ padding: '4px' }}>
                    {teams.map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onChangeTeam(t.id)
                          setShowTeams(false)
                        }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: 'transparent', border: 'none', padding: '8px 10px',
                          color: 'var(--text)', fontSize: 13, textAlign: 'left', borderRadius: 4,
                          cursor: 'pointer'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                        {activeTeam === t.id && <Check size={14} color="var(--primary)" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nav links (authenticated only) */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
            {[
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/team',      label: 'Team' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: isActive(href) ? 'var(--text)' : 'var(--text-2)',
                  textDecoration: 'none',
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: isActive(href) ? 'var(--bg-elevated)' : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {loading ? (
            <div className="skeleton" style={{ width: 80, height: 32 }} />
          ) : user ? (
            <>
              {/* Inbox Bell */}
              <div ref={inboxRef} style={{ position: 'relative' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ position: 'relative', padding: '6px' }}
                  onClick={() => setShowInbox(!showInbox)}
                >
                  <Bell size={16} />
                  {invites.length > 0 && (
                    <span style={{
                      position: 'absolute', top: 0, right: 0,
                      background: 'var(--primary)', width: 8, height: 8, borderRadius: '50%'
                    }} />
                  )}
                </button>
                
                {showInbox && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8,
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: 8, width: 280, padding: 12, zIndex: 200,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                  }}>
                    <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>Pending Invites</h4>
                    {invites.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No pending invites.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {invites.map(inv => (
                          <div key={inv.id} style={{ background: 'var(--bg-elevated)', padding: 8, borderRadius: 6 }}>
                            <div style={{ fontSize: 13, marginBottom: 6 }}>
                              <span style={{ fontWeight: 600 }}>{inv.teams?.name}</span> invited you as <span style={{ color: 'var(--primary)' }}>{inv.role}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-primary btn-sm" style={{ flex: 1, padding: '4px' }} onClick={() => handleInvite(inv.id, 'accept')}>
                                <Check size={12}/> Accept
                              </button>
                              <button className="btn btn-ghost btn-sm" style={{ flex: 1, padding: '4px' }} onClick={() => handleInvite(inv.id, 'decline')}>
                                <X size={12}/> Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Link
                href="/profile"
                style={{
                  fontSize: 13, color: 'var(--text-2)',
                  display: 'flex', alignItems: 'center', gap: 8,
                  textDecoration: 'none',
                  padding: '3px 6px', borderRadius: 6,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {user.user_metadata?.avatar_url && (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt=""
                    style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)' }}
                  />
                )}
                {user.user_metadata?.user_name || user.email}
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={signInWithGitHub}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Sign in with GitHub
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
