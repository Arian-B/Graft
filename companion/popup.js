const GRAFT_DASHBOARD = 'http://localhost:3000' // Change to https://graft.vercel.app for production

// ─── Load state on open ───────────────────────────────────────────────────────

async function init() {
  // Load saved API key
  const { graftApiKey } = await chrome.storage.sync.get(['graftApiKey'])
  if (graftApiKey) {
    document.getElementById('apiKeyInput').value = graftApiKey
  }

  // Get companion ID and display it
  chrome.runtime.sendMessage({ type: 'GRAFT_GET_COMPANION_ID' }, ({ companion_id }) => {
    const el = document.getElementById('companionIdDisplay')
    if (companion_id) {
      el.textContent = 'Companion ID: ' + companion_id
    }
  })

  // Load current status
  refreshStatus()
}

function refreshStatus() {
  chrome.runtime.sendMessage(
    { type: 'GRAFT_GET_STATUS' },
    ({ graftStatus, graftSyncedAt, graftScriptCount, graftTestCount }) => {
      const dot       = document.getElementById('statusDot')
      const text      = document.getElementById('statusText')
      const label     = document.getElementById('statusLabel')
      const count     = document.getElementById('scriptCount')
      const testBadge = document.getElementById('testBadge')

      // Remove all dot state classes
      dot.className = 'dot'

      switch (graftStatus) {
        case 'connected':
          dot.classList.add('connected')
          text.textContent = `Synced — ${graftScriptCount || 0} script(s) active`
          label.textContent = graftSyncedAt
            ? 'Last sync: ' + new Date(graftSyncedAt).toLocaleTimeString()
            : 'Connected'
          if (graftScriptCount > 0) {
            count.textContent = graftScriptCount + ' scripts'
            count.style.display = ''
          } else {
            count.style.display = 'none'
          }
          // Show test badge if dev scripts are running
          if (graftTestCount > 0) {
            testBadge.style.display = ''
          } else {
            testBadge.style.display = 'none'
          }
          break

        case 'syncing':
          dot.classList.add('syncing')
          text.textContent = 'Syncing...'
          label.textContent = 'Fetching latest scripts'
          count.style.display = 'none'
          break

        case 'auth_error':
          dot.classList.add('error')
          text.textContent = 'Invalid API key'
          label.textContent = 'Update your key below'
          count.style.display = 'none'
          break

        case 'error':
          dot.classList.add('error')
          text.textContent = 'Connection error'
          label.textContent = 'Check your internet connection'
          count.style.display = 'none'
          break

        case 'unconfigured':
        default:
          text.textContent = 'No API key set'
          label.textContent = 'Paste your team key below'
          count.style.display = 'none'
          testBadge.style.display = 'none'
      }
    }
  )
}

// ─── Save API key ─────────────────────────────────────────────────────────────

document.getElementById('saveKeyBtn').addEventListener('click', async () => {
  const key = document.getElementById('apiKeyInput').value.trim()
  const msg = document.getElementById('keyMessage')

  if (!key) {
    msg.textContent = 'Please enter an API key.'
    msg.className = 'message error'
    return
  }

  await chrome.storage.sync.set({ graftApiKey: key })
  msg.textContent = 'Key saved. Syncing now...'
  msg.className = 'message success'

  // Trigger immediate sync
  chrome.runtime.sendMessage({ type: 'GRAFT_FORCE_SYNC' }, () => {
    setTimeout(refreshStatus, 1500)
    setTimeout(() => { msg.className = 'message' }, 3000)
  })
})

// ─── Link to Graft account ────────────────────────────────────────────────────

document.getElementById('linkBrowserBtn').addEventListener('click', async () => {
  chrome.runtime.sendMessage({ type: 'GRAFT_GET_COMPANION_ID' }, ({ companion_id }) => {
    const url = `${GRAFT_DASHBOARD}/link-browser?companion_id=${encodeURIComponent(companion_id)}`
    chrome.tabs.create({ url })
  })
})

// ─── Sync now ─────────────────────────────────────────────────────────────────

document.getElementById('syncNowBtn').addEventListener('click', () => {
  document.getElementById('statusText').textContent = 'Syncing...'
  chrome.runtime.sendMessage({ type: 'GRAFT_FORCE_SYNC' }, () => {
    setTimeout(refreshStatus, 1500)
  })
})

// ─── Open dashboard ───────────────────────────────────────────────────────────

document.getElementById('openDashBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: GRAFT_DASHBOARD + '/dashboard' })
})

// ─── Init ─────────────────────────────────────────────────────────────────────

init()
