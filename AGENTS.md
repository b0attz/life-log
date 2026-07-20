# Life Log — agent notes

Vanilla HTML/CSS/JS journal app split into 3 files: `index.html`, `style.css`, `app.js`. Entirely in Thai locale (`th-TH`). No build, no tests, no CI.

## Data

- **localStorage keys**: `lifelog.entries` (JSON array), `lifelog.theme`, `lifelog.range` (filter state persists)
- **Entry shape**: `{ id, ts (unix ms), text, mood (emoji | null), tags (string[]) }`
- All mutations go through `persist()` then `render()`.
- `saveEntry()` is the only write path; it calls `persist()` (returns false on quota failure) and reverts on failure.
- `importEntries()` deduplicates by `id` and sorts newest-first.

## Conventions

- **JS style**: mix of `var`, `const`, `let`. Prefer `var` for consistency with existing code. No arrow functions. Keep style consistent.
- **CSS**: 5 themes via `data-theme` attribute (`light`, `dark`, `sepia`, `forest`, `ocean`). CSS custom properties for all themed colors (`--bg`, `--ink`, `--accent`, `--accent-soft`, `--line`, `--muted`).
- **No event listeners in HTML** — all wired in JS after DOM ready (no `defer`/`DOMContentLoaded` wrapper; scripts run at end of body).
- **No framework, no bundler, no dependencies**.

## UI patterns

- All dialogs use `showModal()` — a shared overlay system. Do not create separate modal markup.
- Tag chips are clickable for filtering; `activeTag` state toggles on click, cleared via ✕ button or event delegation.
- Calendar (Google Calendar-style month grid, toggled via "ปฏิทิน" button): `renderCalendar()` uses module-level `calDate` for the shown month; day cells set `filterDay` on click (renders day-only view, removed via ✕ button bar). Rebuilt fully on every `render()`.
- Export modal is a list of clickable options dispatching to `exportJSON/CSV/HTML/PDF`.
- `entry-del` and `entry-edit` buttons hidden via `opacity` on hover (desktop) and always visible on touch.
- Toast system: `showToast(msg, type)` with `success`/`error`/`info`.

## Key behaviors to preserve

- Ctrl+Enter (or Cmd+Enter) to save
- Search debounced at 250ms via `searchTimer`
- Saved range filter restored from localStorage on init
- Dark mode default follows `prefers-color-scheme`, saved theme applied on init
- All exports include the `escapeHtml()` helper — any new user-facing output must use it
- `@media print` hides composer, filters, header buttons, entries' delete/edit buttons
- `@media (prefers-reduced-motion)` disables all animations

## Preview

```
start index.html
npx serve .
```
