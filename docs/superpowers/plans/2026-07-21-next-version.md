# Life Log v2 — Next Version Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PWA support, image attachments, loading states, password reset, and onboarding to make the app installable, richer, and more polished.

**Architecture:** Keep the existing 3-file vanilla JS architecture (no bundler). Add a service worker for offline support. Use Supabase Storage for image uploads. Add CSS skeleton/spinner components. Extend the auth flow with password reset. Add a first-time onboarding overlay.

**Tech Stack:** Vanilla JS, Supabase JS SDK (CDN), Supabase Storage, Service Worker API, CSS custom properties

## Global Constraints

- No build tools, no bundler, no npm dependencies
- Keep `var` declarations (no `const`/`let` in new code, match existing style)
- No arrow functions in new code
- All user-facing text must use `escapeHtml()`
- All DB operations go through Supabase client
- Theme system uses CSS custom properties only
- Touch targets minimum 44px
- All animations respect `prefers-reduced-motion`

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `sw.js` | Create | Service worker for offline caching |
| `manifest.json` | Create | PWA manifest for installability |
| `index.html` | Modify | Add manifest link, service worker registration, onboarding overlay, password reset form, image upload UI |
| `app.js` | Modify | Add SW registration, image upload logic, password reset flow, onboarding logic, loading states |
| `style.css` | Modify | Add skeleton/spinner styles, onboarding styles, image attachment styles |

---

### Task 1: PWA Manifest + Service Worker

**Files:**
- Create: `manifest.json`
- Create: `sw.js`
- Modify: `index.html:1-10` (add manifest link + meta tags)
- Modify: `index.html:205-207` (add SW registration script)

**Interfaces:**
- Consumes: existing `index.html`, `style.css`, `app.js` files
- Produces: installable PWA, offline caching for static assets

- [ ] **Step 1: Create manifest.json**

```json
{
  "name": "Life Log — บันทึกชีวิต",
  "short_name": "Life Log",
  "description": "บันทึกชีวิตของคุณ",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f8f7f4",
  "theme_color": "#5b6b7f",
  "icons": [
    {
      "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📝</text></svg>",
      "sizes": "any",
      "type": "image/svg+xml"
    }
  ]
}
```

- [ ] **Step 2: Create sw.js**

```js
var CACHE_NAME = 'life-log-v2';
var ASSETS = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.filter(function(n) { return n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(resp) {
        if (resp.ok && e.request.url.startsWith(self.location.origin)) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        }
        return resp;
      });
    }).catch(function() {
      if (e.request.destination === 'document') return caches.match('/index.html');
    })
  );
});
```

- [ ] **Step 3: Add manifest link and meta tags to index.html**

In `<head>`, after the `<title>` tag, add:

```html
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#5b6b7f">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
```

- [ ] **Step 4: Add SW registration to index.html**

Before the closing `</body>` tag, after the app.js script, add:

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

- [ ] **Step 5: Test PWA installability**

Open Chrome DevTools → Application tab → Manifest section. Verify:
- Manifest loaded
- Service worker registered and active
- "Installable" badge appears

- [ ] **Step 6: Commit**

```bash
git add manifest.json sw.js index.html
git commit -m "feat: add PWA support with service worker"
```

---

### Task 2: Loading States (Skeleton + Spinner)

**Files:**
- Modify: `style.css` (add skeleton/spinner styles)
- Modify: `app.js:217-222` (add loading indicator to loadEntries)
- Modify: `app.js:250-255` (add loading indicator to loadFolders)
- Modify: `app.js:277-282` (add loading indicator to loadGoals)

**Interfaces:**
- Consumes: existing CSS custom properties (`--accent`, `--accent-soft`, `--line`)
- Produces: `showLoading()` and `hideLoading()` global functions, `.skeleton` and `.spinner` CSS classes

- [ ] **Step 1: Add skeleton/spinner CSS to style.css**

Append before the `/* === PRINT === */` section:

```css
/* === LOADING STATES === */
.spinner {
  display: inline-block; width: 24px; height: 24px;
  border: 3px solid var(--line); border-top-color: var(--accent);
  border-radius: 50%; animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.skeleton {
  background: linear-gradient(90deg, var(--accent-soft) 25%, var(--line) 50%, var(--accent-soft) 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.loading-overlay {
  display: flex; align-items: center; justify-content: center;
  padding: 60px 20px; color: var(--muted); font-size: .9rem; gap: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .spinner { animation: none; }
  .skeleton { animation: none; }
}
```

