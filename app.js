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
  { name: 'light',  label: 'สว่าง',   color: '#faf8f5', dot: '#4a5a6a' },
  { name: 'dark',   label: 'มืด',     color: '#1a1816', dot: '#8a9aaa' },
  { name: 'sepia',  label: 'ซีเปีย',  color: '#f9f5ec', dot: '#6a5a4a' },
  { name: 'forest', label: 'ป่าไม้',   color: '#f4f6f2', dot: '#4a7a4a' },
  { name: 'ocean',  label: 'มหาสมุทร', color: '#f2f5f8', dot: '#4a6a88' }
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
  document.getElementById('userEmail').textContent = user.email;
  loadEntries().then(function() { render(); });
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

/* --- Logout --- */
document.getElementById('logoutBtn').addEventListener('click', function() {
  supabase.auth.signOut();
});

/* --- Auth state listener --- */
supabase.auth.onAuthStateChange(function(event, session) {
  if (session && session.user) { showApp(session.user); }
  else { currentUser = null; entries = []; showAuth(); }
});

/* =========================================================
   Load / Persist (Supabase)
   ========================================================= */
async function loadEntries() {
  if (!currentUser) return;
  var res = await supabase.from('entries').select('*').eq('user_id', currentUser.id).order('ts', { ascending: false });
  if (res.error) { showToast('โหลดข้อมูลไม่สำเร็จ', 'error'); return; }
  entries = res.data || [];
}

async function persistEntry(entry) {
  if (!currentUser) return false;
  entry.user_id = currentUser.id;
  var res = await supabase.from('entries').upsert(entry, { onConflict: 'id' });
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
  /* Upsert all entries for current user — used after import */
  var toUpsert = entries.map(function(e) { e.user_id = currentUser.id; return e; });
  var res = await supabase.from('entries').upsert(toUpsert, { onConflict: 'id' });
  if (res.error) { showToast('บันทึกไม่สำเร็จ — ' + res.error.message, 'error'); return false; }
  return true;
}

/* =========================================================
   Theme
   ========================================================= */
function applyTheme(name) {
  document.documentElement.dataset.theme = name;
  localStorage.setItem(THEME_KEY, name);
  var btn = document.getElementById('darkToggle');
  btn.textContent = name === 'dark' ? 'สว่าง' : 'มืด';
  document.querySelectorAll('.theme-dot').forEach(function(d) {
    d.classList.toggle('active', d.dataset.theme === name);
  });
  if (calendarVisible) renderCalendar();
}

