'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Navbar from '@/components/layout/Navbar'
import { useAuth, apiFetch } from '@/lib/auth'
import type { ScriptWithVersion, ScriptVersion } from '@/lib/types'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

type EditorTab = 'versions' | 'config' | 'analytics'

export default function EditorPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const scriptId = params.id as string

  const [script, setScript] = useState<ScriptWithVersion | null>(null)
  const [code, setCode] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [deployMsg, setDeployMsg] = useState('')
  const [versions, setVersions] = useState<(ScriptVersion & { is_current: boolean })[]>([])
  const [activeTab, setActiveTab] = useState<EditorTab>('versions')
  const [analytics, setAnalytics] = useState<any>(null)
  const [configJson, setConfigJson] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user || !scriptId) return
    loadScript()
    loadVersions()
  }, [user, scriptId])

  const loadScript = async () => {
    const res = await apiFetch(`/api/scripts/${scriptId}`)
    const data = await res.json()
    if (data.script) {
      setScript(data.script)
      const currentCode = data.script.current_version?.code || ''
      setCode(currentCode)
      setConfigJson(JSON.stringify(data.script.remote_config || {}, null, 2))
    }
  }

  const loadVersions = async () => {
    const res = await apiFetch(`/api/scripts/${scriptId}/versions`)
    const data = await res.json()
    setVersions(data.versions || [])
  }

  const loadAnalytics = async () => {
    const res = await apiFetch(`/api/scripts/${scriptId}/analytics?days=7`)
    const data = await res.json()
    setAnalytics(data)
  }

  const deploy = async () => {
    if (!code.trim()) return
    setDeploying(true)
    setDeployMsg('')
    try {
      const res = await apiFetch(`/api/scripts/${scriptId}/deploy`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDeployMsg(data.message)
      setIsDirty(false)
      await Promise.all([loadScript(), loadVersions()])
    } catch (err: any) {
      setDeployMsg(`Error: ${err.message}`)
    }
    setDeploying(false)
  }

  const rollback = async (versionNumber: number) => {
    const res = await apiFetch(`/api/scripts/${scriptId}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ version_number: versionNumber }),
    })
    const data = await res.json()
    if (data.success) {
      await Promise.all([loadScript(), loadVersions()])
    }
  }

  const saveConfig = async () => {
    setSavingConfig(true)
    try {
      const config = JSON.parse(configJson)
      await apiFetch(`/api/scripts/${scriptId}/config`, {
        method: 'PUT',
        body: JSON.stringify({ config }),
      })
    } catch (err: any) {
      alert('Invalid JSON: ' + err.message)
    }
    setSavingConfig(false)
  }

  const handleCodeChange = (val: string | undefined) => {
    setCode(val || '')
    setIsDirty(true)
    setDeployMsg('')
  }

  const timeSince = (date: string) => {
    const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
    const h = Math.floor((Date.now() - new Date(date).getTime()) / 3600000)
    if (d > 0) return `${d}d ago`
    if (h > 0) return `${h}h ago`
    return 'Just now'
  }

  if (loading || !user) return null

  if (!script) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ padding: 40, maxWidth: 800, margin: '0 auto' }}>
          <div className="skeleton" style={{ height: 40, width: 300, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 400 }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* ── Editor top bar ──────────────────────────────── */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 16, height: 52,
        flexShrink: 0,
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/dashboard')}>← Dashboard</button>
        <hr className="divider" style={{ width: 1, height: 20, margin: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{script.name}</span>
          <span className={`badge ${script.is_active ? 'badge-green' : 'badge-zinc'} badge-sm`} style={{ fontSize: 10 }}>
            <span className={`dot ${script.is_active ? 'dot-pulse' : ''}`} />
            {script.is_active ? 'Active' : 'Paused'}
          </span>
          {script.current_version && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              v{script.current_version.version_number}
            </span>
          )}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {deployMsg && (
            <span style={{
              fontSize: 12,
              color: deployMsg.startsWith('Error') ? 'var(--red)' : 'var(--green)',
              maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {deployMsg}
            </span>
          )}
          {isDirty && (
            <span style={{ fontSize: 12, color: 'var(--yellow)' }}>● Unsaved changes</span>
          )}
          <button
            className="btn btn-primary"
            onClick={deploy}
            disabled={deploying}
            style={{ minWidth: 100 }}
          >
            {deploying ? (
              <><span className="dot dot-pulse" style={{ background: 'white' }} /> Deploying...</>
            ) : '🚀 Deploy'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Main editor ────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MonacoEditor
            height="100%"
            language="javascript"
            value={code}
            onChange={handleCodeChange}
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

        {/* ── Right Panel ─────────────────────────────────── */}
        <div style={{
          width: 300, borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          {/* Tab buttons */}
          <div style={{
            display: 'flex', borderBottom: '1px solid var(--border)',
            padding: '4px 8px', gap: 2,
          }}>
            {(['versions', 'config', 'analytics'] as EditorTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); if (tab === 'analytics') loadAnalytics() }}
                style={{
                  flex: 1, padding: '6px 4px',
                  background: activeTab === tab ? 'var(--bg-elevated)' : 'transparent',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                  color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)',
                  textTransform: 'capitalize', transition: 'all 0.15s',
                }}
              >
                {tab === 'versions' ? '📋 History' : tab === 'config' ? '⚙️ Config' : '📊 Stats'}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

            {/* Versions tab */}
            {activeTab === 'versions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                  {versions.length} version{versions.length !== 1 ? 's' : ''} total
                </p>
                {versions.map(v => (
                  <div key={v.id} style={{
                    padding: '10px 12px',
                    background: v.is_current ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                    border: `1px solid ${v.is_current ? 'var(--orange)' : 'var(--border)'}`,
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: v.is_current ? 'var(--orange)' : 'var(--text)' }}>
                        v{v.version_number}
                        {v.is_current && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--orange)' }}>LIVE</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {timeSince(v.deployed_at)}
                      </div>
                    </div>
                    {!v.is_current && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 10 }}
                        onClick={() => rollback(v.version_number)}
                      >
                        Rollback
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Config tab */}
            {activeTab === 'config' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  JSON config. Access in your script via <code style={{ fontSize: 10, background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3 }}>remoteConfig</code>. Changes propagate in 30s without redeploying.
                </p>
                <textarea
                  value={configJson}
                  onChange={e => setConfigJson(e.target.value)}
                  rows={14}
                  style={{
                    background: '#050505',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    lineHeight: 1.6,
                    padding: 12,
                    resize: 'vertical',
                    outline: 'none',
                    width: '100%',
                  }}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={saveConfig}
                  disabled={savingConfig}
                  style={{ alignSelf: 'flex-end' }}
                >
                  {savingConfig ? 'Saving...' : 'Save config'}
                </button>
              </div>
            )}

            {/* Analytics tab */}
            {activeTab === 'analytics' && (
              <div>
                {!analytics ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 52 }} />)}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last 7 days</p>
                    {[
                      { label: 'Total fires', value: analytics.summary.total_fires, color: 'var(--green)' },
                      { label: 'Errors', value: analytics.summary.total_errors, color: 'var(--red)' },
                      { label: 'Error rate', value: `${analytics.summary.error_rate_pct}%`, color: 'var(--yellow)' },
                      { label: 'Unique pages', value: analytics.summary.unique_pages, color: 'var(--blue)' },
                      { label: 'Active browsers', value: analytics.summary.unique_companions, color: 'var(--orange)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{
                        padding: '10px 14px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
                        <span style={{ fontSize: 18, fontWeight: 700, color }}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
