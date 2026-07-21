/* =========================================================
   Supabase Client
   ========================================================= */
var supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
var currentUser = null;

/* =========================================================
   Constants
   ========================================================= */
var MOODS = ["😄","🙂","😐","😢","😡","🤩","😴","🤒"];
var THEME_KEY = 'lifelog.theme';
var RANGE_KEY = 'lifelog.range';
var THEMES = [
  { name: 'light',  label: 'สว่าง',   color: '#f8f7f4', dot: '#5b6b7f' },
  { name: 'dark',   label: 'มืด',     color: '#121110', dot: '#8aa0b4' },
  { name: 'sepia',  label: 'ซีเปีย',  color: '#f5f0e6', dot: '#7a6a52' },
  { name: 'forest', label: 'ป่าไม้',   color: '#f2f5f0', dot: '#4a7a4a' },
  { name: 'ocean',  label: 'มหาสมุทร', color: '#f0f4f8', dot: '#4a6a88' }
];

/* =========================================================
   State
   ========================================================= */
var entries = [];
var selectedMood = null;
var filterRange = 'all';
var activeTag = null;
var filterDay = null;
var calendarVisible = false;
var themePickerVisible = false;
var searchTimer = null;
var sidebarOpen = false;

/* --- New feature state --- */
var folders = [];
var goals = [];
var goalLogs = {};      /* key: goalId_date, value: true/false */
var selectedFolderId = '';
var activeFolderFilter = null;
var focusActive = false;

/* =========================================================
   Sidebar
   ========================================================= */
function openSidebar() {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.remove('hidden');
  overlay.classList.remove('hidden');
  requestAnimationFrame(function() {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
  });
  sidebarOpen = true;
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
  setTimeout(function() {
    sidebar.classList.add('hidden');
    overlay.classList.add('hidden');
  }, 300);
  sidebarOpen = false;
  document.body.style.overflow = '';
}

function toggleSidebar() {
  if (sidebarOpen) closeSidebar();
  else openSidebar();
}

/* =========================================================
   Auth
   ========================================================= */
function showAuth() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('mainApp').classList.add('hidden');
  document.getElementById('fabBtn').classList.add('hidden');
}

function showApp(user) {
  currentUser = user;
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  document.getElementById('fabBtn').classList.remove('hidden');
  document.getElementById('sidebarEmail').textContent = user.email;
  var p1 = loadEntries();
  var p2 = loadFolders();
  var p3 = loadGoals();
  var p4 = loadGoalLogs();
  Promise.all([p1, p2, p3, p4]).then(function() {
    renderFolderSelect();
    render();
    initImageUpload();
    if (!localStorage.getItem('lifelog.onboarded')) {
      showOnboarding();
    }
  });
}

/* --- Auth tabs --- */
document.getElementById('loginTab').addEventListener('click', function() {
  this.classList.add('active');
  document.getElementById('signupTab').classList.remove('active');
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('signupForm').classList.add('hidden');
  document.getElementById('authError').classList.add('hidden');
});
document.getElementById('signupTab').addEventListener('click', function() {
  this.classList.add('active');
  document.getElementById('loginTab').classList.remove('active');
  document.getElementById('signupForm').classList.remove('hidden');
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('authError').classList.add('hidden');
});

/* --- Login --- */
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  var email = document.getElementById('loginEmail').value.trim();
  var pass = document.getElementById('loginPass').value;
  var btn = this.querySelector('.auth-submit');
  var errEl = document.getElementById('authError');
  btn.disabled = true; btn.textContent = 'กำลังเข้าสู่ระบบ...';
  errEl.classList.add('hidden');

  supabase.auth.signInWithPassword({ email: email, password: pass }).then(function(res) {
    if (res.error) { errEl.textContent = res.error.message; errEl.classList.remove('hidden'); }
    btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ';
  });
});

/* --- Signup --- */
document.getElementById('signupForm').addEventListener('submit', function(e) {
  e.preventDefault();
  var email = document.getElementById('signupEmail').value.trim();
  var pass = document.getElementById('signupPass').value;
  var btn = this.querySelector('.auth-submit');
  var errEl = document.getElementById('authError');
  btn.disabled = true; btn.textContent = 'กำลังสมัครสมาชิก...';
  errEl.classList.add('hidden');

  supabase.auth.signUp({ email: email, password: pass }).then(function(res) {
    if (res.error) { errEl.textContent = res.error.message; errEl.classList.remove('hidden'); }
    else { errEl.textContent = 'ตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี'; errEl.classList.remove('hidden'); }
    btn.disabled = false; btn.textContent = 'สมัครสมาชิก';
  });
});

