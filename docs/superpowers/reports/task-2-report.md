# Task 2 — Loading States

**Date:** 2026-07-21
**Status:** Complete

## Changes

### style.css

Added `/* === LOADING STATES === */` section before the `/* === PRINT === */` section (line 873). Contains:

- `.spinner` — 24px rotating border spinner using `var(--accent)` and `var(--line)` colors
- `.skeleton` — shimmer gradient placeholder using existing design tokens
- `.loading-overlay` — centered flex container with muted text
- `@media (prefers-reduced-motion: reduce)` — disables spinner and skeleton animations
- `@keyframes spin` and `@keyframes shimmer` animations

### app.js

1. Added `showLoading(msg)` and `hideLoading()` functions after `showToast` (~line 377). `showLoading` injects a spinner + text into `#list`. `hideLoading` is a no-op since `render()` replaces the content.

2. Modified `loadEntries()` — adds `if (!entries.length) showLoading('กำลังโหลดบันทึก...');` before the Supabase fetch. Shows spinner only on first load (when entries array is empty).

3. Modified `loadFolders()` — adds `if (!folders.length) showLoading('กำลังโหลด...');` before the Supabase fetch.

4. Modified `loadGoals()` — adds `if (!goals.length) showLoading('กำลังโหลด...');` before the Supabase fetch.

## Conventions

- All `var` declarations (no `const`/`let`)
- No arrow functions
- `prefers-reduced-motion` respected via CSS media query
- Uses existing CSS custom properties (`--accent`, `--line`, `--accent-soft`, `--muted`, `--radius-sm`)
