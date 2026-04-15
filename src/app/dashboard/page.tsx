'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useAuth, apiFetch } from '@/lib/auth'
import type { ScriptWithVersion, Team } from '@/lib/types'
import { Rocket, FileCode, Plus } from 'lucide-react'
import { motion } from 'framer-motion'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [teams, setTeams] = useState<(Team & { role: string })[]>([])
  const [activeTeam, setActiveTeam] = useState<string | null>(null)
  const [scripts, setScripts] = useState<ScriptWithVersion[]>([])
  const [scriptsLoading, setScriptsLoading] = useState(false)
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamSlug, setTeamSlug] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login')
  }, [user, loading, router])

  // Load teams
  useEffect(() => {
    if (!user) return
    apiFetch('/api/teams')
      .then(r => r.json())
      .then(data => {
        const t = data.teams || []
        setTeams(t)
        if (t.length > 0) setActiveTeam(t[0].id)
      })
  }, [user])

  // Load scripts when team changes
  useEffect(() => {
    if (!activeTeam) return
    setScriptsLoading(true)
    apiFetch(`/api/scripts?team_id=${activeTeam}`)
      .then(r => r.json())
      .then(data => {
        setScripts(data.scripts || [])
        setScriptsLoading(false)
      })
  }, [activeTeam])

  // Auto-fill slug from name
  useEffect(() => {
    setTeamSlug(teamName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))
  }, [teamName])

  const createTeam = async () => {
    setCreateError(null)
    if (!teamName.trim() || !teamSlug.trim()) {
      setCreateError("Name and slug are required")
      return
    }
    setCreating(true)
    try {
      const res = await apiFetch('/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: teamName.trim(), slug: teamSlug.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.team) {
        setTeams(prev => [...prev, { ...data.team, role: 'owner' }])
        setActiveTeam(data.team.id)
        setShowCreateTeam(false)
        setTeamName('')
      } else {
        setCreateError(data.error || 'Failed to create team')
      }
    } catch (err: any) {
      setCreateError(err.message || 'Network error')
    }
    setCreating(false)
  }

  const toggleScript = async (scriptId: string, isActive: boolean) => {
    await apiFetch(`/api/scripts/${scriptId}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: !isActive }),
    })
    setScripts(prev => prev.map(s => s.id === scriptId ? { ...s, is_active: !isActive } : s))
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 160 }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar teams={teams} activeTeam={activeTeam} onChangeTeam={setActiveTeam} />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}
      >

        {/* ── Header ─────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
              Dashboard
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
              {scripts.length} script{scripts.length !== 1 ? 's' : ''} deployed ·{' '}
              {scripts.filter(s => s.is_active).length} active
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateTeam(true)}>
              <Plus size={14}/> New team
            </button>
            {activeTeam && (
              <Link
                href={`/editor/new?team=${activeTeam}`}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14}/> New script
              </Link>
            )}
          </div>
        </div>

        {/* ── No teams state ──────────────────────── */}
        {teams.length === 0 && !showCreateTeam && (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            border: '1px dashed var(--border)', borderRadius: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Rocket size={48} color="var(--primary)" strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 10 }}>Create your first team</h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
              Teams are how Graft groups scripts together.
              Create one to start deploying scripts to your teammates' browsers.
            </p>
            <button className="btn btn-primary" onClick={() => setShowCreateTeam(true)}>
              Create team →
            </button>
          </div>
        )}

        {/* ── Create Team Modal ───────────────────── */}
        {showCreateTeam && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, padding: 24,
          }}>
            <div className="graft-card fade-in" style={{ width: '100%', maxWidth: 440, padding: 28 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Create a team</h2>
              <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>
                A team groups your scripts and manages API keys for the Companion.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                    Team name
                  </label>
                  <input
                    className="graft-input"
                    placeholder="My Dev Team"
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                    Slug <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(URL identifier)</span>
                  </label>
                  <input
                    className="graft-input"
                    placeholder="my-dev-team"
                    value={teamSlug}
                    onChange={e => setTeamSlug(e.target.value)}
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end', alignItems: 'center' }}>
                {createError && <span style={{ color: 'var(--red)', fontSize: 13, marginRight: 'auto' }}>{createError}</span>}
                <button className="btn btn-ghost" onClick={() => { setShowCreateTeam(false); setCreateError(null); }}>Cancel</button>
                <button className="btn btn-primary" onClick={createTeam} disabled={creating || !teamName.trim()}>
                  {creating ? 'Creating...' : 'Create team'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Scripts Grid ────────────────────────── */}
        {activeTeam && !scriptsLoading && scripts.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            border: '1px dashed var(--border)', borderRadius: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <FileCode size={48} color="var(--primary)" strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 10 }}>No scripts yet</h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>
              Create your first browser script to start automating.
            </p>
            <Link href={`/editor/new?team=${activeTeam}`} className="btn btn-primary">
              Write your first script →
            </Link>
          </div>
        )}

        {scriptsLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 180 }} />)}
          </div>
        )}

        {!scriptsLoading && scripts.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {scripts.map(script => (
              <ScriptCard key={script.id} script={script} onToggle={toggleScript} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Script Card ──────────────────────────────────────────────────────────────

function ScriptCard({
  script,
  onToggle,
}: {
  script: ScriptWithVersion
  onToggle: (id: string, active: boolean) => void
}) {
  const router = useRouter()
  const version = script.current_version

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(h / 24)
    if (d > 0) return `${d}d ago`
    if (h > 0) return `${h}h ago`
    return 'Just now'
  }

  return (
    <div
      className="graft-card"
      style={{ padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14 }}
      onClick={() => router.push(`/editor/${script.id}`)}
    >
      {/* Top */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: 15, fontWeight: 600, marginBottom: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {script.name}
          </h3>
          {script.description && (
            <p style={{
              fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {script.description}
            </p>
          )}
        </div>
        <span
          className={`badge ${script.is_active ? 'badge-green' : 'badge-zinc'}`}
          style={{ flexShrink: 0 }}
        >
          <span className={`dot ${script.is_active ? 'dot-pulse' : ''}`} />
          {script.is_active ? 'Active' : 'Paused'}
        </span>
      </div>

      {/* URL targets */}
      {script.target_urls.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {script.target_urls.slice(0, 2).map(url => (
            <code key={url} style={{
              fontSize: 10, background: 'var(--bg-elevated)', color: 'var(--text-muted)',
              padding: '2px 7px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace',
              border: '1px solid var(--border)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160,
            }}>
              {url}
            </code>
          ))}
          {script.target_urls.length > 2 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              +{script.target_urls.length - 2} more
            </span>
          )}
        </div>
      )}

      {/* Bottom */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 12, borderTop: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
          {version && (
            <span>v{version.version_number} · {timeSince(version.deployed_at)}</span>
          )}
          {!version && <span>Not deployed</span>}
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={e => { e.stopPropagation(); onToggle(script.id, script.is_active) }}
          style={{ fontSize: 11 }}
        >
          {script.is_active ? 'Pause' : 'Resume'}
        </button>
      </div>
    </div>
  )
}