- [ ] **Step 2: Add showLoading/hideLoading functions to app.js**

Add after the `showToast` function:

```js
function showLoading(msg) {
  var list = document.getElementById('list');
  list.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>' + (msg || 'กำลังโหลด...') + '</span></div>';
}

function hideLoading() {
  /* no-op — render() replaces content */
}
```

- [ ] **Step 3: Add loading indicator to loadEntries**

Modify `loadEntries` to show loading on first load:

```js
async function loadEntries() {
  if (!currentUser) return;
  if (!entries.length) showLoading('กำลังโหลดบันทึก...');
  var res = await supabase.from('entries').select('*').eq('user_id', currentUser.id).order('ts', { ascending: false });
  if (res.error) { showToast('โหลดข้อมูลไม่สำเร็จ', 'error'); return; }
  entries = res.data || [];
}
```

- [ ] **Step 4: Add loading to folder/goal loads**

Same pattern — add `showLoading()` call if arrays are empty before fetch.

- [ ] **Step 5: Add skeleton to entry list during render**

In `render()`, before the loop that builds entries, add a brief skeleton if items exist but DOM is empty (first paint only). This is optional — the spinner on initial load covers the main case.

- [ ] **Step 6: Commit**

```bash
git add style.css app.js
git commit -m "feat: add loading states with spinner and skeleton"
```

---

### Task 3: Image Attachments

**Files:**
- Modify: `index.html:137-161` (add image upload area to composer)
- Modify: `app.js` (add upload logic, image state, Supabase Storage calls)
- Modify: `style.css` (add image preview and upload area styles)

**Interfaces:**
- Consumes: `supabase` client, `currentUser.id`, existing entry CRUD
- Produces: `entry.images` (string array of storage URLs), `uploadImage(file)` function, image preview in composer and entry display

- [ ] **Step 1: Create Supabase Storage bucket**

In Supabase Dashboard → Storage → New bucket:
- Name: `entry-images`
- Public: Yes (for simplicity)
- File size limit: 5MB
- Allowed MIME types: `image/*`

Then run this SQL in SQL Editor to allow RLS:

```sql
CREATE POLICY "Anyone can view entry images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'entry-images');

CREATE POLICY "Users can upload entry images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'entry-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own entry images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'entry-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

- [ ] **Step 2: Add image upload area CSS to style.css**

```css
/* === IMAGE UPLOAD === */
.image-upload-area {
  border: 2px dashed var(--line); border-radius: var(--radius-md);
  padding: 16px; text-align: center; cursor: pointer;
  transition: all var(--duration-fast) ease; margin-top: 12px;
  color: var(--muted); font-size: .85rem;
}
.image-upload-area:hover { border-color: var(--accent); background: var(--accent-soft); }
.image-upload-area input { display: none; }

.image-preview-row {
  display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;
}
.image-preview {
  width: 80px; height: 80px; border-radius: var(--radius-sm);
  object-fit: cover; border: 1px solid var(--line);
  position: relative;
}
.image-preview-wrap {
  position: relative; display: inline-block;
}
.image-preview-del {
  position: absolute; top: -6px; right: -6px;
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--danger); color: #fff; border: none;
  font-size: .7rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.entry-images {
  display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;
}
.entry-images img {
  max-width: 200px; max-height: 150px; border-radius: var(--radius-sm);
  border: 1px solid var(--line); cursor: pointer;
}
```

- [ ] **Step 3: Add image upload area to composer HTML**

In `index.html`, after the moods div inside the composer, add:

```html
<div class="image-upload-area" id="imageUploadArea">
  <input type="file" id="imageInput" accept="image/*" multiple hidden>
  <span>📷 คลิกเพื่อเพิ่มรูปภาพ</span>
</div>
<div class="image-preview-row" id="imagePreviewRow"></div>
```

- [ ] **Step 4: Add image upload logic to app.js**

Add after the `resetComposerMood` function:

```js
var pendingImages = []; /* {file, url} pairs for images being composed */

function initImageUpload() {
  var area = document.getElementById('imageUploadArea');
  var input = document.getElementById('imageInput');
  area.addEventListener('click', function() { input.click(); });
  input.addEventListener('change', function(e) {
    Array.from(e.target.files).forEach(function(file) {
      if (file.size > 5 * 1024 * 1024) { showToast('รูปภาพต้องไม่เกิน 5MB', 'error'); return; }
      var url = URL.createObjectURL(file);
      pendingImages.push({ file: file, url: url });
      renderImagePreviews();
    });
    input.value = '';
  });
}

