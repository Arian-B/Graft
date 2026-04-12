/**
 * Graft Companion — Background Service Worker
 *
 * Responsibilities:
 *  1. Poll the Graft API every 30 seconds for the team's active scripts
 *  2. Store the received scripts in chrome.storage.local
 *  3. Notify all active content scripts to re-evaluate against new scripts
 *  4. Report analytics events sent from content scripts back to the API
 *
 * Configuration: The team API key must be set via the popup UI.
 * It is stored in chrome.storage.sync so it persists across devices.
 */

// ─── Configuration ────────────────────────────────────────────────────────────

const GRAFT_API_BASE = 'https://graft.vercel.app' // Change to localhost:3000 for local dev
const SYNC_INTERVAL_MINUTES = 0.5                  // 30 seconds
const ALARM_NAME = 'graft-sync'
const ANALYTICS_FLUSH_ALARM = 'graft-analytics-flush'

// ─── State ────────────────────────────────────────────────────────────────────

/** Pending analytics events buffered before flushing */
let analyticsBuffer = []

// ─── Core Sync ────────────────────────────────────────────────────────────────

async function syncScripts() {
  const { graftApiKey } = await chrome.storage.sync.get(['graftApiKey'])

  if (!graftApiKey) {
    console.log('[Graft] No API key configured. Open the extension popup to set one.')
    await chrome.storage.local.set({ graftStatus: 'unconfigured', graftScripts: [] })
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
      console.error('[Graft] API key is invalid or revoked.')
      await chrome.storage.local.set({ graftStatus: 'auth_error', graftScripts: [] })
      return
    }

    if (!response.ok) {
      throw new Error(`Sync failed with status ${response.status}`)
    }

    const data = await response.json()
    const scripts = data.scripts || []

    // Persist scripts for content scripts to read
    await chrome.storage.local.set({
      graftScripts: scripts,
      graftSyncedAt: data.synced_at,
      graftStatus: 'connected',
      graftScriptCount: scripts.length,
    })

    console.log(`[Graft] Synced ${scripts.length} script(s) at ${data.synced_at}`)

    // Broadcast updated scripts to all active content script tabs
    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'GRAFT_SCRIPTS_UPDATED',
          scripts,
        }).catch(() => {
          // Tab may not have a content script — that's fine
        })
      }
    }

  } catch (err) {
    console.error('[Graft] Sync error:', err)
    await chrome.storage.local.set({ graftStatus: 'error' })
  }
}

// ─── Analytics ────────────────────────────────────────────────────────────────

async function flushAnalytics() {
  if (analyticsBuffer.length === 0) return

  const { graftApiKey } = await chrome.storage.sync.get(['graftApiKey'])
  if (!graftApiKey) return

  const eventsToFlush = analyticsBuffer.splice(0, 100) // Max 100 per flush

  try {
    await fetch(`${GRAFT_API_BASE}/api/analytics`, {
      method: 'POST',
      headers: {
        'X-Graft-Key': graftApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events: eventsToFlush }),
    })
  } catch (err) {
    console.error('[Graft] Analytics flush error:', err)
    // Put events back if flush failed
    analyticsBuffer.unshift(...eventsToFlush)
  }
}

// ─── Message Handler (from content scripts) ──────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GRAFT_ANALYTICS_EVENT') {
    analyticsBuffer.push({
      script_id: message.script_id,
      event_type: message.event_type,
      page_url: message.page_url,
      companion_id: message.companion_id,
      metadata: message.metadata || {},
    })
    sendResponse({ queued: true })
  }

  if (message.type === 'GRAFT_GET_STATUS') {
    chrome.storage.local.get(
      ['graftStatus', 'graftSyncedAt', 'graftScriptCount'],
      sendResponse
    )
    return true // Keep message channel open for async response
  }
})

// ─── Alarms ───────────────────────────────────────────────────────────────────

chrome.alarms.create(ALARM_NAME, {
  periodInMinutes: SYNC_INTERVAL_MINUTES,
})

chrome.alarms.create(ANALYTICS_FLUSH_ALARM, {
  periodInMinutes: 1, // Flush analytics every minute
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    syncScripts()
  }
  if (alarm.name === ANALYTICS_FLUSH_ALARM) {
    flushAnalytics()
  }
})

// ─── Startup ──────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Graft] Companion installed. Open the popup to configure your team API key.')
  syncScripts()
})

chrome.runtime.onStartup.addListener(() => {
  syncScripts()
})
