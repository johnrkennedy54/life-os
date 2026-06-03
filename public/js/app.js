// ─── State ───────────────────────────────────────────────────────────────────
const catColors = {work:'#5b8dff',health:'#4ecb8d',apt:'#f0a05a',fin:'#b78bfa',lab:'#f25f7a'};
const catNames  = {work:'Work',health:'Health',apt:'Apartment',fin:'Finances',lab:'Homelab'};
let currentKey  = '';
let previewOpen = false;

// ─── API helpers ──────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const data = await api('GET', '/auth/status');
    if (data.authenticated) {
      showApp(data.username);
    } else {
      // Check if any user exists; if not, show register option
      showLoginPage();
    }
  } catch {
    showLoginPage();
  }
}

function showLoginPage() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  // Show register section (it's harmless — server blocks a second registration)
  document.getElementById('register-section').style.display = 'block';
}

function showApp(username) {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display = 'grid';
  document.getElementById('sidebar-user').textContent = username;
  updateTime();
  renderHomeCategories();
  initNavDrag();
}

async function handleLogin() {
  const btn = document.getElementById('login-btn');
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  clearLoginError();
  if (!username || !password) { showLoginError('Please enter your username and password.'); return; }
  btn.textContent = 'Signing in…';
  btn.disabled = true;
  try {
    const data = await api('POST', '/auth/login', { username, password });
    showApp(data.username);
  } catch (err) {
    showLoginError(err.message);
    btn.textContent = 'Sign in';
    btn.disabled = false;
  }
}

async function handleRegister() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  clearLoginError();
  if (!username || !password) { showLoginError('Please choose a username and password.'); return; }
  if (password.length < 8) { showLoginError('Password must be at least 8 characters.'); return; }
  try {
    const data = await api('POST', '/auth/register', { username, password });
    showApp(data.username);
  } catch (err) {
    showLoginError(err.message);
  }
}

async function handleLogout() {
  try { await api('POST', '/auth/logout'); } catch {}
  location.reload();
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.style.display = 'block';
}
function clearLoginError() {
  const el = document.getElementById('login-error');
  el.style.display = 'none';
  el.textContent = '';
}

// Allow Enter key to submit login
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('login-page').style.display !== 'none') {
    handleLogin();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's' && currentKey) {
    e.preventDefault();
    saveContent();
  }
});

// ─── Clock ────────────────────────────────────────────────────────────────────
function updateTime() {
  const now = new Date();
  const ds = now.toLocaleDateString('en-US', {weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const ts = now.toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'});
  const md = document.getElementById('main-date');
  const tt = document.getElementById('topbar-time');
  const sd = document.getElementById('sidebar-date');
  if (md) md.textContent = ds;
  if (tt) tt.innerHTML = ts + '<br>' + now.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  if (sd) sd.textContent = ds;
}
setInterval(updateTime, 30000);

// ─── Navigation ───────────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.getElementById('nav-home-btn').classList.toggle('active', id === 'home');
  if (id === 'home') {
    document.querySelectorAll('.nav-sub').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-category').forEach(c => c.classList.remove('active'));
  }
}

function toggleNav(el, navId) {
  const isOpen = el.classList.contains('open');
  document.querySelectorAll('.nav-category').forEach(c => { c.classList.remove('open','active'); });
  document.querySelectorAll('.nav-subcats').forEach(s => s.classList.remove('open'));
  if (!isOpen) {
    el.classList.add('open','active');
    document.getElementById(navId).classList.add('open');
  }
  document.getElementById('nav-home-btn').classList.remove('active');
}

async function showSubpage(cat, sub, title, desc) {
  currentKey = cat + '_' + sub;
  const color = catColors[cat];

  document.getElementById('sub-dot').style.background = color;
  document.getElementById('sub-cat').textContent = catNames[cat];
  document.getElementById('sub-cat').style.color = color;
  document.getElementById('sub-title').textContent = title;
  document.getElementById('sub-desc').textContent = desc;
  document.getElementById('sub-divider').style.cssText = `background:linear-gradient(90deg,${color} 0%,transparent 50%);height:1px;opacity:0.2;margin-bottom:24px;`;
  document.getElementById('editor-lang').style.cssText = `color:${color};background:${color}18;`;
  document.querySelector('.tbtn.primary').style.cssText = `border-color:${color};color:${color};`;
  document.getElementById('editor-textarea').style.caretColor = color;
  document.getElementById('editor-textarea').value = '';
  updateCharCount();
  setSaveIndicator('unsaved', false);

  if (previewOpen) { previewOpen = false; document.getElementById('preview-shell').classList.remove('open'); }

  // Sync sidebar nav
  document.querySelectorAll('.nav-sub').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-subcats .nav-sub').forEach(s => {
    if (s.getAttribute('onclick')?.includes(`'${cat}','${sub}'`)) s.classList.add('active');
  });
  const catEl = document.getElementById('navc-' + cat);
  if (catEl) {
    document.querySelectorAll('.nav-category').forEach(c => { c.classList.remove('active','open'); });
    document.querySelectorAll('.nav-subcats').forEach(sc => sc.classList.remove('open'));
    catEl.classList.add('active','open');
    document.getElementById('nav-' + cat).classList.add('open');
  }
  document.getElementById('nav-home-btn').classList.remove('active');
  showPage('sub');
  await loadEntries();
}