function renderImagePreviews() {
  var row = document.getElementById('imagePreviewRow');
  row.innerHTML = '';
  pendingImages.forEach(function(img, i) {
    var wrap = document.createElement('div');
    wrap.className = 'image-preview-wrap';
    var imgEl = document.createElement('img');
    imgEl.className = 'image-preview';
    imgEl.src = img.url;
    var del = document.createElement('button');
    del.className = 'image-preview-del';
    del.textContent = '✕';
    del.addEventListener('click', function() {
      URL.revokeObjectURL(pendingImages[i].url);
      pendingImages.splice(i, 1);
      renderImagePreviews();
    });
    wrap.appendChild(imgEl);
    wrap.appendChild(del);
    row.appendChild(wrap);
  });
}

async function uploadImages(files) {
  var urls = [];
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var path = currentUser.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.' + file.name.split('.').pop();
    var res = await supabase.storage.from('entry-images').upload(path, file);
    if (res.error) { showToast('อัปโหลดรูปไม่สำเร็จ', 'error'); continue; }
    var pub = supabase.storage.from('entry-images').getPublicUrl(path);
    if (pub.data && pub.data.publicUrl) urls.push(pub.data.publicUrl);
  }
  return urls;
}
```

- [ ] **Step 5: Call initImageUpload on app load**

In the `showApp` function, add `initImageUpload();` after the data loads.

- [ ] **Step 6: Modify saveEntry to upload images**

In `saveEntry()`, after creating the entry object and before `persistEntry`:

```js
if (pendingImages.length) {
  var imageUrls = await uploadImages(pendingImages.map(function(p) { return p.file; }));
  entry.images = imageUrls;
  pendingImages.forEach(function(p) { URL.revokeObjectURL(p.url); });
  pendingImages = [];
  document.getElementById('imagePreviewRow').innerHTML = '';
}
```

- [ ] **Step 7: Render images in entry list**

In `render()`, after the entry-tags section, add:

```js
if ((e.images || []).length) {
  html += '<div class="entry-images">';
  for (var img = 0; img < e.images.length; img++) {
    html += '<img src="' + escapeHtml(e.images[img]) + '" alt="รูปภาพ" loading="lazy">';
  }
  html += '</div>';
}
```

- [ ] **Step 8: Update entry validation in import**

In the import filter, add check for images array:

```js
if (x.images != null && !Array.isArray(x.images)) return false;
```

- [ ] **Step 9: Commit**

```bash
git add index.html app.js style.css
git commit -m "feat: add image attachments via Supabase Storage"
```

---

### Task 4: Password Reset

**Files:**
- Modify: `index.html:14-39` (add forgot password form)
- Modify: `app.js:117-148` (add password reset handlers)

**Interfaces:**
- Consumes: `supabase.auth.resetPasswordForEmail()`, `supabase.auth.updateUser()`
- Produces: "ลืมรหัสผ่าน?" link on login form, password reset form, reset email flow

- [ ] **Step 1: Add forgot password link to login form**

In `index.html`, inside the loginForm, after the password input and before the submit button:

```html
<div style="text-align:right;margin-top:-4px;">
  <button type="button" class="text-link" id="forgotPassBtn">ลืมรหัสผ่าน?</button>
</div>
```

- [ ] **Step 2: Add forgot password CSS**

```css
.text-link {
  background: none; border: none; color: var(--accent);
  font: inherit; font-size: .8rem; cursor: pointer; padding: 0;
}
.text-link:hover { text-decoration: underline; }
```

- [ ] **Step 3: Add password reset form to index.html**

After the signupForm, add:

```html
<form class="auth-form hidden" id="resetForm">
  <p style="font-size:.85rem;color:var(--muted);margin-bottom:8px;">ใส่อีเมลของคุณ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่</p>
  <input type="email" id="resetEmail" placeholder="อีเมล" required autocomplete="email">
  <button type="submit" class="auth-submit">ส่งลิงก์รีเซ็ตรหัสผ่าน</button>
  <button type="button" class="text-link" id="backToLogin" style="margin-top:8px;">← กลับไปเข้าสู่ระบบ</button>
</form>
```

- [ ] **Step 4: Add password reset handler to app.js**

Add after the signup form handler:

```js
/* --- Forgot password --- */
document.getElementById('forgotPassBtn').addEventListener('click', function() {
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('signupForm').classList.add('hidden');
  document.getElementById('resetForm').classList.remove('hidden');
  document.getElementById('authError').classList.add('hidden');
  /* Pre-fill email from login form */
  document.getElementById('resetEmail').value = document.getElementById('loginEmail').value;
});

