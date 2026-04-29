/**
 * Graft Companion — Content Script
 *
 * Injected into every page the user visits (matching "<all_urls>").
 * Reads the team's deployed scripts from chrome.storage.local,
 * checks which ones match the current page URL, and executes them.
 *
 * Scripts are executed in an isolated scope with access to:
 *  - The current page's DOM (window, document)
 *  - remoteConfig: the script's live configuration object from Graft
 *
 * Scripts do NOT have access to:
 *  - chrome.* APIs (content script isolation)
 *  - Other Graft scripts' scopes
 */

;(function () {
  'use strict'

  // ─── Anonymous Companion ID ────────────────────────────────────────────────
  // A stable, anonymous identifier for this browser instance.
  // Used in analytics — never tied to a real identity.

  function getCompanionId() {
    const stored = sessionStorage.getItem('__graft_companion_id')
    if (stored) return stored
    const id = 'c_' + Math.random().toString(36).substring(2, 18)
    sessionStorage.setItem('__graft_companion_id', id)
    return id
  }

  const COMPANION_ID = getCompanionId()

  // ─── URL Pattern Matching ──────────────────────────────────────────────────
  // Implements Chrome's extension URL match pattern spec.
  // Supports *, ?, scheme://host/path patterns.

  function matchesPattern(url, pattern) {
    try {
      // Convert Chrome match pattern to regex
      const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex special chars (but NOT * or ?)
        .replace(/\*/g, '.*')                  // bare * → .* (was wrongly looking for \*)
        .replace(/\?/g, '.')                   // bare ? → .

      const regex = new RegExp('^' + escaped + '$')
      return regex.test(url)
    } catch {
      return false
    }
  }

  function scriptMatchesPage(script) {
    const currentUrl = window.location.href
    return script.target_urls.some(pattern => matchesPattern(currentUrl, pattern))
  }

  // ─── Script Execution ─────────────────────────────────────────────────────
  // Executes a script's code in an isolated scope.
  // The script receives `remoteConfig` as its only argument.

  function executeScript(script) {
    // Delegate to background which uses chrome.scripting.executeScript(world:'MAIN').
    // Content scripts cannot use chrome.scripting directly, and MV3 blocks
    // new Function() + inline script tags in the extension's isolated world.
    chrome.runtime.sendMessage({
      type:         'GRAFT_EXECUTE_IN_MAIN',
      code:         script.code,
      remoteConfig: script.remote_config || {},
    }, (response) => {
      if (chrome.runtime.lastError) return // service worker asleep, ignore
      if (response?.ok) {
        // Report success analytics
        void chrome.runtime.sendMessage({
          type:         'GRAFT_ANALYTICS_EVENT',
          script_id:    script.id,
          event_type:   'script_fired',
          page_url:     window.location.href,
          companion_id: COMPANION_ID,
          metadata:     { version: script.version },
        }).catch(() => {})
      }
    })
  }

  // ─── Run All Matching Scripts ──────────────────────────────────────────────

  function runMatchingScripts(scripts) {
    if (!scripts || scripts.length === 0) return

    const matched = scripts.filter(scriptMatchesPage)
    if (matched.length === 0) return

    console.log(`[Graft] Running ${matched.length} script(s) on ${window.location.hostname}`)
    matched.forEach(executeScript)
  }

  // ─── Initial Load ──────────────────────────────────────────────────────────
  // Read scripts already stored from the last background sync

  console.log('[Graft] Content script injected on', window.location.href)

  chrome.storage.local.get(['graftScripts'], ({ graftScripts }) => {
    console.log('[Graft] Scripts in storage:', graftScripts?.length ?? 0, graftScripts)
    runMatchingScripts(graftScripts || [])
  })

  // ─── Live Updates ─────────────────────────────────────────────────────────
  // If the background syncs new scripts while we're on the page,
  // re-evaluate. This handles the "deploy and see it immediately" case
  // when the developer has the page open.

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'GRAFT_SCRIPTS_UPDATED') {
      runMatchingScripts(message.scripts || [])
    }
  })

})()
