# Agent instructions — LinkedIn Search Scraper

Use this file together with `.cursor/rules/` for how to work in this repository.

## Product context

Chrome extension that scrapes LinkedIn **people-search** results from a user-pasted filter URL, using the existing Chrome LinkedIn session (worker window for background tabs). Stores profiles in IndexedDB and exports JSON. Prefer incremental page sync, cache, and conservative rate limits. Automated browsing can restrict accounts — treat that as a product constraint.

## Tech stack

| Layer | Choice |
| -------- | ------ |
| Runtime | Chrome MV3 extension (Vite + `@crxjs/vite-plugin`) |
| Language | TypeScript + React |
| Storage | `chrome.storage.local` for settings/sync/logs; IndexedDB for people |
| UI | Extension full-tab React UI (`src/ui/`) |

## Repository layout

```
manifest.json
src/
  background/   # service worker, worker window, scheduler, search scrape
  content/      # LinkedIn content script (search extract + paginator)
  shared/       # types, constants, messaging, li-auth
  storage/      # chrome.storage + IndexedDB wrappers
  ui/           # management UI
public/icons/
```

Local dumps belong under `data/` (gitignored / cursorignored) — not committed.

## Commands

```bash
npm install
npm run build   # → dist/  (load unpacked in chrome://extensions)
npm run dev     # Vite + CRXJS
npm test        # vitest
```

## Hard constraints (always)

1. **Secrets stay out of git and out of agent context dumps** — cookies, `li_at`, CSRF tokens, OAuth refresh tokens, `.env*`. Never print them in logs or commit messages. Session checks use cookie *existence* only.
2. **Fetched dumps are local data** — large JSON/CSV under `data/` (or similar) is gitignored and cursorignored; do not index or commit them.
3. **Rate limits and ToS** — treat LinkedIn as a hostile rate-limited boundary; backoff, cache, pause on checkpoint/auth wall, prefer incremental sync over full re-fetches. One worker tab at a time.
4. **Ponytail** — smallest change that works; see `.cursor/rules/ponytail.mdc`.

## MCP / secrets

Configure MCP in Cursor user settings or project `.cursor/mcp.json` if needed. Do not commit API keys.