document.getElementById('backToLogin').addEventListener('click', function() {
  document.getElementById('resetForm').classList.add('hidden');
  document.getElementById('loginForm').classList.remove('hidden');
});

document.getElementById('resetForm').addEventListener('submit', function(e) {
  e.preventDefault();
  var email = document.getElementById('resetEmail').value.trim();
  var btn = this.querySelector('.auth-submit');
  var errEl = document.getElementById('authError');
  btn.disabled = true; btn.textContent = 'กำลังส่ง...';
  errEl.classList.add('hidden');

  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  }).then(function(res) {
    btn.disabled = false; btn.textContent = 'ส่งลิงก์รีเซ็ตรหัสผ่าน';
    if (res.error) { errEl.textContent = res.error.message; errEl.classList.remove('hidden'); }
    else {
      errEl.textContent = 'ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปที่อีเมลของคุณแล้ว';
      errEl.classList.remove('hidden');
      errEl.style.background = 'rgba(74,138,90,.08)';
      errEl.style.color = 'var(--success)';
    }
  });
});
```

- [ ] **Step 5: Handle password reset callback**

Add to the auth state listener:

```js
supabase.auth.onAuthStateChange(function(event, session) {
  if (event === 'PASSWORD_RECOVERY') {
    /* User clicked the reset link — show a prompt for new password */
    var newPass = prompt('ตั้งรหัสผ่านใหม่ (≥ 6 ตัวอักษร):');
    if (newPass && newPass.length >= 6) {
      supabase.auth.updateUser({ password: newPass }).then(function(res) {
        if (res.error) alert('ผิดพลาด: ' + res.error.message);
        else alert('เปลี่ยนรหัสผ่านสำเร็จ!');
      });
    }
  }
  if (session && session.user) { showApp(session.user); }
  else { currentUser = null; entries = []; folders = []; goals = []; goalLogs = {}; activeFolderFilter = null; selectedFolderId = ''; showAuth(); }
});
```

- [ ] **Step 6: Enable password reset in Supabase**

In Supabase Dashboard → Authentication → Providers → Email:
- Ensure "Secure password change" is enabled
- Set the redirect URL to your app URL

- [ ] **Step 7: Commit**

```bash
git add index.html app.js style.css
git commit -m "feat: add password reset flow"
```

---

### Task 5: First-Time Onboarding

**Files:**
- Modify: `index.html` (add onboarding overlay HTML)
- Modify: `app.js` (add onboarding logic)
- Modify: `style.css` (add onboarding styles)

**Interfaces:**
- Consumes: `localStorage` for onboarding state, existing app elements
- Produces: `showOnboarding()` function, `completeOnboarding()` function, `lifelog.onboarded` localStorage key

- [ ] **Step 1: Add onboarding overlay to index.html**

Before the modal overlay, add:

```html
<div class="onboarding-overlay hidden" id="onboardingOverlay">
  <div class="onboarding-card">
    <div class="onboarding-step" id="onbStep1">
      <div class="onboarding-emoji">📝</div>
      <h2>ยินดีต้อนรับสู่ Life Log</h2>
      <p>บันทึกเรื่องราวในชีวิตของคุณทุกวัน</p>
    </div>
    <div class="onboarding-step hidden" id="onbStep2">
      <div class="onboarding-emoji">😊</div>
      <h2>เลือกอารมณ์</h2>
      <p>บันทึกอารมณ์ของคุณในแต่ละวัน เพื่อทำความเข้าใจตัวเองมากขึ้น</p>
    </div>
    <div class="onboarding-step hidden" id="onbStep3">
      <div class="onboarding-emoji">📁</div>
      <h2>จัดระเบียบด้วยโฟลเดอร์</h2>
      <p>สร้างโฟลเดอร์เพื่อจัดกลุ่มบันทึกของคุณ</p>
    </div>
    <div class="onboarding-step hidden" id="onbStep4">
      <div class="onboarding-emoji">🎯</div>
      <h2>ตั้งเป้าหมาย</h2>
      <p>สร้างเป้าหมายรายวันและติดตาม streak ของคุณ</p>
    </div>
    <div class="onboarding-nav">
      <div class="onboarding-dots">
        <span class="onb-dot on" data-step="1"></span>
        <span class="onb-dot" data-step="2"></span>
        <span class="onb-dot" data-step="3"></span>
        <span class="onb-dot" data-step="4"></span>
      </div>
      <button class="onboarding-btn" id="onbNext">ถัดไป →</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add onboarding CSS**

