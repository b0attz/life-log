# Task 4: Password Reset Flow

**Status:** Complete

## Changes Made

### `style.css` (line ~934, before `/* === PRINT === */`)
- Added `.text-link` class: borderless button styled as an accent-colored text link
- Added `.text-link:hover` underline on hover

### `index.html`
- Added "Forgot password" button (`#forgotPassBtn`) inside `loginForm`, between the password input and submit button (lines 32-34)
- Added `resetForm` (lines 44-49) after `signupForm` closing tag, before `authError` div -- contains email input, submit button, and back-to-login link

### `app.js`
- Added forgot-password click handler (line 152): hides login/signup forms, shows reset form, pre-fills email from login field
- Added back-to-login click handler (line 160): hides reset form, shows login form
- Added reset form submit handler (line 165): calls `supabase.auth.resetPasswordForEmail()`, shows success/error in `authError` element
- Modified `onAuthStateChange` callback (line 194): added `PASSWORD_RECOVERY` event handler that prompts for new password and calls `supabase.auth.updateUser()`

## User Flow
1. User clicks "Forgot password" on login screen
2. Reset form appears with email pre-filled from login input
3. User submits -- Supabase sends reset link to email
4. User clicks link -- app detects `PASSWORD_RECOVERY` event, prompts for new password
5. Password updated via `supabase.auth.updateUser()`
6. User can then log in with new password

## Conventions Followed
- Used `var` throughout (no `const`/`let`)
- No arrow functions
- Matches existing code style and patterns