/* --- Forgot password --- */
document.getElementById('forgotPassBtn').addEventListener('click', function() {
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('signupForm').classList.add('hidden');
  document.getElementById('resetForm').classList.remove('hidden');
  document.getElementById('authError').classList.add('hidden');
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

/* --- Google Login --- */
document.getElementById('googleLoginBtn').addEventListener('click', function() {
  supabase.auth.signInWithOAuth({ provider: 'google', options: {
    redirectTo: window.location.origin + window.location.pathname
  }});
});

/* --- Logout --- */
document.getElementById('navLogout').addEventListener('click', function() {
  closeSidebar();
  supabase.auth.signOut();
});

/* --- Auth state listener --- */
supabase.auth.onAuthStateChange(function(event, session) {
  if (event === 'PASSWORD_RECOVERY') {
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

/* =========================================================
   Sidebar Navigation
   ========================================================= */
document.getElementById('hamburgerBtn').addEventListener('click', toggleSidebar);
document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

document.getElementById('navFocus').addEventListener('click', function() {
  closeSidebar();
  openFocusMode();
});
document.getElementById('navGoals').addEventListener('click', function() {
  closeSidebar();
  openGoalsModal();
});
document.getElementById('navFolders').addEventListener('click', function() {
  closeSidebar();
  openFolderManager();
});
document.getElementById('navTags').addEventListener('click', function() {
  closeSidebar();
  openTagManager();
});
document.getElementById('navDashboard').addEventListener('click', function() {
  closeSidebar();
  openDashboard();
});
document.getElementById('navExport').addEventListener('click', function() {
  closeSidebar();
  openExportModal();
});
document.getElementById('navImport').addEventListener('click', function() {
  closeSidebar();
  importEntries();
});
document.getElementById('navTheme').addEventListener('click', function() {
  themePickerVisible = !themePickerVisible;
  document.getElementById('themePicker').classList.toggle('hidden', !themePickerVisible);
  renderThemePicker();
});
document.getElementById('navDark').addEventListener('click', function() {
  closeSidebar();
  toggleDark();
  updateDarkToggle();
});

function updateDarkToggle() {
  var isDark = document.documentElement.dataset.theme === 'dark';
  document.getElementById('darkIcon').textContent = isDark ? '☀️' : '🌙';
  document.getElementById('darkLabel').textContent = isDark ? 'โหมดสว่าง' : 'โหมดมืด';
}

/* =========================================================
   Load / Persist (Supabase)
   ========================================================= */
async function loadEntries() {
  if (!currentUser) return;
  if (!entries.length) showLoading('กำลังโหลดบันทึก...');
  var res = await supabase.from('entries').select('*').eq('user_id', currentUser.id).order('ts', { ascending: false });
  if (res.error) { showToast('โหลดข้อมูลไม่สำเร็จ', 'error'); return; }
  entries = res.data || [];
}

var ENTRY_COLUMNS = ['id','ts','text','mood','tags','folder_id','user_id','images'];

function sanitizeEntry(e) {
  var clean = {};
  ENTRY_COLUMNS.forEach(function(k) { if (e[k] !== undefined) clean[k] = e[k]; });
  return clean;
}

async function persistEntry(entry) {
  if (!currentUser) return false;
  entry.user_id = currentUser.id;
  var res = await supabase.from('entries').upsert(sanitizeEntry(entry), { onConflict: 'id' });
  if (res.error) { showToast('บันทึกไม่สำเร็จ — ' + res.error.message, 'error'); return false; }
  return true;
}

async function deleteEntryFromDB(id) {
  if (!currentUser) return false;
  var res = await supabase.from('entries').delete().eq('id', id).eq('user_id', currentUser.id);
  if (res.error) { showToast('ลบไม่สำเร็จ — ' + res.error.message, 'error'); return false; }
  return true;
}

async function persistAllEntries() {
  if (!currentUser) return false;
  var toUpsert = entries.map(function(e) { e.user_id = currentUser.id; return sanitizeEntry(e); });
  var res = await supabase.from('entries').upsert(toUpsert, { onConflict: 'id' });
  if (res.error) { showToast('บันทึกไม่สำเร็จ — ' + res.error.message, 'error'); return false; }
  return true;
}

/* =========================================================
   Folder CRUD (Supabase)
   ========================================================= */
async function loadFolders() {
  if (!currentUser) return;
  if (!folders.length) showLoading('กำลังโหลด...');
  var res = await supabase.from('folders').select('*').eq('user_id', currentUser.id).order('sort_order', { ascending: true });
  if (res.error) { showToast('โหลดโฟลเดอร์ไม่สำเร็จ', 'error'); return; }
  folders = res.data || [];
}

async function persistFolder(folder) {
  if (!currentUser) return false;
  folder.user_id = currentUser.id;
  var res = await supabase.from('folders').upsert(folder, { onConflict: 'id' });
  if (res.error) { showToast('บันทึกโฟลเดอร์ไม่สำเร็จ', 'error'); return false; }
  return true;
}

async function deleteFolderFromDB(id) {
  if (!currentUser) return false;
  entries.forEach(function(e) { if (e.folder_id === id) e.folder_id = ''; });
  await persistAllEntries();
  var res = await supabase.from('folders').delete().eq('id', id).eq('user_id', currentUser.id);
  if (res.error) { showToast('ลบโฟลเดอร์ไม่สำเร็จ', 'error'); return false; }
  return true;
}

/* =========================================================
   Goals CRUD (Supabase)
   ========================================================= */
async function loadGoals() {
  if (!currentUser) return;
  if (!goals.length) showLoading('กำลังโหลด...');
  var res = await supabase.from('goals').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: true });
  if (res.error) { showToast('โหลดเป้าหมายไม่สำเร็จ', 'error'); return; }
  goals = (res.data || []).filter(function(g) { return !g.archived; });
}

async function persistGoal(goal) {
  if (!currentUser) return false;
  goal.user_id = currentUser.id;
  var res = await supabase.from('goals').upsert(goal, { onConflict: 'id' });
  if (res.error) { showToast('บันทึกเป้าหมายไม่สำเร็จ', 'error'); return false; }
  return true;
}

async function deleteGoalFromDB(id) {
  if (!currentUser) return false;
  var res = await supabase.from('goals').delete().eq('id', id).eq('user_id', currentUser.id);
  if (res.error) { showToast('ลบเป้าหมายไม่สำเร็จ', 'error'); return false; }
  await supabase.from('goal_logs').delete().eq('goal_id', id).eq('user_id', currentUser.id);
  return true;
}

/* =========================================================
   Goal Logs CRUD (Supabase)
   ========================================================= */
async function loadGoalLogs() {
  if (!currentUser) return;
  var res = await supabase.from('goal_logs').select('*').eq('user_id', currentUser.id);
  if (res.error) { showToast('โหลดข้อมูลเป้าหมายไม่สำเร็จ', 'error'); return; }
  var logs = res.data || [];
  goalLogs = {};
  logs.forEach(function(l) {
    goalLogs[l.goal_id + '_' + l.date] = l.completed;
  });
}

async function persistGoalLog(log) {
  if (!currentUser) return false;
  log.user_id = currentUser.id;
  var res = await supabase.from('goal_logs').upsert(log, { onConflict: 'id' });
  if (res.error) { showToast('บันทึกไม่สำเร็จ', 'error'); return false; }
  return true;
}

async function deleteGoalLog(logId, goalId, date) {
  if (!currentUser) return;
  delete goalLogs[goalId + '_' + date];
  await supabase.from('goal_logs').delete().eq('id', logId).eq('user_id', currentUser.id);
}

/* =========================================================
   Theme
   ========================================================= */
function applyTheme(name) {
  document.documentElement.dataset.theme = name;
  localStorage.setItem(THEME_KEY, name);
  document.querySelectorAll('.theme-dot').forEach(function(d) {
    d.classList.toggle('active', d.dataset.theme === name);
  });
  updateDarkToggle();
  if (calendarVisible) renderCalendar();
}

function getDefaultTheme() {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function toggleDark() {
  var cur = document.documentElement.dataset.theme;
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

function renderThemePicker() {
  var container = document.getElementById('themePicker');
  container.innerHTML = '';
  THEMES.forEach(function(t) {
    var btn = document.createElement('button');
    btn.className = 'theme-dot';
    btn.dataset.theme = t.name;
    btn.innerHTML = '<span class="dot-marker" style="background:' + t.dot + ';width:10px;height:10px;border-radius:50%;display:inline-block;"></span> ' + t.label;
    if (document.documentElement.dataset.theme === t.name) btn.classList.add('active');
    btn.addEventListener('click', function() { applyTheme(t.name); });
    container.appendChild(btn);
  });
}

/* =========================================================
   Toast
   ========================================================= */
function showToast(msg, type) {
  var container = document.getElementById('toastContainer');
  var el = document.createElement('div');
  el.className = 'toast ' + (type || 'info');
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(function() {
    el.style.opacity = '0';
    setTimeout(function() { el.remove(); }, 300);
  }, 4000);
}

function showLoading(msg) {
  var list = document.getElementById('list');
  list.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>' + (msg || 'กำลังโหลด...') + '</span></div>';
}

function hideLoading() {
  /* no-op — render() replaces content */
}

/* =========================================================
   Modal
   ========================================================= */
function showModal(cfg) {
  var title = cfg.title, bodyHtml = cfg.bodyHtml, onConfirm = cfg.onConfirm;
  var confirmText = cfg.confirmText, showCancel = cfg.showCancel, onShow = cfg.onShow;
  var overlay = document.getElementById('modalOverlay');
  var safeTitle = title ? '<div class="modal-title">' + escapeHtml(title) + '</div>' : '';
  overlay.innerHTML =
    '<div class="modal" role="dialog" aria-modal="true">' +
      '<button class="modal-close" aria-label="ปิด">&times;</button>' +
      safeTitle +
      '<div class="modal-body">' + (bodyHtml || '') + '</div>' +
      '<div class="modal-actions">' +
        (showCancel ? '<button class="modal-btn modal-cancel" id="modalCancelBtn">ยกเลิก</button>' : '') +
        (onConfirm ? '<button class="modal-btn modal-confirm" id="modalConfirmBtn">' + escapeHtml(confirmText || 'ตกลง') + '</button>' : '') +
      '</div>' +
    '</div>';
  overlay.hidden = false;

  var modalEl = overlay.querySelector('.modal');
  var previouslyFocused = document.activeElement;
  if (modalEl) {
    var firstFocusable = modalEl.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus();
  }

  function close() {
    overlay.hidden = true;
    overlay.innerHTML = '';
    document.removeEventListener('keydown', escHandler);
    overlay.removeEventListener('click', clickOverlay);
    if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
  }

  function escHandler(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', escHandler);

  function clickOverlay(e) { if (e.target === overlay) close(); }
  overlay.addEventListener('click', clickOverlay);

  overlay.querySelector('.modal-close').addEventListener('click', close);
  if (showCancel) overlay.querySelector('#modalCancelBtn').addEventListener('click', close);
  if (onConfirm) {
    overlay.querySelector('#modalConfirmBtn').addEventListener('click', function() {
      onConfirm(close);
    });
  }
  if (onShow) requestAnimationFrame(function() { onShow(close); });
  return { close: close, overlay: overlay };
}

/* =========================================================
   Mood Picker Factory
   ========================================================= */
function createMoodPicker(container, initialMood, onChange) {
  container.innerHTML = '';
  var selected = initialMood;
  MOODS.forEach(function(m) {
    var btn = document.createElement('button');
    btn.className = 'mood';
    btn.type = 'button';
    btn.textContent = m;
    if (m === selected) btn.classList.add('on');
    btn.addEventListener('click', function() {
      selected = selected === m ? null : m;
      Array.from(container.children).forEach(function(c) { c.classList.toggle('on', c.textContent === selected); });
      onChange(selected);
    });
    container.appendChild(btn);
  });
}

createMoodPicker(document.getElementById('moods'), null, function(m) { selectedMood = m; });

function resetComposerMood() {
  selectedMood = null;
  Array.from(document.getElementById('moods').children).forEach(function(c) { c.classList.remove('on'); });
}

var pendingImages = [];
var imageUploadAbort = null;

function initImageUpload() {
  if (imageUploadAbort) imageUploadAbort.abort();
  imageUploadAbort = new AbortController();
  var area = document.getElementById('imageUploadArea');
  var input = document.getElementById('imageInput');
  if (!area || !input) return;
  input.addEventListener('change', function(e) {
    Array.from(e.target.files).forEach(function(file) {
      if (file.size > 5 * 1024 * 1024) { showToast('รูปภาพต้องไม่เกิน 5MB', 'error'); return; }
      var url = URL.createObjectURL(file);
      pendingImages.push({ file: file, url: url });
      renderImagePreviews();
    });
    input.value = '';
  }, { signal: imageUploadAbort.signal });
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

/* =========================================================
   Entry CRUD
   ========================================================= */
async function saveEntry() {
  var textEl = document.getElementById('text');
  var tagsEl = document.getElementById('tags');
  var text = textEl.value.trim();
  if (!text && !selectedMood) { showToast('กรุณาเขียนข้อความหรือเลือกอารมณ์', 'info'); return; }
  var entry = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    ts: Date.now(),
    text: text,
    mood: selectedMood,
    tags: tagsEl.value.split(',').map(function(t) { return t.trim(); }).filter(Boolean),
    folder_id: selectedFolderId
  };
  if (pendingImages.length) {
    var imageUrls = await uploadImages(pendingImages.map(function(p) { return p.file; }));
    entry.images = imageUrls;
    pendingImages.forEach(function(p) { URL.revokeObjectURL(p.url); });
    pendingImages = [];
    document.getElementById('imagePreviewRow').innerHTML = '';
  }
  entries.unshift(entry);
  persistEntry(entry).then(function(ok) {
    if (!ok) { entries.shift(); return; }
    textEl.value = '';
    tagsEl.value = '';
    resetComposerMood();
    render();
    showToast('บันทึกแล้ว', 'success');
  });
}

function deleteEntry(id) {
  var entry = null;
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].id === id) { entry = entries[i]; break; }
  }
  if (!entry) return;
  showModal({
    title: 'ลบบันทึก',
    bodyHtml: '<p>ลบบันทึกนี้ใช่ไหม?</p><div style="margin:10px 0;padding:12px;background:var(--accent-soft);font-size:.85rem;border-radius:var(--radius-sm);">' + escapeHtml((entry.text || '').slice(0, 200)) + '</div>',
    confirmText: 'ลบ',
    showCancel: true,
    onConfirm: function(close) {
      entries = entries.filter(function(e) { return e.id !== id; });
      deleteEntryFromDB(id).then(function(ok) {
        if (ok) { render(); close(); showToast('ลบแล้ว', 'success'); }
        else { entries.push(entry); entries.sort(function(a, b) { return b.ts - a.ts; }); }
      });
    }
  });
}

function openEditModal(id) {
  var entry = null;
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].id === id) { entry = entries[i]; break; }
  }
  if (!entry) return;
  var editMood = entry.mood;
  var escapedText = escapeHtml(entry.text || '');
  var escapedTags = escapeHtml((entry.tags || []).join(', '));

  showModal({
    title: 'แก้ไขบันทึก',
    bodyHtml:
      '<textarea id="editText" maxlength="10000">' + escapedText + '</textarea>' +
      '<div class="moods" id="editMoods" style="margin-top:12px;"></div>' +
      '<input type="text" id="editTags" value="' + escapedTags + '" maxlength="500" placeholder="แท็ก คั่นด้วยจุลภาค" style="margin-top:12px;">',
    confirmText: 'บันทึก',
    showCancel: true,
    onConfirm: function(close) {
      var newText = document.getElementById('editText').value.trim();
      if (!newText && !editMood) { showToast('กรุณาเขียนข้อความหรือเลือกอารมณ์', 'info'); return; }
      entry.text = newText;
      entry.mood = editMood;
      entry.tags = document.getElementById('editTags').value.split(',').map(function(t) { return t.trim(); }).filter(Boolean);
      persistEntry(entry).then(function(ok) {
        if (ok) { render(); close(); showToast('แก้ไขแล้ว', 'success'); }
      });
    },
    onShow: function() {
      var container = document.getElementById('editMoods');
      if (container) createMoodPicker(container, editMood, function(m) { editMood = m; });
    }
  });
}