```css
/* === ONBOARDING === */
.onboarding-overlay {
  position: fixed; inset: 0; z-index: 3000;
  background: var(--bg); display: flex; align-items: center; justify-content: center;
  padding: 24px; animation: focusIn .4s ease;
}
.onboarding-card {
  max-width: 400px; width: 100%; text-align: center;
}
.onboarding-step { animation: fadeIn .3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } }
.onboarding-emoji { font-size: 4rem; margin-bottom: 20px; }
.onboarding-card h2 { font-size: 1.4rem; font-weight: 700; margin-bottom: 12px; }
.onboarding-card p { font-size: .95rem; color: var(--muted); line-height: 1.7; }
.onboarding-nav { margin-top: 40px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
.onboarding-dots { display: flex; gap: 8px; }
.onb-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--line);
  transition: all .2s ease; cursor: pointer;
}
.onb-dot.on { background: var(--accent); width: 24px; border-radius: 4px; }
.onboarding-btn {
  background: var(--accent); border: none; color: #fff;
  font: inherit; font-size: 1rem; font-weight: 600;
  padding: 14px 40px; border-radius: var(--radius-md); cursor: pointer;
  min-height: 52px; transition: all .15s ease;
}
.onboarding-btn:hover { opacity: .9; transform: translateY(-1px); }

@media (prefers-reduced-motion: reduce) {
  .onboarding-step { animation: none; }
}
```

- [ ] **Step 3: Add onboarding logic to app.js**

Add before the Init section:

```js
/* =========================================================
   Onboarding
   ========================================================= */
var onbCurrentStep = 1;
var onbTotalSteps = 4;

function showOnboarding() {
  document.getElementById('onboardingOverlay').classList.remove('hidden');
  onbCurrentStep = 1;
  updateOnbStep();
}

function completeOnboarding() {
  localStorage.setItem('lifelog.onboarded', '1');
  document.getElementById('onboardingOverlay').classList.add('hidden');
}

function updateOnbStep() {
  for (var i = 1; i <= onbTotalSteps; i++) {
    var step = document.getElementById('onbStep' + i);
    if (step) step.classList.toggle('hidden', i !== onbCurrentStep);
  }
  document.querySelectorAll('.onb-dot').forEach(function(d) {
    d.classList.toggle('on', parseInt(d.dataset.step) === onbCurrentStep);
  });
  var btn = document.getElementById('onbNext');
  btn.textContent = onbCurrentStep === onbTotalSteps ? 'เริ่มเลย! →' : 'ถัดไป →';
}
```

- [ ] **Step 4: Wire up onboarding button events**

```js
document.getElementById('onbNext').addEventListener('click', function() {
  if (onbCurrentStep >= onbTotalSteps) { completeOnboarding(); return; }
  onbCurrentStep++;
  updateOnbStep();
});
document.querySelectorAll('.onb-dot').forEach(function(d) {
  d.addEventListener('click', function() {
    onbCurrentStep = parseInt(d.dataset.step);
    updateOnbStep();
  });
});
```

- [ ] **Step 5: Trigger onboarding on first login**

In `showApp()`, after rendering, add:

```js
if (!localStorage.getItem('lifelog.onboarded')) {
  showOnboarding();
}
```

- [ ] **Step 6: Commit**

```bash
git add index.html app.js style.css
git commit -m "feat: add first-time onboarding flow"
```

---

### Task 6: Final Integration + Push

**Files:**
- Modify: `CLAUDE.md` (update feature list)
- Modify: `AGENTS.md` (update conventions)

**Interfaces:**
- Consumes: all previous tasks
- Produces: updated documentation, pushed to GitHub

- [ ] **Step 1: Update CLAUDE.md**

Update the Key Behaviors section to include:
- PWA installable
- Image attachments
- Password reset
- Onboarding

- [ ] **Step 2: Update AGENTS.md**

Update UI patterns to mention:
- Loading states
- Image upload area
- Onboarding overlay

- [ ] **Step 3: Final test**

Open the app in Chrome:
1. Verify onboarding shows on first visit
2. Verify PWA install prompt appears
3. Verify image upload works in composer
4. Verify password reset sends email
5. Verify loading spinner shows on data load
6. Verify all 5 themes work
7. Verify mobile responsive

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "Life Log v2 — PWA, images, loading states, password reset, onboarding"
git push
```
