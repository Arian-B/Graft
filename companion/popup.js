/**
 * Graft Companion — Popup Script
 * Manages the popup UI state and API key configuration.
 */

const statusDot     = document.getElementById('statusDot')
const statusText    = document.getElementById('statusText')
const scriptBadge   = document.getElementById('scriptBadge')
const apiKeyInput   = document.getElementById('apiKeyInput')
const saveKeyBtn    = document.getElementById('saveKeyBtn')
const changeKeyBtn  = document.getElementById('changeKeyBtn')
const syncNowBtn    = document.getElementById('syncNowBtn')
const setupSection  = document.getElementById('setupSection')
const connectedSection = document.getElementById('connectedSection')
const keyDisplay    = document.getElementById('keyDisplay')
const syncedAtEl    = document.getElementById('syncedAt')

// ─── Status Rendering ────────────────────────────────────────────────────────

const STATUS_MAP = {
  connected:    { dot: 'connected',    text: 'Connected to Graft' },
  syncing:      { dot: 'syncing',      text: 'Syncing scripts...' },
  error:        { dot: 'error',        text: 'Sync error — check your connection' },
  auth_error:   { dot: 'error',        text: 'Invalid API key' },
  unconfigured: { dot: 'unconfigured', text: 'Not configured' },
}

function renderStatus(status, scriptCount, syncedAt) {
  const s = STATUS_MAP[status] || STATUS_MAP.unconfigured

  statusDot.className = 'status-dot ' + s.dot
  statusText.textContent = s.text

  scriptBadge.textContent = `${scriptCount || 0} script${scriptCount !== 1 ? 's' : ''}`
  scriptBadge.className = 'script-badge' + (scriptCount > 0 ? ' active' : '')

  if (syncedAt) {
    const d = new Date(syncedAt)
    syncedAtEl.textContent = 'Last synced: ' + d.toLocaleTimeString()
  }
}

// ─── Key Management ──────────────────────────────────────────────────────────

async function loadState() {
  const { graftApiKey } = await chrome.storage.sync.get(['graftApiKey'])
  const { graftStatus, graftScriptCount, graftSyncedAt } = await chrome.storage.local.get([
    'graftStatus', 'graftScriptCount', 'graftSyncedAt'
  ])

  if (graftApiKey) {
    // Show connected state
    setupSection.classList.add('hidden')
    connectedSection.classList.remove('hidden')
    keyDisplay.textContent = graftApiKey.substring(0, 16) + '••••••••'
    renderStatus(graftStatus || 'unconfigured', graftScriptCount, graftSyncedAt)
  } else {
    // Show setup state
    setupSection.classList.remove('hidden')
    connectedSection.classList.add('hidden')
    renderStatus('unconfigured', 0, null)
  }
}

saveKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim()

  if (!key || !key.startsWith('graft_')) {
    apiKeyInput.style.borderColor = '#ef4444'
    apiKeyInput.placeholder = 'Key must start with graft_...'
    setTimeout(() => {
      apiKeyInput.style.borderColor = ''
      apiKeyInput.placeholder = 'graft_xxxxxxxxxxxx...'
    }, 2000)
    return
  }

  await chrome.storage.sync.set({ graftApiKey: key })
  apiKeyInput.value = ''

  // Trigger background to sync immediately
  chrome.runtime.sendMessage({ type: 'GRAFT_FORCE_SYNC' }).catch(() => {})

  await loadState()
})

changeKeyBtn.addEventListener('click', async () => {
  await chrome.storage.sync.remove(['graftApiKey'])
  await chrome.storage.local.set({ graftScripts: [], graftStatus: 'unconfigured', graftScriptCount: 0 })
  await loadState()
})

syncNowBtn.addEventListener('click', async () => {
  syncNowBtn.textContent = 'Syncing...'
  syncNowBtn.disabled = true

  chrome.runtime.sendMessage({ type: 'GRAFT_FORCE_SYNC' }).catch(() => {})

  setTimeout(async () => {
    await loadState()
    syncNowBtn.textContent = 'Sync Now'
    syncNowBtn.disabled = false
  }, 2000)
})

// Enter key on input
apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveKeyBtn.click()
})

// ─── Init ────────────────────────────────────────────────────────────────────

loadState()

// Refresh status every 3 seconds while popup is open
setInterval(loadState, 3000)