// ─── Editor ───────────────────────────────────────────────────────────────────
function onEdit() {
  updateCharCount();
  setSaveIndicator('unsaved', false);
  if (previewOpen) renderPreview();
}

function updateCharCount() {
  const len = document.getElementById('editor-textarea').value.length;
  document.getElementById('char-count').textContent = len.toLocaleString() + ' character' + (len !== 1 ? 's' : '');
}

function setSaveIndicator(text, ok, err) {
  const el = document.getElementById('save-indicator');
  el.textContent = text;
  el.className = 'save-indicator' + (ok ? ' saved' : err ? ' error' : '');
}

async function saveContent() {
  const content = document.getElementById('editor-textarea').value.trim();
  if (!content) { alert('Nothing to save — editor is empty.'); return; }
  setSaveIndicator('Saving…', false);
  try {
    await api('POST', `/entries/${currentKey}`, { content });
    document.getElementById('editor-textarea').value = '';
    updateCharCount();
    setSaveIndicator('Entry saved', true);
    setTimeout(() => setSaveIndicator('unsaved', false), 2500);
    await loadEntries();
    if (previewOpen) renderPreview();
  } catch (err) {
    setSaveIndicator('Save failed — ' + err.message, false, true);
  }
}

function clearEditor() {
  if (!document.getElementById('editor-textarea').value.trim()) return;
  if (!confirm('Discard current editor content?')) return;
  document.getElementById('editor-textarea').value = '';
  updateCharCount();
  setSaveIndicator('unsaved', false);
  if (previewOpen) renderPreview();
}

function togglePreview() {
  const shell = document.getElementById('preview-shell');
  previewOpen = !previewOpen;
  shell.classList.toggle('open', previewOpen);
  if (previewOpen) renderPreview();
}

function renderPreview() {
  const html = document.getElementById('editor-textarea').value;
  const frame = document.getElementById('preview-frame');
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write('<style>body{font-family:sans-serif;padding:16px;margin:0;font-size:14px;line-height:1.6;}</style>' + html);
  doc.close();
}