function getDefaultTheme() {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function toggleDark() {
  var cur = document.documentElement.dataset.theme;
  applyTheme(cur === 'dark' ? 'light' : 'dark');
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

/* =========================================================
   Entry CRUD
   ========================================================= */
function saveEntry() {
  var textEl = document.getElementById('text');
  var tagsEl = document.getElementById('tags');
  var text = textEl.value.trim();
  if (!text && !selectedMood) { showToast('กรุณาเขียนข้อความหรือเลือกอารมณ์', 'info'); return; }
  var entry = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    ts: Date.now(),
    text: text,
    mood: selectedMood,
    tags: tagsEl.value.split(',').map(function(t) { return t.trim(); }).filter(Boolean)
  };
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
    bodyHtml: '<p>ลบบันทึกนี้ใช่ไหม?</p><div style="margin:10px 0;padding:10px;background:var(--accent-soft);font-size:.85rem;">' + escapeHtml((entry.text || '').slice(0, 200)) + '</div>',
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
      '<div class="moods" id="editMoods" style="margin-top:10px;"></div>' +
      '<input type="text" id="editTags" value="' + escapedTags + '" maxlength="500" placeholder="แท็ก คั่นด้วยจุลภาค" style="margin-top:10px;">',
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
      list.innerHTML += '<div class="empty"><div class="big">🌱</div>ยังไม่มีบันทึกตรงเงื่อนไข</div>';
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
      if ((e.tags || []).length) {
        html += '<div class="entry-tags">';
        for (var t = 0; t < e.tags.length; t++) {
          html += '<span class="tag" data-tag="' + escapeHtml(e.tags[t]) + '">#' + escapeHtml(e.tags[t]) + '</span>';
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
  var totalEl = document.getElementById('statsLine');
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
  var moodText = top ? top[0] : '—';
  totalEl.textContent = total + ' รายการ · ' + streak + ' วันติด · ' + moodText;
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

  var dowNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
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
      more.textContent = 'อีก ' + (dayEntries.length - maxPills) + ' รายการ';
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
      '<div class="export-option" data-format="json"><div class="ex-label">JSON</div><div class="ex-desc">ข้อมูลดิบ — นำเข้าคืนได้</div></div>' +
      '<div class="export-option" data-format="csv"><div class="ex-label">CSV</div><div class="ex-desc">ตาราง — เปิดใน Excel / Sheets</div></div>' +
      '<div class="export-option" data-format="html"><div class="ex-label">HTML</div><div class="ex-desc">หน้าเว็บแบบสแตนด์อโลน</div></div>' +
      '<div class="export-option" data-format="pdf"><div class="ex-label">PDF / พิมพ์</div><div class="ex-desc">เปิดหน้าพิมพ์ (Ctrl+P)</div></div>',
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
function importEntries() { document.getElementById('importFile').click(); }

document.getElementById('importFile').addEventListener('change', function(e) {
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
   Event Listeners
   ========================================================= */
document.getElementById('saveBtn').addEventListener('click', saveEntry);
document.getElementById('text').addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') saveEntry();
});

document.getElementById('search').addEventListener('input', function() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { render(); }, 250);
});

document.querySelectorAll('.chip[data-range]').forEach(function(c) {
  c.addEventListener('click', function() {
    filterRange = c.dataset.range;
    filterDay = null;
    localStorage.setItem(RANGE_KEY, filterRange);
    document.querySelectorAll('.chip[data-range]').forEach(function(x) { x.classList.toggle('on', x === c); });
    render();
  });
});
filterRange = localStorage.getItem(RANGE_KEY) || 'all';
var validRanges = ['all', 'today', 'week', 'month'];
if (validRanges.indexOf(filterRange) === -1) filterRange = 'all';
var activeChip = document.querySelector('.chip[data-range="' + filterRange + '"]');
if (activeChip) activeChip.classList.add('on');

document.getElementById('list').addEventListener('click', function(e) {
  var entryEl = e.target.closest('.entry');
  if (entryEl) {
    var id = entryEl.dataset.id;
    if (e.target.closest('.entry-del')) { deleteEntry(id); return; }
    if (e.target.closest('.entry-edit')) { openEditModal(id); return; }
    if (e.target.closest('.tag') && !e.target.closest('.filter-bar')) {
      activeTag = e.target.closest('.tag').dataset.tag;
      render();
      return;
    }
  }
  if (e.target.id === 'clearDayFilter') { filterDay = null; render(); }
  if (e.target.id === 'clearTagFilter') { activeTag = null; render(); }
});

document.getElementById('darkToggle').addEventListener('click', toggleDark);

document.getElementById('themePickerBtn').addEventListener('click', function() {
  themePickerVisible = !themePickerVisible;
  document.getElementById('themePicker').classList.toggle('hidden', !themePickerVisible);
});

var themePickerEl = document.getElementById('themePicker');
THEMES.forEach(function(t) {
  var dot = document.createElement('button');
  dot.className = 'theme-dot';
  dot.dataset.theme = t.name;
  dot.setAttribute('aria-label', t.label);
  dot.innerHTML = '<span class="dot-marker">○</span>' + t.label;
  dot.addEventListener('click', function() {
    applyTheme(t.name);
    themePickerVisible = false;
    document.getElementById('themePicker').classList.add('hidden');
  });
  themePickerEl.appendChild(dot);
});

document.getElementById('calendarBtn').addEventListener('click', function() {
  calendarVisible = !calendarVisible;
  render();
});

document.getElementById('calPrev').addEventListener('click', function() {
  calDate = new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1);
  renderCalendar();
});
document.getElementById('calNext').addEventListener('click', function() {
  calDate = new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1);
  renderCalendar();
});
document.getElementById('calToday').addEventListener('click', function() {
  calDate = new Date();
  renderCalendar();
});

document.getElementById('exportBtn').addEventListener('click', openExportModal);
document.getElementById('importBtn').addEventListener('click', importEntries);
document.getElementById('tagMgrBtn').addEventListener('click', openTagManager);

document.getElementById('fabBtn').addEventListener('click', function() {
  var composer = document.getElementById('composer');
  composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(function() { document.getElementById('text').focus(); }, 350);
});

/* =========================================================
   Init — theme only, auth handled by onAuthStateChange
   ========================================================= */
var savedTheme = localStorage.getItem(THEME_KEY);
applyTheme(savedTheme || getDefaultTheme());