/* =========================================================
   Filter
   ========================================================= */
function filtered() {
  var q = (document.getElementById('search').value || '').trim().toLowerCase();
  var now = Date.now();
  var d = new Date();
  var startToday = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return entries.filter(function(e) {
    if (filterDay) {
      var ed = new Date(e.ts);
      var ek = ed.getFullYear() + '-' + String(ed.getMonth() + 1).padStart(2, '0') + '-' + String(ed.getDate()).padStart(2, '0');
      if (ek !== filterDay) return false;
    } else {
      if (filterRange === 'today' && e.ts < startToday) return false;
      if (filterRange === 'week' && e.ts < now - 7 * 864e5) return false;
      if (filterRange === 'month' && e.ts < now - 30 * 864e5) return false;
    }
    if (activeTag && !((e.tags || []).includes(activeTag))) return false;
    if (activeFolderFilter && e.folder_id !== activeFolderFilter) return false;
    if (q && !(((e.text || '').toLowerCase().includes(q)) || ((e.tags || []).some(function(t) { return (t || '').toLowerCase().includes(q); })))) return false;
    return true;
  });
}

/* =========================================================
   Render
   ========================================================= */
var fmtDay = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
var fmtTime = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' });

function dayKey(ts) {
  var d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>'"]/g, function(c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c;
  });
}

function formatDateKey(key) {
  var parts = key.split('-');
  var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return fmtDay.format(date);
}

function render() {
  var scrollY = window.scrollY;
  var list = document.getElementById('list');
  var items = filtered();
  list.innerHTML = '';

  if (filterDay) {
    var dayBar = document.createElement('div');
    dayBar.className = 'filter-bar';
    dayBar.innerHTML = '📅 ' + formatDateKey(filterDay) + ' <button class="chip" id="clearDayFilter">✕</button>';
    list.appendChild(dayBar);
  }

  if (activeFolderFilter) {
    var folderObj = getFolderById(activeFolderFilter);
    var folderBar = document.createElement('div');
    folderBar.className = 'filter-bar';
    folderBar.innerHTML = '<span style="font-size:.85rem;">' + (folderObj ? (folderObj.icon || '📁') + ' ' + escapeHtml(folderObj.name) : 'โฟลเดอร์') + '</span> <span style="flex:1;font-size:.8rem;color:var(--muted);">📂 กรองตามโฟลเดอร์</span> <button class="chip" id="clearFolderFilter">✕</button>';
    list.appendChild(folderBar);
  }

  if (activeTag) {
    var tagBar = document.createElement('div');
    tagBar.className = 'filter-bar';
    tagBar.innerHTML = '<span class="tag" style="cursor:default;">#' + escapeHtml(activeTag) + '</span> <span style="flex:1;">กรองตามแท็ก</span> <button class="chip" id="clearTagFilter">✕</button>';
    list.appendChild(tagBar);
  }

  if (!items.length) {
    if (!entries.length) {
      list.innerHTML += '<div class="empty"><div class="big">🌱</div>ยังไม่มีบันทึก — เริ่มเขียนเรื่องราวแรกของคุณ</div>';
    } else {
      list.innerHTML += '<div class="empty"><div class="big">🔍</div>ยังไม่มีบันทึกตรงเงื่อนไข</div>';
    }
  } else {
    var lastDay = null;
    for (var i = 0; i < items.length; i++) {
      var e = items[i];
      var dk = dayKey(e.ts);
      if (dk !== lastDay) {
        lastDay = dk;
        var lbl = document.createElement('div');
        lbl.className = 'day-label';
        lbl.textContent = fmtDay.format(e.ts);
        list.appendChild(lbl);
      }
      var el = document.createElement('div');
      el.className = 'entry';
      el.dataset.id = e.id;
      var html = '<div class="entry-head">';
      if (e.mood) html += '<span class="entry-mood">' + escapeHtml(e.mood) + '</span>';
      html += '<span class="entry-time">' + fmtTime.format(e.ts) + ' น.</span></div>';
      if (e.text) html += '<div class="entry-text">' + escapeHtml(e.text) + '</div>';
      if (e.folder_id) {
        var folder = getFolderById(e.folder_id);
        if (folder) {
          html += '<div style="margin-top:8px;"><span class="entry-folder"><span class="folder-dot" style="background:' + (folder.color || '#5b6b7f') + ';"></span> ' + (folder.icon || '📁') + ' ' + escapeHtml(folder.name) + '</span></div>';
        }
      }
      if ((e.tags || []).length) {
        html += '<div class="entry-tags">';
        for (var t = 0; t < e.tags.length; t++) {
          html += '<span class="tag" data-tag="' + escapeHtml(e.tags[t]) + '">#' + escapeHtml(e.tags[t]) + '</span>';
        }
        html += '</div>';
      }
      if ((e.images || []).length) {
        html += '<div class="entry-images">';
        for (var img = 0; img < e.images.length; img++) {
          html += '<img src="' + escapeHtml(e.images[img]) + '" alt="รูปภาพ" loading="lazy" data-lightbox="' + escapeHtml(e.images[img]) + '" data-idx="' + img + '" data-total="' + e.images.length + '">';
        }
        html += '</div>';
      }
      html += '<button class="entry-edit" aria-label="แก้ไข">แก้ไข</button>';
      html += '<button class="entry-del" aria-label="ลบ">ลบ</button>';
      el.innerHTML = html;
      list.appendChild(el);
    }
  }

  renderStats();
  renderCalendar();
  window.scrollTo(0, scrollY);
}

function renderStats() {
  var total = entries.length;
  var daysSet = {};
  entries.forEach(function(e) { daysSet[dayKey(e.ts)] = true; });
  var streak = 0;
  var d = new Date();
  if (!daysSet[dayKey(d.getTime())]) d.setDate(d.getDate() - 1);
  while (daysSet[dayKey(d.getTime())]) { streak++; d.setDate(d.getDate() - 1); }
  var counts = {};
  entries.forEach(function(e) { if (e.mood) counts[e.mood] = (counts[e.mood] || 0) + 1; });
  var top = Object.entries(counts).sort(function(a, b) { return b[1] - a[1]; })[0];
  var moodIcon = top ? top[0] : '😊';
  var moodText = top ? top[0] : '—';

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statStreak').textContent = streak;
  document.getElementById('statMood').textContent = moodText;
  document.getElementById('statMoodIcon').textContent = moodIcon;
}

/* =========================================================
   Calendar (month view)
   ========================================================= */
var calDate = new Date();
var fmtMonthTitle = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' });

