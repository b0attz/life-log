# Task 3 Report: Image Attachments for Entries

## Summary

Added image attachment support to Life Log entries. Users can now upload images (via Supabase Storage) when creating entries, and images are displayed in the entry list.

## Files Modified

### `d:\code\pr\style.css`
- Added `/* === IMAGE UPLOAD === */` block before `/* === PRINT === */` (line ~898)
- Styles for: `.image-upload-area`, `.image-preview-row`, `.image-preview`, `.image-preview-wrap`, `.image-preview-del`, `.entry-images`, `.entry-images img`

### `d:\code\pr\index.html`
- Added image upload UI inside the composer div, after the moods div (line ~145)
- Two new elements: `#imageUploadArea` (dashed upload zone) and `#imagePreviewRow` (preview thumbnails)

### `d:\code\pr\app.js`
- **`pendingImages` array** (line ~472): Tracks selected files before save
- **`initImageUpload()`** (line ~474): Sets up click handler on upload area, file input change handler with 5MB size validation
- **`renderImagePreviews()`** (line ~489): Renders thumbnail previews with delete buttons
- **`uploadImages(files)`** (line ~512): Uploads files to Supabase Storage bucket `entry-images`, returns public URLs
- **`showApp()`** (line ~98): Added `initImageUpload()` call after `Promise.all` data loads
- **`saveEntry()`** (line ~528): Changed to `async function`, added image upload block before `entries.unshift(entry)` -- uploads pending images, attaches URLs to entry, cleans up
- **`render()`** (line ~729): Added image rendering block after entry-tags section -- displays `entry-images` div with `<img>` tags using `escapeHtml()` for URLs
- **Import filter** (line ~974): Added `if (x.images != null && !Array.isArray(x.images)) return false;` validation

## Data Model Change

Entries now optionally include an `images` field:
```
{ id, ts, text, mood, tags, folder_id, user_id, images: string[] }
```

The `images` field is an array of Supabase Storage public URLs. Existing entries without `images` are handled gracefully (all code checks `(e.images || []).length`).

## Manual Setup Required

The user must create a Supabase Storage bucket named `entry-images` in their Supabase dashboard before images will upload successfully.

## Constraints Met
- Used `var` (no `const`/`let`)
- No arrow functions
- All user-facing text goes through `escapeHtml()`
