/**
 * Graft Companion — Background Service Worker
 * 
 * Core responsibilities:
 *  1. Generate a stable companion_id (set once, persists forever)
 *  2. Poll /api/companion/sync every 30 seconds
 *  3. Pass companion_id header so dev-testing scripts can be returned
 *  4. Distribute scripts to content scripts via tab messages
 *  5. Buffer and flush analytics events every minute
 */

// ─── Config ───────────────────────────────────────────────────────────────────

// Change to https://graft.vercel.app for production
const GRAFT_API_BASE           = 'http://localhost:3000'
const SYNC_INTERVAL_MINUTES    = 0.5   // 30 seconds
const ANALYTICS_FLUSH_MINUTES  = 1
const ALARM_SYNC               = 'graft-sync'
const ALARM_ANALYTICS          = 'graft-analytics-flush'

// ─── Analytics buffer ─────────────────────────────────────────────────────────

let analyticsBuffer = []

// ─── Companion ID — generated once, stored forever ───────────────────────────

async function getCompanionId() {
  const stored = await chrome.storage.sync.get(['graftCompanionId'])
  if (stored.graftCompanionId) return stored.graftCompanionId

  // Generate a new UUID-style ID
  const id = 'cmp_' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  await chrome.storage.sync.set({ graftCompanionId: id })
  return id
}

// ─── Core sync ────────────────────────────────────────────────────────────────

async function syncScripts() {
  const { graftApiKey } = await chrome.storage.sync.get(['graftApiKey'])

  if (!graftApiKey) {
    await chrome.storage.local.set({
      graftStatus: 'unconfigured',
      graftScripts: [],
      graftScriptCount: 0,
    })
    return
  }

  try {
    await chrome.storage.local.set({ graftStatus: 'syncing' })

    const companionId = await getCompanionId()

    const response = await fetch(`${GRAFT_API_BASE}/api/companion/sync`, {
      method: 'GET',
      headers: {
        'X-Graft-Key':        graftApiKey,
        'X-Graft-Companion-ID': companionId,
        'Content-Type':       'application/json',
      },
    })

    if (response.status === 401) {
      await chrome.storage.local.set({
        graftStatus: 'auth_error',
        graftScripts: [],
        graftScriptCount: 0,
      })
      return
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = await response.json()
    const scripts = data.scripts || []

    await chrome.storage.local.set({
      graftScripts:     scripts,
      graftSyncedAt:    data.synced_at,
      graftStatus:      'connected',
      graftScriptCount: scripts.length,
      graftTestCount:   scripts.filter(s => s.is_test).length,
    })

    // Broadcast to all tabs
    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'GRAFT_SCRIPTS_UPDATED',
          scripts,
        }).catch(() => {})
      }
    }

  } catch (err) {
    console.error('[Graft] Sync error:', err)
    await chrome.storage.local.set({ graftStatus: 'error' })
  }
}

// ─── Analytics flush ──────────────────────────────────────────────────────────

async function flushAnalytics() {
  if (analyticsBuffer.length === 0) return
  const { graftApiKey } = await chrome.storage.sync.get(['graftApiKey'])
  if (!graftApiKey) return

  const batch = analyticsBuffer.splice(0, 100)

  try {
    const response = await fetch(`${GRAFT_API_BASE}/api/analytics`, {
      method: 'POST',
      headers: {
        'X-Graft-Key':  graftApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events: batch }),
    })
    if (!response.ok) analyticsBuffer.unshift(...batch)
  } catch {
    analyticsBuffer.unshift(...batch)
  }
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'GRAFT_ANALYTICS_EVENT') {
    analyticsBuffer.push({
      script_id:    message.script_id,
      event_type:   message.event_type,
      page_url:     message.page_url,
      companion_id: message.companion_id,
      metadata:     message.metadata || {},
    })
    sendResponse({ queued: true })
    return  // synchronous — no need for return true
  }

  if (message.type === 'GRAFT_GET_STATUS') {
    chrome.storage.local.get(
      ['graftStatus', 'graftSyncedAt', 'graftScriptCount', 'graftTestCount'],
      data => sendResponse(data)
    )
    return true
  }

  if (message.type === 'GRAFT_FORCE_SYNC') {
    syncScripts().then(() => sendResponse({ ok: true }))
    return true
  }

  if (message.type === 'GRAFT_GET_COMPANION_ID') {
    getCompanionId().then(id => sendResponse({ companion_id: id }))
    return true
  }
  if (message.type === 'GRAFT_EXECUTE_IN_MAIN') {
    // Execute user script in the page's MAIN world via scripting API.
    // This bypasses the extension's CSP restriction on unsafe-eval.
    // The content script can't call chrome.scripting directly, so it delegates here.
    if (!sender.tab?.id) { sendResponse({ ok: false, error: 'No tab id' }); return }
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world:  'MAIN',
      func:   (code, config) => {
        // This function runs in the PAGE's main world — page CSP applies, not extension's
        try {
          // eslint-disable-next-line no-new-func
          new Function('remoteConfig', code)(config)
        } catch (e) {
          console.error('[Graft Script Error]', e)
        }
      },
      args: [message.code, message.remoteConfig || {}],
    }).then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: err.message }))
    return true // async response
  }

})

// ─── Alarms ───────────────────────────────────────────────────────────────────

chrome.alarms.create(ALARM_SYNC,      { periodInMinutes: SYNC_INTERVAL_MINUTES })
chrome.alarms.create(ALARM_ANALYTICS, { periodInMinutes: ANALYTICS_FLUSH_MINUTES })

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_SYNC)      syncScripts()
  if (alarm.name === ALARM_ANALYTICS) flushAnalytics()
})

// ─── Startup ──────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  getCompanionId() // Ensure ID is generated on install
  syncScripts()
})

chrome.runtime.onStartup.addListener(syncScripts)