function renderCalendar() {
  var wrap = document.getElementById('calendarWrap');
  if (!calendarVisible) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');

  var year = calDate.getFullYear();
  var month = calDate.getMonth();
  document.getElementById('calTitle').textContent = fmtMonthTitle.format(new Date(year, month, 1));

  var dayMap = {};
  entries.forEach(function(e) {
    var ed = new Date(e.ts);
    var key = ed.getFullYear() + '-' + String(ed.getMonth() + 1).padStart(2, '0') + '-' + String(ed.getDate()).padStart(2, '0');
    if (!dayMap[key]) dayMap[key] = [];
    dayMap[key].push(e);
  });

  var grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  var dowNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  for (var d = 0; d < 7; d++) {
    var dow = document.createElement('div');
    dow.className = 'cal-dow';
    dow.textContent = dowNames[d];
    grid.appendChild(dow);
  }

  var first = new Date(year, month, 1);
  var start = new Date(first);
  start.setDate(start.getDate() - start.getDay());
  var last = new Date(year, month + 1, 0);
  var end = new Date(last);
  end.setDate(end.getDate() + (6 - end.getDay()));

  var todayKey = (function() {
    var t = new Date();
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  })();

  var cur = new Date(start);
  while (cur <= end) {
    var key = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0');
    var dayEntries = dayMap[key] || [];
    var cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (cur.getMonth() !== month) cell.className += ' other-month';
    if (filterDay === key) cell.className += ' selected';
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('role', 'button');
    cell.setAttribute('aria-label', cur.toLocaleDateString('th-TH') + ', ' + dayEntries.length + ' รายการ');

    var num = document.createElement('div');
    num.className = 'cal-daynum' + (key === todayKey ? ' today' : '');
    num.textContent = cur.getDate();
    cell.appendChild(num);

    var maxPills = 3;
    for (var j = 0; j < Math.min(dayEntries.length, maxPills); j++) {
      var pill = document.createElement('div');
      pill.className = 'cal-pill';
      var en = dayEntries[j];
      pill.textContent = (en.mood ? en.mood + ' ' : '') + (en.text || '');
      pill.title = en.text || '';
      cell.appendChild(pill);
    }
    if (dayEntries.length > maxPills) {
      var more = document.createElement('div');
      more.className = 'cal-more';
      more.textContent = 'อีก ' + (dayEntries.length - maxPills);
      cell.appendChild(more);
    }

    cell.addEventListener('click', (function(k) {
      return function() { filterDay = filterDay === k ? null : k; render(); };
    })(key));
    cell.addEventListener('keydown', (function(k) {
      return function(ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          filterDay = filterDay === k ? null : k;
          render();
        }
      };
    })(key));

    grid.appendChild(cell);
    cur.setDate(cur.getDate() + 1);
  }
}

/* =========================================================
   Export
   ========================================================= */
function downloadFile(content, filename, mimeType) {
  var blob = new Blob([content], { type: mimeType });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 10000);
}

function exportJSON() {
  downloadFile(
    JSON.stringify(entries, null, 2),
    'life-log-backup-' + new Date().toISOString().slice(0, 10) + '.json',
    'application/json'
  );
}

function csvEscape(s) { return String(s).replace(/"/g, '""'); }

function exportCSV() {
  var lines = ['วันที่,เวลา,อารมณ์,แท็ก,ข้อความ'];
  entries.forEach(function(e) {
    var d = new Date(e.ts);
    lines.push('"' + csvEscape(d.toISOString().slice(0, 10)) + '","' + csvEscape(d.toISOString().slice(11, 19)) + '","' + csvEscape(e.mood || '') + '","' + csvEscape((e.tags || []).join('; ')) + '","' + csvEscape(e.text || '') + '"');
  });
  downloadFile(lines.join('\n'), 'life-log-' + new Date().toISOString().slice(0, 10) + '.csv', 'text/csv;charset=utf-8');
}

function exportHTML() {
  var rows = '';
  entries.forEach(function(e) {
    var d = new Date(e.ts);
    var date = d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    var time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    rows += '<div style="margin-bottom:16px;padding:16px;"><div style="margin-bottom:4px;">';
    if (e.mood) rows += '<span style="font-size:1rem;">' + escapeHtml(e.mood) + '</span> ';
    rows += '<span style="color:#888;font-size:.8rem;">' + date + ' ' + time + '</span></div>';
    if (e.text) rows += '<p style="white-space:pre-wrap;margin:4px 0;">' + escapeHtml(e.text) + '</p>';
    if ((e.tags || []).length) rows += '<div style="margin-top:4px;">' + e.tags.map(function(t) { return '<span style="border:1px solid #aaa;padding:1px 6px;font-size:.8rem;margin-right:4px;">#' + escapeHtml(t) + '</span>'; }).join('') + '</div>';
    rows += '</div>';
  });
  var html = '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>Life Log</title><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{font-family:sans-serif;max-width:640px;margin:0 auto;padding:32px 20px;color:#333;line-height:1.7;}</style></head><body><h1>Life Log</h1><p style="color:#888;margin-bottom:24px;font-size:.8rem;">ส่งออกเมื่อ ' + new Date().toLocaleString('th-TH') + ' · ' + entries.length + ' รายการ</p>' + (rows || '<p style="color:#888;">ยังไม่มีบันทึก</p>') + '</body></html>';
  downloadFile(html, 'life-log-' + new Date().toISOString().slice(0, 10) + '.html', 'text/html;charset=utf-8');
}

function exportPDF() {
  var rows = '';
  entries.forEach(function(e) {
    var d = new Date(e.ts);
    var date = d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    var time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    rows += '<div style="margin-bottom:16px;padding:16px;"><div style="margin-bottom:4px;">';
    if (e.mood) rows += '<span style="font-size:1rem;">' + escapeHtml(e.mood) + '</span> ';
    rows += '<span style="color:#888;font-size:.8rem;">' + date + ' ' + time + '</span></div>';
    if (e.text) rows += '<p style="white-space:pre-wrap;margin:4px 0;">' + escapeHtml(e.text) + '</p>';
    if ((e.tags || []).length) rows += '<div style="margin-top:4px;">' + e.tags.map(function(t) { return '<span style="border:1px solid #aaa;padding:1px 6px;font-size:.8rem;margin-right:4px;">#' + escapeHtml(t) + '</span>'; }).join('') + '</div>';
    rows += '</div>';
  });
  var html = '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>Life Log</title><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{font-family:sans-serif;max-width:640px;margin:0 auto;padding:32px 20px;color:#333;line-height:1.7;}</style></head><body><h1>Life Log</h1><p style="color:#888;margin-bottom:24px;font-size:.8rem;">ส่งออกเมื่อ ' + new Date().toLocaleString('th-TH') + ' · ' + entries.length + ' รายการ</p>' + (rows || '<p style="color:#888;">ยังไม่มีบันทึก</p>') + '</body></html>';
  var w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(function() { w.print(); }, 500); }
  else { showToast('กรุณาอนุญาต popup เพื่อพิมพ์', 'error'); }
}

function openExportModal() {
  showModal({
    title: 'ส่งออกข้อมูล',
    bodyHtml:
      '<div class="export-option" data-format="json"><div class="ex-icon">📄</div><div><div class="ex-label">JSON</div><div class="ex-desc">ข้อมูลดิบ — นำเข้าคืนได้</div></div></div>' +
      '<div class="export-option" data-format="csv"><div class="ex-icon">📊</div><div><div class="ex-label">CSV</div><div class="ex-desc">ตาราง — เปิดใน Excel / Sheets</div></div></div>' +
      '<div class="export-option" data-format="html"><div class="ex-icon">🌐</div><div><div class="ex-label">HTML</div><div class="ex-desc">หน้าเว็บแบบสแตนด์อโลน</div></div></div>' +
      '<div class="export-option" data-format="pdf"><div class="ex-icon">🖨️</div><div><div class="ex-label">PDF / พิมพ์</div><div class="ex-desc">เปิดหน้าพิมพ์ (Ctrl+P)</div></div></div>',
    onShow: function(close) {
      document.querySelectorAll('.export-option').forEach(function(el) {
        el.addEventListener('click', function() {
          close();
          var fmt = el.dataset.format;
          if (fmt === 'json') exportJSON();
          else if (fmt === 'csv') exportCSV();
          else if (fmt === 'html') exportHTML();
          else if (fmt === 'pdf') exportPDF();
        });
      });
    }
  });
}

/* =========================================================
   Import
   ========================================================= */
function importEntries() { var el = document.getElementById('importFile'); if (el) el.click(); }

var importFileEl = document.getElementById('importFile');
if (importFileEl) importFileEl.addEventListener('change', function(e) {
  var f = e.target.files[0];
  if (!f) return;
  var r = new FileReader();
  r.onload = function() {
    try {
      var data = JSON.parse(r.result);
      if (!Array.isArray(data)) throw new Error();
      var valid = data.filter(function(x) {
        if (!x || typeof x.id !== 'string' || typeof x.ts !== 'number' || isNaN(x.ts)) return false;
        if (x.text != null && typeof x.text !== 'string') return false;
        if (x.mood != null && typeof x.mood !== 'string') return false;
        if (x.tags != null && !Array.isArray(x.tags)) return false;
        if (x.images != null && !Array.isArray(x.images)) return false;
        return true;
      });
      var ids = {};
      entries.forEach(function(x) { ids[x.id] = true; });
      var added = valid.filter(function(x) { return !ids[x.id]; });
      if (valid.length < data.length) showToast('ละเว้น ' + (data.length - valid.length) + ' รายการที่ไม่ถูกต้อง', 'error');
      if (!added.length) { showToast('ไม่มีรายการใหม่', 'info'); return; }
      entries = added.concat(entries).sort(function(a, b) { return b.ts - a.ts; });
      persistAllEntries().then(function(ok) {
        if (ok) { render(); showToast('นำเข้าสำเร็จ: เพิ่ม ' + added.length + ' รายการ', 'success'); }
      });
    } catch(ex) {
      showToast('ไฟล์ไม่ถูกต้อง — ต้องเป็นไฟล์ JSON ที่ส่งออกจากแอปนี้', 'error');
    }
  };
  r.readAsText(f);
  e.target.value = '';
});

/* =========================================================
   Tag Management
   ========================================================= */
function getAllTags() {
  var map = {};
  entries.forEach(function(e) {
    (e.tags || []).forEach(function(t) { if (t) map[t] = (map[t] || 0) + 1; });
  });
  return Object.entries(map).sort(function(a, b) { return b[1] - a[1]; });
}

function openTagManager() {
  var tags = getAllTags();
  var html = '';
  if (!tags.length) html = '<p style="color:var(--muted);font-size:.85rem;">ยังไม่มีแท็ก</p>';
  tags.forEach(function(t) {
    html += '<div class="tag-mgr-entry"><div><span class="tag-mgr-tag">#' + escapeHtml(t[0]) + '</span><span class="tag-mgr-count">' + t[1] + ' รายการ</span></div><div class="tag-mgr-actions">';
    html += '<button data-action="rename" data-tag="' + escapeHtml(t[0]) + '">เปลี่ยนชื่อ</button>';
    html += '<button data-action="merge" data-tag="' + escapeHtml(t[0]) + '">รวม</button>';
    html += '<button data-action="delete" data-tag="' + escapeHtml(t[0]) + '">ลบ</button>';
    html += '</div></div>';
  });
  showModal({
    title: 'จัดการแท็ก', bodyHtml: html,
    onShow: function(close) {
      document.querySelectorAll('.tag-mgr-entry [data-action]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var action = btn.dataset.action, tag = btn.dataset.tag;
          close();
          if (action === 'rename') renameTag(tag);
          else if (action === 'merge') mergeTag(tag);
          else if (action === 'delete') deleteTag(tag);
        });
      });
    }
  });
}

