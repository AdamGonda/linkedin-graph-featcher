import { looksLikeLinkedInAuthWall } from '../shared/li-detector'
import type { ExtensionMessage } from '../shared/messages'
import {
  extractSearchPeople,
  prepareSearchPage,
  readSearchPaginator,
} from './search-extract'

console.log('[LI Search Scraper] content script loaded', location.href)

if (looksLikeLinkedInAuthWall()) {
  console.warn('[LI Search Scraper] Auth wall detected on this page')
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage & { type: string }, _sender, sendResponse) => {
  console.log('[LI Search Scraper] CS message', message?.type)

  if (message?.type === 'PING_CONTENT') {
    sendResponse({
      success: true,
      data: {
        href: location.href,
        authWall: looksLikeLinkedInAuthWall(),
      },
    })
    return true
  }

  if (message?.type === 'PREPARE_SEARCH_PAGE') {
    if (looksLikeLinkedInAuthWall()) {
      sendResponse({ success: false, error: 'LinkedIn auth wall detected' })
      return true
    }
    prepareSearchPage()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: String(err) }))
    return true
  }

  if (message?.type === 'EXTRACT_SEARCH_RESULTS') {
    if (looksLikeLinkedInAuthWall()) {
      sendResponse({ success: false, error: 'LinkedIn auth wall detected' })
      return true
    }
    try {
      sendResponse({ success: true, data: { people: extractSearchPeople() } })
    } catch (err) {
      sendResponse({ success: false, error: String(err) })
    }
    return true
  }

  if (message?.type === 'READ_SEARCH_PAGINATOR') {
    if (looksLikeLinkedInAuthWall()) {
      sendResponse({ success: false, error: 'LinkedIn auth wall detected' })
      return true
    }
    sendResponse({ success: true, data: readSearchPaginator() })
    return true
  }

  return false
})
