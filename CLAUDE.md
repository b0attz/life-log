# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Life Log** — a personal journal/diary app in Thai, built as a single `index.html` file with vanilla HTML/CSS/JavaScript. All data is stored in `localStorage` (no backend).

## Architecture

- App split into 3 files: `index.html`, `style.css`, `app.js`
- CSS: custom properties for theming (5 themes), no framework
- JS: vanilla ES6+, no bundler, no dependencies, no build step
- Data: `localStorage` keys `lifelog.entries` (JSON array), `lifelog.theme`, `lifelog.range`
- Data model per entry: `{ id, ts (unix ms), text, mood (emoji | null), tags (string[]) }`

## Key Behaviors

- **Ctrl+Enter** (or Cmd+Enter) saves the current entry
- Entries sort newest-first
- Filters: All / Today / 7 days / 30 days, plus search and clickable tag chips
- Dark mode follows `prefers-color-scheme` on first visit, toggled via 🌙/☀️ button
- Export/Import buttons back up or restore all entries as JSON

## Development

No build, no server, no dependencies — just open `index.html` in any modern browser.

To preview changes:
```
start index.html
```

To preview changes with live reload, serve with any static file server:
```
npx serve .
```