function renameTag(oldTag) {
  showModal({
    title: 'เปลี่ยนชื่อแท็ก',
    bodyHtml: '<p style="margin-bottom:10px;font-size:.85rem;">เปลี่ยนชื่อ <strong>#' + escapeHtml(oldTag) + '</strong></p><input type="text" id="renameInput" value="' + escapeHtml(oldTag) + '" maxlength="100">',
    confirmText: 'เปลี่ยน', showCancel: true,
    onConfirm: function(close) {
      var newName = document.getElementById('renameInput').value.trim();
      if (!newName || newName === oldTag) { close(); return; }
      entries.forEach(function(e) {
        if ((e.tags || []).indexOf(oldTag) !== -1) {
          e.tags = e.tags.map(function(t) { return t === oldTag ? newName : t; });
          var seen = {};
          e.tags = e.tags.filter(function(t) { if (seen[t]) return false; seen[t] = true; return true; });
        }
      });
      persistAllEntries().then(function() { render(); close(); showToast('เปลี่ยนชื่อแท็กแล้ว', 'success'); });
    }
  });
}

function mergeTag(sourceTag) {
  var tags = getAllTags().filter(function(t) { return t[0] !== sourceTag; });
  var options = '<option value="">-- เลือกแท็กปลายทาง --</option>';
  tags.forEach(function(t) { options += '<option value="' + escapeHtml(t[0]) + '">#' + escapeHtml(t[0]) + ' (' + t[1] + ')</option>'; });
  showModal({
    title: 'รวมแท็ก',
    bodyHtml: '<p style="margin-bottom:10px;font-size:.85rem;">รวม <strong>#' + escapeHtml(sourceTag) + '</strong> เข้ากับ:</p><select id="mergeSelect">' + options + '</select>',
    confirmText: 'รวม', showCancel: true,
    onConfirm: function(close) {
      var targetTag = document.getElementById('mergeSelect').value;
      if (!targetTag) { showToast('เลือกแท็กปลายทาง', 'info'); return; }
      entries.forEach(function(e) {
        if ((e.tags || []).includes(sourceTag)) {
          e.tags = e.tags.filter(function(t) { return t !== sourceTag; });
          if (!e.tags.includes(targetTag)) e.tags.push(targetTag);
        }
      });
      persistAllEntries().then(function() { render(); close(); showToast('รวมแท็กแล้ว', 'success'); });
    }
  });
}

function deleteTag(tag) {
  showModal({
    title: 'ลบแท็ก',
    bodyHtml: '<p style="font-size:.85rem;">ลบแท็ก <strong>#' + escapeHtml(tag) + '</strong> จากทุกรายการใช่ไหม?</p>',
    confirmText: 'ลบ', showCancel: true,
    onConfirm: function(close) {
      entries.forEach(function(e) { e.tags = (e.tags || []).filter(function(t) { return t !== tag; }); });
      persistAllEntries().then(function() { render(); close(); showToast('ลบแท็กแล้ว', 'success'); });
    }
  });
}

/* =========================================================
   Folder Management UI
   ========================================================= */
var FOLDER_COLORS = ['#5b6b7f','#b35a6a','#6a8a5a','#8a6a9a','#9a7a5a','#5a8a8a','#a85a5a','#5a8a7a','#7a9a5a','#9a5a8a'];
var FOLDER_ICONS = ['📁','📂','📒','📓','📔','📕','📗','📘','📙','📚','🗂️','🏠','💼','🎓','❤️','⭐','🎵','🎨','✈️','🏋️','📖','🎮','🍳','🌱'];

function renderFolderSelect() {
  var sel = document.getElementById('folderSelect');
  if (!sel) return;
  var curVal = sel.value;
  sel.innerHTML = '<option value="">ไม่มี</option>';
  folders.forEach(function(f) {
    var opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = (f.icon || '📁') + ' ' + f.name;
    if (f.id === curVal) opt.selected = true;
    sel.appendChild(opt);
  });
}

function getFolderById(id) {
  if (!id) return null;
  for (var i = 0; i < folders.length; i++) {
    if (folders[i].id === id) return folders[i];
  }
  return null;
}

function getEntryCountForFolder(folderId) {
  var count = 0;
  entries.forEach(function(e) { if (e.folder_id === folderId) count++; });
  return count;
}

function openFolderManager() {
  var html = '<button class="modal-btn modal-confirm" id="addFolderBtn" style="width:100%;margin-bottom:16px;justify-content:center;">➕ เพิ่มโฟลเดอร์</button><div id="folderList">';
  if (!folders.length) {
    html += '<p style="text-align:center;color:var(--muted);padding:20px;font-size:.85rem;">ยังไม่มีโฟลเดอร์ — กดเพิ่มเลย!</p>';
  } else {
    folders.forEach(function(f) {
      var count = getEntryCountForFolder(f.id);
      html += '<div class="folder-mgr-entry">';
      html += '<span class="folder-mgr-icon">' + (f.icon || '📁') + '</span>';
      html += '<span class="folder-mgr-color" style="background:' + (f.color || '#5b6b7f') + ';"></span>';
      html += '<span class="folder-mgr-name">' + escapeHtml(f.name) + '</span>';
      html += '<span class="folder-mgr-count">' + count + ' รายการ</span>';
      html += '<div class="folder-mgr-actions">';
      html += '<button data-action="rename" data-id="' + f.id + '">เปลี่ยนชื่อ</button>';
      html += '<button data-action="color" data-id="' + f.id + '">สี</button>';
      html += '<button data-action="delete" data-id="' + f.id + '">ลบ</button>';
      html += '</div></div>';
    });
  }
  html += '</div>';

  showModal({
    title: 'จัดการโฟลเดอร์', bodyHtml: html,
    onShow: function(close) {
      document.getElementById('addFolderBtn').addEventListener('click', function() {
        close();
        showModal({
          title: 'สร้างโฟลเดอร์ใหม่',
          bodyHtml: '<input type="text" id="newFolderName" placeholder="ชื่อโฟลเดอร์" maxlength="50" style="margin-bottom:16px;">' +
            '<label style="display:block;margin-bottom:8px;font-size:.8rem;color:var(--muted);font-weight:600;">เลือกสี:</label><div class="folder-color-grid" id="folderColorGrid"></div>' +
            '<label style="display:block;margin:12px 0 8px;font-size:.8rem;color:var(--muted);font-weight:600;">เลือกไอคอน:</label><div class="folder-icon-grid" id="folderIconGrid"></div>',
          confirmText: 'สร้าง', showCancel: true,
          onConfirm: function(close2) {
            var name = document.getElementById('newFolderName').value.trim();
            if (!name) { showToast('ใส่ชื่อโฟลเดอร์', 'info'); return; }
            var selectedColor = FOLDER_COLORS[0];
            var selectedIcon = '📁';
            var selColorEl = document.querySelector('#folderColorGrid .sel');
            if (selColorEl) selectedColor = selColorEl.dataset.color;
            var selIconEl = document.querySelector('#folderIconGrid .sel');
            if (selIconEl) selectedIcon = selIconEl.textContent;
            var folder = {
              id: 'fld-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
              name: name,
              color: selectedColor,
              icon: selectedIcon,
              sort_order: folders.length
            };
            folders.push(folder);
            persistFolder(folder).then(function(ok) {
              if (ok) { renderFolderSelect(); close2(); showToast('สร้างโฟลเดอร์แล้ว', 'success'); }
              else { folders.pop(); }
            });
          },
          onShow: function() {
            var colorGrid = document.getElementById('folderColorGrid');
            FOLDER_COLORS.forEach(function(c, i) {
              var dot = document.createElement('div');
              dot.className = 'folder-color-opt' + (i === 0 ? ' sel' : '');
              dot.dataset.color = c;
              dot.style.background = c;
              dot.setAttribute('tabindex', '0');
              dot.setAttribute('role', 'button');
              dot.addEventListener('click', function() {
                document.querySelectorAll('#folderColorGrid .folder-color-opt').forEach(function(d) { d.classList.remove('sel'); });
                dot.classList.add('sel');
              });
              colorGrid.appendChild(dot);
            });
            var iconGrid = document.getElementById('folderIconGrid');
            FOLDER_ICONS.forEach(function(ic, i) {
              var btn = document.createElement('button');
              btn.className = 'folder-icon-opt' + (i === 0 ? ' sel' : '');
              btn.textContent = ic;
              btn.type = 'button';
              btn.addEventListener('click', function() {
                document.querySelectorAll('#folderIconGrid .folder-icon-opt').forEach(function(b) { b.classList.remove('sel'); });
                btn.classList.add('sel');
              });
              iconGrid.appendChild(btn);
            });
          }
        });
      });
      document.querySelectorAll('#folderList [data-action]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var action = btn.dataset.action, id = btn.dataset.id;
          close();
          if (action === 'rename') renameFolder(id);
          else if (action === 'color') changeFolderColor(id);
          else if (action === 'delete') deleteFolderPrompt(id);
        });
      });
    }
  });
}

