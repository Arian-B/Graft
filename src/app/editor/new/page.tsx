'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Navbar from '@/components/layout/Navbar'
import { useAuth, apiFetch } from '@/lib/auth'
import type { Team } from '@/lib/types'
import { Rocket, AlertTriangle } from 'lucide-react'

// Monaco must be client-side only
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const DEFAULT_CODE = `// Graft Browser Script
// This code runs in every browser tab that matches your target URLs.
// 'remoteConfig' is the live config object you can update from the dashboard.

(function() {
  'use strict';

  // Your code here
  console.log('[Graft] Script loaded on', window.location.href);

  // Example: Add a banner to the page
  // const banner = document.createElement('div');
  // banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#f97316;color:white;padding:8px;text-align:center;z-index:9999;font-size:13px;';
  // banner.textContent = remoteConfig.message || 'Graft script running';
  // document.body.appendChild(banner);

})();`

export default function NewScriptPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedTeam = searchParams.get('team')

  const [teams, setTeams] = useState<(Team & { role: string })[]>([])
  const [selectedTeam, setSelectedTeam] = useState(preselectedTeam || '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [urls, setUrls] = useState<string[]>([])
  const [code, setCode] = useState(DEFAULT_CODE)
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState('')
  const urlInputRef = useRef<HTMLInputElement>(null)

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
        if (!preselectedTeam && t.length > 0) setSelectedTeam(t[0].id)
      })
  }, [user])

  const addUrl = () => {
    const val = urlInput.trim()
    if (!val || urls.includes(val)) return
    setUrls(prev => [...prev, val])
    setUrlInput('')
    urlInputRef.current?.focus()
  }

  const removeUrl = (url: string) => setUrls(prev => prev.filter(u => u !== url))

  const deploy = async () => {
    setError('')
    if (!selectedTeam || !name.trim() || !code.trim() || urls.length === 0) {
      setError('Please fill in: team, script name, at least one target URL, and the code.')
      return
    }

    setDeploying(true)
    try {
      const res = await apiFetch('/api/scripts', {
        method: 'POST',
        body: JSON.stringify({
          team_id: selectedTeam,
          name: name.trim(),
          description: description.trim() || undefined,
          target_urls: urls,
          code,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Deploy failed')
      router.push(`/editor/${data.script.id}`)
    } catch (err: any) {
      setError(err.message)
      setDeploying(false)
    }
  }

  if (loading || !user) return null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* ── Top bar ─────────────────────────────────────── */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: 16, height: 52,
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>← Back</button>
        <span style={{ fontSize: 14, color: 'var(--text-2)' }}>New script</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          {error && (
            <span style={{ fontSize: 12, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} />
              {error}
            </span>
          )}
          <button
            className="btn btn-primary"
            onClick={deploy}
            disabled={deploying}
            style={{ minWidth: 120 }}
          >
            {deploying ? (
              <>
                <span className="dot dot-pulse" style={{ background: 'white' }} />
                Deploying...
              </>
            ) : (
              <><Rocket size={14} /> Create & Deploy</>
            )}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Sidebar ─────────────────────────────────────── */}
        <div style={{
          width: 300,
          borderRight: '1px solid var(--border)',
          padding: 20,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 20,
          flexShrink: 0,
        }}>

          {/* Team */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Team</label>
            <select
              className="graft-input"
              value={selectedTeam}
              onChange={e => setSelectedTeam(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="">Select a team</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Script name</label>
            <input
              className="graft-input"
              placeholder="GitHub PR Highlighter"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              className="graft-input"
              placeholder="What does this script do?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Target URLs */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              Target URLs
            </label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                ref={urlInputRef}
                className="graft-input"
                placeholder="*://github.com/*"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addUrl()}
                style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
              />
              <button className="btn btn-ghost btn-sm" onClick={addUrl} style={{ flexShrink: 0 }}>Add</button>
            </div>
            {urls.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {urls.map(url => (
                  <div key={url} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '4px 8px',
                  }}>
                    <code style={{ flex: 1, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {url}
                    </code>
                    <button onClick={() => removeUrl(url)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            {urls.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                e.g. *://github.com/* or *://jira.company.com/*
              </p>
            )}
          </div>
        </div>

        {/* ── Monaco Editor ───────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MonacoEditor
            height="100%"
            language="javascript"
            value={code}
            onChange={val => setCode(val || '')}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: 'JetBrains Mono, SF Mono, Fira Code, monospace',
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'off',
              tabSize: 2,
              automaticLayout: true,
              renderLineHighlight: 'line',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              padding: { top: 20 },
            }}
          />
        </div>
      </div>
    </div>
  )
}
