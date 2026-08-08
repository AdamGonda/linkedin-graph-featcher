# LinkedIn Search Scraper

Chrome extension that scrapes LinkedIn **people-search** results from a filter URL (your logged-in Chrome session), stores profiles locally, and exports JSON.

## Develop

```bash
npm install
npm run build
```

Load `dist/` as an unpacked extension in `chrome://extensions`.

Click the extension icon to open the control tab. Paste a people-search URL, Start, then Download JSON when done. Crawl work uses a separate worker window.

## What it does

1. Opens your filter URL in a background worker tab  
2. Reads profiles from the search results HTML  
3. Advances `page=N` while the paginator has Next  
4. Exports stored people as JSON  
