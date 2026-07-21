# Task 1 — PWA Support

**Status: DONE**

## Files Created
- `manifest.json` — PWA manifest with app name, theme color, standalone display, SVG emoji icon
- `sw.js` — Service worker with cache-first strategy, offline fallback, old-cache cleanup on activate

## Files Modified
- `index.html` — Added manifest link + meta tags in `<head>` after `<title>` (line 6); added service worker registration script before `</body>`

## How to Test

1. Run `npx serve .` or `start index.html` to serve the app
2. Open Chrome, navigate to the app
3. Open DevTools → **Application** tab
4. Check **Manifest** section — should show "Life Log — บันทึกชีวิต" with theme color `#5b6b7f`
5. Check **Service Workers** section — should show `sw.js` registered and active
6. Check **Cache Storage** — should list `life-log-v2` with 5 cached assets
7. On Chrome mobile (or DevTools mobile emulation) — the **Install** prompt should appear in the address bar or via the browser menu
8. Disconnect network, reload — app should serve from cache (shows `index.html` as offline fallback)

## Concerns
- SVG emoji icon via data URI works for Chrome but may not display on all Android home screens; a PNG icon (192x192, 512x512) would be more robust for production
- No cache-busting/versioned filenames — updating assets requires bumping `CACHE_NAME` in `sw.js` (currently `life-log-v2`)
- `start_url: "/"` assumes the app is served from root; if deployed to a subpath, this needs adjustment
