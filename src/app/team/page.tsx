'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { useAuth, apiFetch } from '@/lib/auth'
import type { Team, TeamMember, ApiKeySafe, ApiKeyCreatedResponse } from '@/lib/types'

export default function TeamPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [teams, setTeams] = useState<(Team & { role: string })[]>([])
  const [activeTeam, setActiveTeam] = useState<string | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKeySafe[]>([])
  const [newKey, setNewKey] = useState<ApiKeyCreatedResponse | null>(null)
  const [keyLabel, setKeyLabel] = useState('Default Key')
  const [inviteEmail, setInviteEmail] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login')
  }, [user, loading, router])

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

  useEffect(() => {
    if (!activeTeam) return
    loadTeamData()
  }, [activeTeam])

  const loadTeamData = async () => {
    if (!activeTeam) return
    const [teamRes, keysRes] = await Promise.all([
      apiFetch(`/api/teams/${activeTeam}`),
      apiFetch(`/api/teams/${activeTeam}/apikeys`),
    ])
    const teamData = await teamRes.json()
    const keysData = await keysRes.json()
    setMembers(teamData.members || [])
    setApiKeys(keysData.keys || [])
  }

  const generateKey = async () => {
    const res = await apiFetch(`/api/teams/${activeTeam}/apikeys`, {
      method: 'POST',
      body: JSON.stringify({ label: keyLabel }),
    })
    const data = await res.json()
    if (data.key) {
      setNewKey(data)
      setApiKeys(prev => [{ id: data.id, key_prefix: data.key_prefix, label: data.label, created_at: data.created_at, last_used_at: null }, ...prev])
    }
  }

  const revokeKey = async (keyId: string) => {
    if (!confirm('Revoke this API key? Companions using it will lose access immediately.')) return
    await apiFetch(`/api/teams/${activeTeam}/apikeys?key_id=${keyId}`, { method: 'DELETE' })
    setApiKeys(prev => prev.filter(k => k.id !== keyId))
    if (newKey?.id === keyId) setNewKey(null)
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentTeam = teams.find(t => t.id === activeTeam)
  const isAdmin = currentTeam?.role === 'owner' || currentTeam?.role === 'admin'

  const timeSince = (date: string | null) => {
    if (!date) return 'Never'
    const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
    const h = Math.floor((Date.now() - new Date(date).getTime()) / 3600000)
    if (d > 0) return `${d}d ago`
    if (h > 0) return `${h}h ago`
    return 'Just now'
  }

  if (loading || !user) return null

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Team settings</h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
            Manage members and API keys for the Graft Companion extension.
          </p>
        </div>

        {/* Team selector */}
        {teams.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => setActiveTeam(team.id)}
                style={{
                  padding: '6px 14px', borderRadius: 100,
                  border: '1px solid', borderColor: activeTeam === team.id ? 'var(--orange)' : 'var(--border)',
                  background: activeTeam === team.id ? 'var(--orange-glow)' : 'transparent',
                  color: activeTeam === team.id ? 'var(--orange)' : 'var(--text-2)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {team.name}
              </button>
            ))}
          </div>
        )}

        {/* ── API Keys ─────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>API Keys</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
              API keys authenticate the Graft Companion extension. Paste a key into the Companion popup on each browser.
            </p>
          </div>

          {/* New key banner */}
          {newKey && (
            <div style={{
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 10, padding: '16px 18px', marginBottom: 16,
            }} className="fade-in">
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', marginBottom: 8 }}>
                ✓ API key created — copy it now, it won't be shown again
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{
                  flex: 1, fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                  background: '#050505', padding: '8px 12px', borderRadius: 6,
                  color: 'var(--green)', border: '1px solid rgba(34,197,94,0.15)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {newKey.key}
                </code>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => copyKey(newKey.key)}
                  style={{ flexShrink: 0 }}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Generate key form */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input
                className="graft-input"
                placeholder="Key label (e.g. Production, Dev Team)"
                value={keyLabel}
                onChange={e => setKeyLabel(e.target.value)}
                style={{ maxWidth: 260 }}
              />
              <button className="btn btn-primary btn-sm" onClick={generateKey}>
                + Generate key
              </button>
            </div>
          )}

          {/* Keys list */}
          {apiKeys.length === 0 ? (
            <div style={{
              padding: '32px', textAlign: 'center',
              border: '1px dashed var(--border)', borderRadius: 10,
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                No API keys yet. Generate one to connect the Companion extension.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {apiKeys.map(key => (
                <div key={key.id} className="graft-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{key.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 12 }}>
                      <code style={{ fontFamily: 'monospace' }}>{key.key_prefix}••••••••</code>
                      <span>Created {timeSince(key.created_at)}</span>
                      <span>Last used: {timeSince(key.last_used_at)}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <button className="btn btn-danger btn-sm" onClick={() => revokeKey(key.id)}>
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <hr className="divider" style={{ marginBottom: 40 }} />

        {/* ── Members ──────────────────────────────────────── */}
        <section>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Members</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {members.length} member{members.length !== 1 ? 's' : ''} in this team
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map(member => (
              <div key={member.id} className="graft-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600, color: 'var(--text-2)', flexShrink: 0,
                }}>
                  {member.user_id.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-2)' }}>
                    {member.user_id}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Joined {timeSince(member.joined_at)}
                  </div>
                </div>
                <span className={`badge ${member.role === 'owner' ? 'badge-orange' : member.role === 'admin' ? 'badge-blue' : 'badge-zinc'}`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