function renameFolder(id) {
  var folder = getFolderById(id);
  if (!folder) return;
  showModal({
    title: 'เปลี่ยนชื่อโฟลเดอร์',
    bodyHtml: '<input type="text" id="renameFolderInput" value="' + escapeHtml(folder.name) + '" maxlength="50">',
    confirmText: 'เปลี่ยน', showCancel: true,
    onConfirm: function(close) {
      var name = document.getElementById('renameFolderInput').value.trim();
      if (!name || name === folder.name) { close(); return; }
      folder.name = name;
      persistFolder(folder).then(function(ok) {
        if (ok) { renderFolderSelect(); render(); close(); showToast('เปลี่ยนชื่อแล้ว', 'success'); }
      });
    }
  });
}

function changeFolderColor(id) {
  var folder = getFolderById(id);
  if (!folder) return;
  var colorOpts = '';
  FOLDER_COLORS.forEach(function(c) {
    colorOpts += '<div class="folder-color-opt' + (c === (folder.color || '#5b6b7f') ? ' sel' : '') + '" data-color="' + c + '" style="background:' + c + ';" tabindex="0" role="button"></div>';
  });
  showModal({
    title: 'เปลี่ยนสี',
    bodyHtml: '<div class="folder-color-grid">' + colorOpts + '</div>',
    confirmText: 'เปลี่ยน', showCancel: true,
    onConfirm: function(close) {
      var sel = document.querySelector('.folder-color-grid .sel');
      if (sel) {
        folder.color = sel.dataset.color;
        persistFolder(folder).then(function(ok) {
          if (ok) { render(); close(); showToast('เปลี่ยนสีแล้ว', 'success'); }
        });
      } else { close(); }
    },
    onShow: function() {
      document.querySelectorAll('.folder-color-opt').forEach(function(d) {
        d.addEventListener('click', function() {
          document.querySelectorAll('.folder-color-opt').forEach(function(x) { x.classList.remove('sel'); });
          d.classList.add('sel');
        });
      });
    }
  });
}

function deleteFolderPrompt(id) {
  var folder = getFolderById(id);
  if (!folder) return;
  var count = getEntryCountForFolder(id);
  var extra = count > 0 ? '<p style="margin-top:8px;font-size:.85rem;color:var(--danger);">⚠️ ' + count + ' รายการในโฟลเดอร์นี้จะถูกย้ายไป "ไม่มีโฟลเดอร์"</p>' : '';
  showModal({
    title: 'ลบโฟลเดอร์',
    bodyHtml: '<p>ลบโฟลเดอร์ <strong>' + escapeHtml(folder.name) + '</strong> ใช่ไหม?</p>' + extra,
    confirmText: 'ลบ', showCancel: true,
    onConfirm: function(close) {
      folders = folders.filter(function(f) { return f.id !== id; });
      deleteFolderFromDB(id).then(function(ok) {
        if (ok) {
          if (activeFolderFilter === id) activeFolderFilter = null;
          if (selectedFolderId === id) selectedFolderId = '';
          renderFolderSelect(); render(); close(); showToast('ลบโฟลเดอร์แล้ว', 'success');
        } else {
          folders.push(folder);
        }
      });
    }
  });
}

/* =========================================================
   Goals UI
   ========================================================= */
function openGoalsModal() {
  renderGoalsModal();
}

function renderGoalsModal() {
  var today = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  var fmtGoalDate = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  var totalChecked = 0;
  goals.forEach(function(g) {
    if (goalLogs[g.id + '_' + todayStr]) totalChecked++;
  });

  var html = '<div class="goal-item" style="cursor:default;border:none;padding-top:0;">' +
    '<div style="flex:1;"><div class="goal-title">' + fmtGoalDate.format(today) + '</div></div>' +
    '<div style="text-align:right;"><div class="goals-stat-val" style="font-size:1rem;">' + totalChecked + '/' + goals.length + '</div><div class="goals-stat-label">วันนี้</div></div>' +
    '</div>';

  if (goals.length) {
    html += '<div id="todayGoalList">';
    goals.forEach(function(g) {
      var done = !!goalLogs[g.id + '_' + todayStr];
      var streak = computeGoalStreak(g.id);
      html += '<div class="goal-item">';
      html += '<button class="goal-check' + (done ? ' done' : '') + '" data-goal-id="' + g.id + '" data-date="' + todayStr + '"></button>';
      html += '<div class="goal-info"><div class="goal-title' + (done ? ' done-text' : '') + '">' + escapeHtml(g.title) + '</div>';
      html += '<div class="goal-meta"><span class="goal-streak">🔥 ' + streak + ' วัน</span><span>' + (g.type === 'daily' ? 'รายวัน' : g.type === 'weekly' ? 'รายสัปดาห์' : 'ปกติ') + '</span></div></div>';
      html += '<div class="goal-actions">';
      html += '<button data-action="editGoal" data-id="' + g.id + '">✏️</button>';
      html += '<button data-action="deleteGoal" data-id="' + g.id + '">🗑️</button>';
      html += '</div></div>';
    });
    html += '</div>';
  } else {
    html += '<div class="goal-empty"><div class="big">🎯</div>ยังไม่มีเป้าหมาย — ตั้งเป้าหมายแรกของคุณ!</div>';
  }

  html += '<button class="modal-btn modal-confirm" id="addGoalBtn" style="width:100%;margin-top:16px;justify-content:center;">➕ เพิ่มเป้าหมาย</button>';

  showModal({
    title: 'เป้าหมายของฉัน', bodyHtml: html,
    onShow: function(close) {
      document.querySelectorAll('.goal-check').forEach(function(cb) {
        cb.addEventListener('click', function() {
          var goalId = cb.dataset.goalId;
          var date = cb.dataset.date;
          toggleGoal(goalId, date, cb, close);
        });
      });
      document.querySelectorAll('[data-action="editGoal"]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.dataset.id;
          close();
          editGoalPrompt(id);
        });
      });
      document.querySelectorAll('[data-action="deleteGoal"]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.dataset.id;
          close();
          deleteGoalPrompt(id);
        });
      });
      document.getElementById('addGoalBtn').addEventListener('click', function() {
        close();
        addGoalPrompt();
      });
    }
  });
}

function toggleGoal(goalId, date, cbEl, closeModalFn) {
  var key = goalId + '_' + date;
  var isDone = !!goalLogs[key];

  if (isDone) {
    delete goalLogs[key];
    supabase.from('goal_logs').delete().eq('goal_id', goalId).eq('date', date).eq('user_id', currentUser ? currentUser.id : '').then(function() {
      cbEl.classList.remove('done');
      var parent = cbEl.closest('.goal-item');
      if (parent) {
        var titleEl = parent.querySelector('.goal-title');
        if (titleEl) titleEl.classList.remove('done-text');
      }
      if (closeModalFn) closeModalFn();
      renderGoalsModal();
    });
  } else {
    var log = {
      id: 'gl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      goal_id: goalId,
      date: date,
      completed: true
    };
    goalLogs[key] = true;
    persistGoalLog(log).then(function(ok) {
      if (ok) {
        if (closeModalFn) closeModalFn();
        renderGoalsModal();
      } else {
        delete goalLogs[key];
      }
    });
  }
}

