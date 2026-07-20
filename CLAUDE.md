# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Life Log** — a personal journal/diary app in Thai, built with vanilla HTML/CSS/JavaScript. Uses **Supabase** for authentication and database (Postgres).

## Architecture

- App split into 3 files: `index.html`, `style.css`, `app.js`
- CSS: custom properties for theming (5 themes), no framework
- JS: vanilla ES6+, no bundler, Supabase JS client via CDN
- Auth: Supabase Auth (email/password)
- Database: Supabase Postgres — `entries` table with RLS (row-level security)
- UI preferences (theme, filter range) stay in `localStorage`
- Data model per entry: `{ id, ts (unix ms), text, mood (emoji | null), tags (string[]), user_id (uuid) }`

## Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Go to **Settings > API** → copy `Project URL` and `anon public key`
3. Paste into `index.html` at the `SUPABASE_CONFIG` section
4. Go to **SQL Editor** → run the setup SQL (see below)

### SQL Setup

```sql
CREATE TABLE entries (
  id text PRIMARY KEY,
  ts bigint NOT NULL,
  text text DEFAULT '',
  mood text,
  tags text[] DEFAULT '{}',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own entries"
  ON entries FOR ALL
  USING (auth.uid() = user_id);
```

## Key Behaviors

- **Ctrl+Enter** (or Cmd+Enter) saves the current entry
- Entries sort newest-first
- Filters: All / Today / 7 days / 30 days, plus search and clickable tag chips
- Dark mode follows `prefers-color-scheme` on first visit, toggled via 🌙/☀️ button
- Export/Import buttons back up or restore all entries as JSON
- Auth: login/signup screen shown when not authenticated
- FAB (floating action button) scrolls to composer

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
