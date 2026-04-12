/**
 * Graft Companion — Background Service Worker
 *
 * Responsibilities:
 *  1. Poll the Graft API every 30 seconds for the team's active scripts
 *  2. Store received scripts in chrome.storage.local
 *  3. Broadcast updated scripts to all active content script tabs
 *  4. Buffer and flush analytics events every minute
 *  5. Handle manual sync requests from the popup
 */

// ─── Configuration ────────────────────────────────────────────────────────────

// Change to http://localhost:3000 for local development
const GRAFT_API_BASE = 'https://graft.vercel.app'

const SYNC_INTERVAL_MINUTES    = 0.5  // 30 seconds
const ANALYTICS_FLUSH_MINUTES  = 1    // 1 minute
const ALARM_SYNC               = 'graft-sync'
const ALARM_ANALYTICS          = 'graft-analytics-flush'

// ─── Analytics Buffer ─────────────────────────────────────────────────────────

let analyticsBuffer = []

// ─── Core Sync ────────────────────────────────────────────────────────────────

async function syncScripts() {
  const { graftApiKey } = await chrome.storage.sync.get(['graftApiKey'])

  if (!graftApiKey) {
    console.log('[Graft] No API key configured. Open the popup to set one.')
    await chrome.storage.local.set({
      graftStatus: 'unconfigured',
      graftScripts: [],
      graftScriptCount: 0,
    })
    return
  }

  try {
    await chrome.storage.local.set({ graftStatus: 'syncing' })

    const response = await fetch(`${GRAFT_API_BASE}/api/companion/sync`, {
      method: 'GET',
      headers: {
        'X-Graft-Key': graftApiKey,
        'Content-Type': 'application/json',
      },
    })

    if (response.status === 401) {
      console.error('[Graft] API key is invalid or revoked. Update it in the popup.')
      await chrome.storage.local.set({
        graftStatus: 'auth_error',
        graftScripts: [],
        graftScriptCount: 0,
      })
      return
    }

    if (!response.ok) {
      throw new Error(`Sync failed: HTTP ${response.status}`)
    }

    const data = await response.json()
    const scripts = data.scripts || []

    await chrome.storage.local.set({
      graftScripts: scripts,
      graftSyncedAt: data.synced_at,
      graftStatus: 'connected',
      graftScriptCount: scripts.length,
    })

    console.log(`[Graft] Synced ${scripts.length} script(s) at ${data.synced_at}`)

    // Broadcast to all tabs so content scripts update immediately
    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'GRAFT_SCRIPTS_UPDATED',
          scripts,
        }).catch(() => {
          // Tab may not have content script loaded (e.g., chrome:// pages) — safe to ignore
        })
      }
    }

  } catch (err) {
    console.error('[Graft] Sync error:', err)
    await chrome.storage.local.set({ graftStatus: 'error' })
  }
}

// ─── Analytics Flush ──────────────────────────────────────────────────────────

async function flushAnalytics() {
  if (analyticsBuffer.length === 0) return

  const { graftApiKey } = await chrome.storage.sync.get(['graftApiKey'])
  if (!graftApiKey) return

  const batch = analyticsBuffer.splice(0, 100)

  try {
    const response = await fetch(`${GRAFT_API_BASE}/api/analytics`, {
      method: 'POST',
      headers: {
        'X-Graft-Key': graftApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events: batch }),
    })

    if (!response.ok) {
      // Re-queue if failed
      analyticsBuffer.unshift(...batch)
    }
  } catch {
    // Re-queue on network failure
    analyticsBuffer.unshift(...batch)
  }
}

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // From content scripts: buffer an analytics event
  if (message.type === 'GRAFT_ANALYTICS_EVENT') {
    analyticsBuffer.push({
      script_id:    message.script_id,
      event_type:   message.event_type,
      page_url:     message.page_url,
      companion_id: message.companion_id,
      metadata:     message.metadata || {},
    })
    sendResponse({ queued: true })
    return true
  }

  // From popup: get current status for rendering
  if (message.type === 'GRAFT_GET_STATUS') {
    chrome.storage.local.get(
      ['graftStatus', 'graftSyncedAt', 'graftScriptCount'],
      (data) => sendResponse(data)
    )
    return true // Keep channel open for async response
  }

  // From popup: trigger an immediate sync (e.g. after API key is saved)
  if (message.type === 'GRAFT_FORCE_SYNC') {
    syncScripts().then(() => sendResponse({ ok: true }))
    return true
  }
})

// ─── Alarms ───────────────────────────────────────────────────────────────────

chrome.alarms.create(ALARM_SYNC, { periodInMinutes: SYNC_INTERVAL_MINUTES })
chrome.alarms.create(ALARM_ANALYTICS, { periodInMinutes: ANALYTICS_FLUSH_MINUTES })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_SYNC)      syncScripts()
  if (alarm.name === ALARM_ANALYTICS) flushAnalytics()
})

// ─── Startup ──────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Graft] Companion installed. Open the popup to configure your team API key.')
  syncScripts()
})

chrome.runtime.onStartup.addListener(syncScripts)