function computeGoalStreak(goalId) {
  var streak = 0;
  var d = new Date();
  if (!goalLogs[goalId + '_' + getDateStr(d)]) {
    d.setDate(d.getDate() - 1);
  }
  while (goalLogs[goalId + '_' + getDateStr(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getDateStr(d) {
  return dayKey(d.getTime());
}

function addGoalPrompt() {
  showModal({
    title: 'เพิ่มเป้าหมาย',
    bodyHtml:
      '<input type="text" id="newGoalTitle" placeholder="ชื่อเป้าหมาย" maxlength="100" style="margin-bottom:12px;">' +
      '<textarea id="newGoalDesc" placeholder="รายละเอียด (ไม่จำเป็น)" maxlength="500" style="margin-bottom:12px;min-height:60px;"></textarea>' +
      '<select id="newGoalType">' +
      '<option value="daily">รายวัน</option>' +
      '<option value="weekly">รายสัปดาห์</option>' +
      '<option value="custom">ปกติ (ไม่มีรอบ)</option>' +
      '</select>',
    confirmText: 'เพิ่ม', showCancel: true,
    onConfirm: function(close) {
      var title = document.getElementById('newGoalTitle').value.trim();
      if (!title) { showToast('ใส่ชื่อเป้าหมาย', 'info'); return; }
      var desc = document.getElementById('newGoalDesc').value.trim();
      var type = document.getElementById('newGoalType').value;
      var goal = {
        id: 'goal-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        title: title,
        description: desc,
        type: type,
        archived: false
      };
      goals.push(goal);
      persistGoal(goal).then(function(ok) {
        if (ok) { close(); renderGoalsModal(); showToast('เพิ่มเป้าหมายแล้ว', 'success'); }
        else { goals.pop(); }
      });
    }
  });
}

function editGoalPrompt(id) {
  var goal = null;
  for (var i = 0; i < goals.length; i++) { if (goals[i].id === id) { goal = goals[i]; break; } }
  if (!goal) return;
  showModal({
    title: 'แก้ไขเป้าหมาย',
    bodyHtml:
      '<input type="text" id="editGoalTitle" value="' + escapeHtml(goal.title) + '" maxlength="100" style="margin-bottom:12px;">' +
      '<textarea id="editGoalDesc" maxlength="500" style="margin-bottom:12px;min-height:60px;">' + escapeHtml(goal.description || '') + '</textarea>' +
      '<select id="editGoalType">' +
      '<option value="daily"' + (goal.type === 'daily' ? ' selected' : '') + '>รายวัน</option>' +
      '<option value="weekly"' + (goal.type === 'weekly' ? ' selected' : '') + '>รายสัปดาห์</option>' +
      '<option value="custom"' + (goal.type === 'custom' ? ' selected' : '') + '>ปกติ</option>' +
      '</select>',
    confirmText: 'บันทึก', showCancel: true,
    onConfirm: function(close) {
      var title = document.getElementById('editGoalTitle').value.trim();
      if (!title) { showToast('ใส่ชื่อเป้าหมาย', 'info'); return; }
      goal.title = title;
      goal.description = document.getElementById('editGoalDesc').value.trim();
      goal.type = document.getElementById('editGoalType').value;
      persistGoal(goal).then(function(ok) {
        if (ok) { close(); renderGoalsModal(); showToast('แก้ไขแล้ว', 'success'); }
      });
    }
  });
}

function deleteGoalPrompt(id) {
  var goal = null;
  for (var i = 0; i < goals.length; i++) { if (goals[i].id === id) { goal = goals[i]; break; } }
  if (!goal) return;
  showModal({
    title: 'ลบเป้าหมาย',
    bodyHtml: '<p>ลบเป้าหมาย <strong>' + escapeHtml(goal.title) + '</strong> ใช่ไหม?</p>',
    confirmText: 'ลบ', showCancel: true,
    onConfirm: function(close) {
      goals = goals.filter(function(g) { return g.id !== id; });
      deleteGoalFromDB(id).then(function(ok) {
        if (ok) { close(); showToast('ลบเป้าหมายแล้ว', 'success'); }
        else { goals.push(goal); }
      });
    }
  });
}

/* =========================================================
   Dashboard
   ========================================================= */
function openDashboard() {
  var total = entries.length;
  var streak = computeStreak();
  var totalWords = 0;
  entries.forEach(function(e) { if (e.text) totalWords += e.text.split(/\s+/).filter(Boolean).length; });

  var now = new Date();
  var thisMonth = now.getMonth();
  var thisYear = now.getFullYear();
  var entriesThisMonth = entries.filter(function(e) {
    var d = new Date(e.ts);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  var html = '';

  html += '<div class="dash-stats-grid">';
  html += '<div class="dash-stat-card"><div class="dash-stat-icon">📝</div><div class="dash-stat-val">' + total + '</div><div class="dash-stat-label">รายการทั้งหมด</div></div>';
  html += '<div class="dash-stat-card"><div class="dash-stat-icon">🔥</div><div class="dash-stat-val">' + streak + '</div><div class="dash-stat-label">วันติดต่อกัน</div></div>';
  html += '<div class="dash-stat-card"><div class="dash-stat-icon">📊</div><div class="dash-stat-val">' + entriesThisMonth + '</div><div class="dash-stat-label">เดือนนี้</div></div>';
  html += '<div class="dash-stat-card"><div class="dash-stat-icon">✍️</div><div class="dash-stat-val">' + totalWords + '</div><div class="dash-stat-label">คำทั้งหมด</div></div>';
  html += '</div>';

  /* Mood chart */
  html += '<div class="dash-section"><div class="dash-section-title">😊 อารมณ์</div>';
  var moodCounts = {};
  entries.forEach(function(e) { if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1; });
  var moodEntries = Object.entries(moodCounts).sort(function(a, b) { return b[1] - a[1]; });
  if (moodEntries.length) {
    var maxMood = moodEntries[0][1];
    html += '<div class="mood-chart">';
    moodEntries.forEach(function(m) {
      var pct = maxMood > 0 ? (m[1] / maxMood * 100) : 0;
      html += '<div class="mood-chart-row"><span class="mood-chart-emoji">' + escapeHtml(m[0]) + '</span><div class="mood-chart-bar-wrap"><div class="mood-chart-bar" style="width:' + pct + '%"></div></div><span class="mood-chart-count">' + m[1] + '</span></div>';
    });
    html += '</div>';
  } else {
    html += '<p style="color:var(--muted);font-size:.85rem;">ยังไม่มีข้อมูลอารมณ์</p>';
  }
  html += '</div>';

  /* Mood trend — last 14 days */
  html += '<div class="dash-section"><div class="dash-section-title">📈 อารมณ์ 14 วันล่าสุด</div>';
  var fmtShort = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' });
  var moodByDay = {};
  entries.forEach(function(e) {
    if (!e.mood) return;
    var dk = dayKey(e.ts);
    if (!moodByDay[dk]) moodByDay[dk] = [];
    moodByDay[dk].push(e.mood);
  });
  var trendDays = [];
  for (var td = 13; td >= 0; td--) {
    var dd = new Date(); dd.setDate(dd.getDate() - td);
    var dk2 = dd.getFullYear() + '-' + String(dd.getMonth()+1).padStart(2,'0') + '-' + String(dd.getDate()).padStart(2,'0');
    trendDays.push({ key: dk2, date: dd, moods: moodByDay[dk2] || [] });
  }
  var uniqueMoods = [];
  var moodSeen = {};
  entries.forEach(function(e) { if (e.mood && !moodSeen[e.mood]) { moodSeen[e.mood] = true; uniqueMoods.push(e.mood); } });
  if (uniqueMoods.length) {
    html += '<div class="mood-trend">';
    trendDays.forEach(function(d) {
      var emoji = d.moods.length ? d.moods[d.moods.length - 1] : '';
      html += '<div class="mood-trend-day">';
      html += '<div class="mood-trend-emoji">' + (emoji || '<span class="mood-trend-empty">·</span>') + '</div>';
      html += '<div class="mood-trend-date">' + fmtShort.format(d.date) + '</div>';
      if (d.moods.length > 1) html += '<div class="mood-trend-count">×' + d.moods.length + '</div>';
      html += '</div>';
    });
    html += '</div>';
  } else {
    html += '<p style="color:var(--muted);font-size:.85rem;">ยังไม่มีข้อมูลอารมณ์</p>';
  }
  html += '</div>';

  /* Tag chart */
  html += '<div class="dash-section"><div class="dash-section-title">🏷️ แท็กยอดนิยม</div>';
  var tagCounts = {};
  entries.forEach(function(e) { (e.tags || []).forEach(function(t) { if (t) tagCounts[t] = (tagCounts[t] || 0) + 1; }); });
  var tagEntries = Object.entries(tagCounts).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 10);
  if (tagEntries.length) {
    var maxTag = tagEntries[0][1];
    html += '<div class="tag-chart">';
    tagEntries.forEach(function(t) {
      var pct = maxTag > 0 ? (t[1] / maxTag * 100) : 0;
      html += '<div class="tag-chart-row"><span class="tag-chart-label">#' + escapeHtml(t[0]) + '</span><div class="tag-chart-bar-wrap"><div class="tag-chart-bar" style="width:' + pct + '%"></div></div><span class="tag-chart-count">' + t[1] + '</span></div>';
    });
    html += '</div>';
  } else {
    html += '<p style="color:var(--muted);font-size:.85rem;">ยังไม่มีแท็ก</p>';
  }
  html += '</div>';

  /* Activity heatmap */
  html += '<div class="dash-section"><div class="dash-section-title">📅 กิจกรรม 90 วันล่าสุด</div>';
  html += '<div class="heatmap-wrap">';
  var dayCounts = {};
  entries.forEach(function(e) { var k = dayKey(e.ts); dayCounts[k] = (dayCounts[k] || 0) + 1; });
  var maxDayCount = 1;
  Object.values(dayCounts).forEach(function(c) { if (c > maxDayCount) maxDayCount = c; });

  var heatmapStart = new Date();
  heatmapStart.setDate(heatmapStart.getDate() - 89);
  heatmapStart.setHours(0, 0, 0, 0);
  var startDow = heatmapStart.getDay();
  var heatmapHtml = '<div class="heatmap-col">';
  for (var i = 0; i < startDow; i++) heatmapHtml += '<div class="heatmap-cell" style="visibility:hidden;"></div>';

  var curHeat = new Date(heatmapStart);
  while (curHeat <= new Date()) {
    if (curHeat.getDay() === 0 && curHeat.getTime() !== heatmapStart.getTime()) {
      heatmapHtml += '</div><div class="heatmap-col">';
    }
    var hk = dayKey(curHeat.getTime());
    var hc = dayCounts[hk] || 0;
    var lvl = hc === 0 ? '' : hc <= maxDayCount * 0.25 ? 'l1' : hc <= maxDayCount * 0.5 ? 'l2' : hc <= maxDayCount * 0.75 ? 'l3' : 'l4';
    heatmapHtml += '<div class="heatmap-cell ' + lvl + '" title="' + hk + ': ' + hc + ' รายการ"></div>';
    curHeat.setDate(curHeat.getDate() + 1);
  }
  heatmapHtml += '</div>';
  html += heatmapHtml;
  html += '<div class="heatmap-legend"><span>น้อย</span><div class="heatmap-cell"></div><div class="heatmap-cell l1"></div><div class="heatmap-cell l2"></div><div class="heatmap-cell l3"></div><div class="heatmap-cell l4"></div><span>มาก</span></div>';
  html += '</div></div>';

  showModal({
    title: '📊 สถิติของคุณ', bodyHtml: html
  });
}

function computeStreak() {
  var daysSet = {};
  entries.forEach(function(e) { daysSet[dayKey(e.ts)] = true; });
  var streak = 0;
  var d = new Date();
  if (!daysSet[dayKey(d.getTime())]) d.setDate(d.getDate() - 1);
  while (daysSet[dayKey(d.getTime())]) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

/* =========================================================
   Focus Mode
   ========================================================= */
function openFocusMode() {
  focusActive = true;
  document.getElementById('focusOverlay').classList.remove('hidden');
  document.getElementById('focusText').value = '';
  document.getElementById('focusText').focus();
  createMoodPicker(document.getElementById('focusMoods'), null, function(m) { selectedMood = m; });
}

function closeFocusMode() {
  focusActive = false;
  document.getElementById('focusOverlay').classList.add('hidden');
}

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

/* =========================================================
   Lightbox
   ========================================================= */
var lightboxImages = [];
var lightboxIdx = 0;

function openLightbox(src, allSrcs) {
  lightboxImages = allSrcs || [src];
  lightboxIdx = lightboxImages.indexOf(src);
  if (lightboxIdx === -1) lightboxIdx = 0;
  var lb = document.getElementById('lightbox');
  updateLightbox();
  lb.hidden = false;
  requestAnimationFrame(function() { lb.classList.add('open'); });
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  var lb = document.getElementById('lightbox');
  lb.classList.remove('open');
  setTimeout(function() { lb.hidden = true; }, 200);
  document.body.style.overflow = '';
}

function updateLightbox() {
  document.getElementById('lightboxImg').src = lightboxImages[lightboxIdx];
  document.getElementById('lightboxCounter').textContent = (lightboxIdx + 1) + ' / ' + lightboxImages.length;
  document.getElementById('lightboxPrev').style.display = lightboxImages.length > 1 ? '' : 'none';
  document.getElementById('lightboxNext').style.display = lightboxImages.length > 1 ? '' : 'none';
}

function lightboxPrev() { lightboxIdx = (lightboxIdx - 1 + lightboxImages.length) % lightboxImages.length; updateLightbox(); }
function lightboxNext() { lightboxIdx = (lightboxIdx + 1) % lightboxImages.length; updateLightbox(); }

/* =========================================================
   Event Listeners (DOM ready — scripts at end of body)
   ========================================================= */
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

document.getElementById('saveBtn').addEventListener('click', saveEntry);
document.getElementById('themeToggleBtn').addEventListener('click', function() {
  themePickerVisible = !themePickerVisible;
  document.getElementById('themePicker').classList.toggle('hidden', !themePickerVisible);
  renderThemePicker();
});

document.getElementById('calendarBtn').addEventListener('click', function() {
  calendarVisible = !calendarVisible;
  render();
});

document.getElementById('calPrev').addEventListener('click', function() {
  calDate.setMonth(calDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById('calNext').addEventListener('click', function() {
  calDate.setMonth(calDate.getMonth() + 1);
  renderCalendar();
});
document.getElementById('calToday').addEventListener('click', function() {
  calDate = new Date();
  renderCalendar();
});

/* Filter chips */
document.querySelectorAll('.filter-chip').forEach(function(btn) {
  btn.addEventListener('click', function() {
    filterRange = btn.dataset.range;
    filterDay = null;
    document.querySelectorAll('.filter-chip').forEach(function(b) { b.classList.remove('on'); });
    btn.classList.add('on');
    render();
  });
});

/* Search */
document.getElementById('search').addEventListener('input', function() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { render(); }, 250);
});

/* Keyboard shortcut */
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (focusActive) {
      /* Save from focus mode */
    } else {
      saveEntry();
    }
  }
});

/* Click delegation for entries */
document.getElementById('list').addEventListener('click', function(e) {
  var delBtn = e.target.closest('.entry-del');
  if (delBtn) {
    var entry = delBtn.closest('.entry');
    if (entry) deleteEntry(entry.dataset.id);
    return;
  }
  var editBtn = e.target.closest('.entry-edit');
  if (editBtn) {
    var entry = editBtn.closest('.entry');
    if (entry) openEditModal(entry.dataset.id);
    return;
  }
  var tagEl = e.target.closest('.tag[data-tag]');
  if (tagEl) {
    activeTag = tagEl.dataset.tag;
    render();
    return;
  }
  var clearDay = e.target.closest('#clearDayFilter');
  if (clearDay) { filterDay = null; render(); return; }
  var clearFolder = e.target.closest('#clearFolderFilter');
  if (clearFolder) { activeFolderFilter = null; render(); return; }
  var clearTag = e.target.closest('#clearTagFilter');
  if (clearTag) { activeTag = null; render(); return; }
  var imgEl = e.target.closest('.entry-images img');
  if (imgEl) {
    var container = imgEl.closest('.entry-images');
    var allImgs = Array.from(container.querySelectorAll('img')).map(function(i) { return i.src; });
    openLightbox(imgEl.src, allImgs);
    return;
  }
});

/* Lightbox */
document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
document.getElementById('lightboxPrev').addEventListener('click', lightboxPrev);
document.getElementById('lightboxNext').addEventListener('click', lightboxNext);
document.getElementById('lightbox').addEventListener('click', function(e) {
  if (e.target === this) closeLightbox();
});
document.addEventListener('keydown', function(e) {
  if (document.getElementById('lightbox').hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lightboxPrev();
  if (e.key === 'ArrowRight') lightboxNext();
});

/* Folder select change */
document.getElementById('folderSelect').addEventListener('change', function() {
  selectedFolderId = this.value;
});

/* Focus mode */
document.getElementById('focusClose').addEventListener('click', closeFocusMode);
document.getElementById('focusSave').addEventListener('click', function() {
  var text = document.getElementById('focusText').value.trim();
  if (!text && !selectedMood) { showToast('กรุณาเขียนข้อความหรือเลือกอารมณ์', 'info'); return; }
  var entry = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    ts: Date.now(),
    text: text,
    mood: selectedMood,
    tags: [],
    folder_id: ''
  };
  entries.unshift(entry);
  persistEntry(entry).then(function(ok) {
    if (!ok) { entries.shift(); return; }
    closeFocusMode();
    render();
    showToast('บันทึกแล้ว', 'success');
  });
});

/* =========================================================
   Init
   ========================================================= */
(function() {
  /* Check for existing session (handles OAuth redirect hash) */
  supabase.auth.getSession().then(function(result) {
    if (result.data && result.data.session && result.data.session.user) {
      showApp(result.data.session.user);
    }
  });

  /* Restore saved range filter */
  var savedRange = localStorage.getItem(RANGE_KEY);
  if (savedRange && ['all', 'today', 'week', 'month'].indexOf(savedRange) !== -1) {
    filterRange = savedRange;
    document.querySelectorAll('.filter-chip').forEach(function(btn) {
      btn.classList.toggle('on', btn.dataset.range === filterRange);
    });
  }

  /* Apply saved theme */
  var savedTheme = localStorage.getItem(THEME_KEY);
  applyTheme(savedTheme || getDefaultTheme());
  updateDarkToggle();

  /* Save filter range when changed */
  var origRender = render;
  render = function() {
    localStorage.setItem(RANGE_KEY, filterRange);
    origRender();
  };
})();