// ─── Entries feed ─────────────────────────────────────────────────────────────
async function loadEntries() {
  const list = document.getElementById('entries-list');
  const count = document.getElementById('entries-count');
  list.innerHTML = '<div class="entries-loading">Loading…</div>';
  try {
    const data = await api('GET', `/entries/${currentKey}`);
    const entries = data.entries || [];
    count.textContent = entries.length + ' entr' + (entries.length === 1 ? 'y' : 'ies');
    if (entries.length === 0) {
      list.innerHTML = '<div class="entries-empty">No entries yet — write something above and hit Save.</div>';
      return;
    }
    list.innerHTML = entries.map((e, i) => {
      const isHtml = /<[a-z][\s\S]*>/i.test(e.content);
      const num = entries.length - i;
      return `<div class="entry-card" id="ecard-${e.id}">
        <div class="entry-meta">
          <div class="entry-meta-left">
            <span class="entry-num">#${num}</span>
            <span class="entry-ts">${formatTs(e.created_at)}</span>
          </div>
          <div class="entry-meta-right">
            ${isHtml ? `<button class="entry-action" onclick="toggleRendered(${e.id}, \`${escAttr(e.content)}\`)">Render</button>` : ''}
            <button class="entry-action" onclick="editEntry(\`${escAttr(e.content)}\`)">Edit</button>
            <button class="entry-action danger" onclick="deleteEntry(${e.id})">Delete</button>
          </div>
        </div>
        <pre class="entry-body-raw" id="eraw-${e.id}">${escHtml(e.content)}</pre>
        ${isHtml ? `<iframe class="entry-rendered-frame" id="eframe-${e.id}" style="display:none;"></iframe>` : ''}
      </div>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<div class="entries-empty">Failed to load entries — ${err.message}</div>`;
  }
}

async function deleteEntry(id) {
  if (!confirm('Delete this entry? This cannot be undone.')) return;
  try {
    await api('DELETE', `/entries/${currentKey}/${id}`);
    await loadEntries();
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}

function editEntry(content) {
  const ta = document.getElementById('editor-textarea');
  ta.value = content;
  updateCharCount();
  setSaveIndicator('Copied to editor — save to create a new entry', false);
  ta.focus();
  ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function toggleRendered(id, content) {
  const raw = document.getElementById('eraw-' + id);
  const frame = document.getElementById('eframe-' + id);
  const btn = document.querySelector(`#ecard-${id} .entry-action`);
  if (!frame) return;
  const showing = frame.style.display !== 'none';
  raw.style.display = showing ? 'block' : 'none';
  frame.style.display = showing ? 'none' : 'block';
  if (btn) btn.textContent = showing ? 'Render' : 'Source';
  if (!showing) {
    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write('<style>body{font-family:sans-serif;padding:14px 16px;margin:0;font-size:13px;line-height:1.65;}</style>' + content);
    doc.close();
    frame.style.height = (doc.body.scrollHeight + 32) + 'px';
  }
}

// ─── Home categories ──────────────────────────────────────────────────────────
function renderHomeCategories() {
  const categories = [
    { key:'work', name:'Work', count:4, icon:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 12h20"/>',
      subs:[['dayday','Day to day','Tasks · Meetings · Notes'],['certs','Certifications','Progress · Goals · Deadlines'],['school','Schooling','Courses · Credits · Schedule'],['adv','Advancement plan','Goals · Milestones · Timeline']] },
    { key:'health', name:'Health', count:6, icon:'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
      subs:[['habits','Habit tracking','Streaks · Daily checks'],['exercise','Exercise schedule','Workouts · Rest days'],['appts','Appointments','Upcoming · History'],['meal','Meal prepping','Recipes · Grocery · Macros'],['style','Style','Wardrobe · Outfits · Goals'],['adv','Advancement plan','Goals · Benchmarks · Vision']] },
    { key:'apt', name:'Apartment', count:5, icon:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      subs:[['layout','Layout blueprint','Floor plan · Dimensions'],['manifest','Item manifest','Inventory · What you own'],['needed','Items needed','Must-haves · Priority list'],['wanted','Items wanted','Wish list · Future buys'],['adv','Advancement plan','Upgrades · Timeline · Vision']] },
    { key:'fin', name:'Finances', count:4, icon:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
      subs:[['overview','Overview','Net worth · Accounts · Summary'],['budget','Monthly budget','Income · Expenses · Savings'],['credit','Credit repair','Score · Disputes · Progress'],['adv','Advancement plan','Savings goals · Investments']] },
    { key:'lab', name:'Homelab', count:3, icon:'<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
      subs:[['dayday','Day to day','Tasks · Logs · Uptime'],['week','Week to week','Projects · Maintenance · Plans'],['catch','Catch all','Notes · Ideas · Scratch']] },
  ];

  const container = document.getElementById('home-categories');
  container.innerHTML = categories.map(cat => {
    const color = catColors[cat.key];
    const bgVar = `var(--${cat.key}-bg)`;
    return `<div class="cat-section" style="--cat-color:${color};--cat-bg:${bgVar}">
      <div class="cat-header">
        <div class="cat-badge"><svg viewBox="0 0 24 24">${cat.icon}</svg></div>
        <span class="cat-name">${cat.name}</span>
        <span class="cat-count">${cat.count} modules</span>
      </div>
      <div class="cat-divider"></div>
      <div class="subcats-grid">
        ${cat.subs.map(([sub, title, hint]) => `
          <div class="subcat-card" style="--cat-color:${color};--cat-bg:${bgVar}" onclick="showSubpage('${cat.key}','${sub}','${title}','${hint}')">
            <div class="subcat-card-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/></svg></div>
            <div class="subcat-card-name">${title}</div>
            <div class="subcat-card-hint">${hint}</div>
            <div class="subcat-card-arrow">↗</div>
          </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function formatTs(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + ' · ' + d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
}
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escAttr(str) {
  return String(str).replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$/g,'\\$');
}

// ─── Nav drag-to-reorder ──────────────────────────────────────────────────────
function initNavDrag() {
  const nav = document.querySelector('nav');
  const getSections = () => [...nav.querySelectorAll('.nav-section')];

  // Restore saved order
  try {
    const saved = localStorage.getItem('lifeos-nav-order');
    if (saved) {
      JSON.parse(saved).forEach(key => {
        const section = nav.querySelector(`#navc-${key}`)?.closest('.nav-section');
        if (section) nav.appendChild(section);
      });
    }
  } catch {}

  let dragging = null;
  let fromHandle = false;

  document.addEventListener('mouseup', () => {
    fromHandle = false;
    getSections().forEach(s => { s.draggable = false; });
  });

  getSections().forEach(section => {
    const handle = section.querySelector('.drag-handle');
    if (!handle) return;

    handle.addEventListener('mousedown', () => {
      fromHandle = true;
      section.draggable = true;
    });

    section.addEventListener('dragstart', e => {
      if (!fromHandle) { e.preventDefault(); return; }
      dragging = section;
      e.dataTransfer.effectAllowed = 'move';
      requestAnimationFrame(() => section.classList.add('dragging'));
    });

    section.addEventListener('dragend', () => {
      section.draggable = false;
      section.classList.remove('dragging');
      getSections().forEach(s => s.classList.remove('drag-over'));
      fromHandle = false;
      dragging = null;
      const order = getSections().map(s => s.querySelector('.nav-category')?.id?.replace('navc-', '')).filter(Boolean);
      localStorage.setItem('lifeos-nav-order', JSON.stringify(order));
    });

    section.addEventListener('dragover', e => {
      e.preventDefault();
      if (!dragging || dragging === section) return;
      getSections().forEach(s => s.classList.remove('drag-over'));
      section.classList.add('drag-over');
    });

    section.addEventListener('dragleave', e => {
      if (!section.contains(e.relatedTarget)) section.classList.remove('drag-over');
    });

    section.addEventListener('drop', e => {
      e.preventDefault();
      if (!dragging || dragging === section) return;
      const all = getSections();
      const fromIdx = all.indexOf(dragging);
      const toIdx = all.indexOf(section);
      nav.insertBefore(dragging, fromIdx < toIdx ? section.nextSibling : section);
      section.classList.remove('drag-over');
    });
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
