// ─── State ───────────────────────────────────────────────────────────────────
let currentKey  = '';
let previewOpen = false;

// ─── Categories ───────────────────────────────────────────────────────────────
const BUILTIN_CATEGORIES = [
  { key:'work',   name:'Work',      color:'#5b8dff',
    icon:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 12h20"/>',
    subs:[{key:'dayday',name:'Day to day',desc:'Tasks · Meetings · Notes'},{key:'certs',name:'Certifications',desc:'Progress · Goals · Deadlines'},{key:'school',name:'Schooling',desc:'Courses · Credits · Schedule'},{key:'adv',name:'Advancement plan',desc:'Goals · Milestones · Timeline'}]},
  { key:'health', name:'Health',    color:'#4ecb8d',
    icon:'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    subs:[{key:'habits',name:'Habit tracking',desc:'Streaks · Daily checks'},{key:'exercise',name:'Exercise schedule',desc:'Workouts · Rest days'},{key:'appts',name:'Appointments',desc:'Upcoming · History'},{key:'meal',name:'Meal prepping',desc:'Recipes · Grocery · Macros'},{key:'style',name:'Style',desc:'Wardrobe · Outfits · Goals'},{key:'adv',name:'Advancement plan',desc:'Goals · Benchmarks · Vision'}]},
  { key:'apt',    name:'Apartment', color:'#f0a05a',
    icon:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    subs:[{key:'layout',name:'Layout blueprint',desc:'Floor plan · Dimensions'},{key:'manifest',name:'Item manifest',desc:'Inventory · What you own'},{key:'needed',name:'Items needed',desc:'Must-haves · Priority list'},{key:'wanted',name:'Items wanted',desc:'Wish list · Future buys'},{key:'adv',name:'Advancement plan',desc:'Upgrades · Timeline · Vision'}]},
  { key:'fin',    name:'Finances',  color:'#b78bfa',
    icon:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    subs:[{key:'overview',name:'Overview',desc:'Net worth · Accounts · Summary'},{key:'budget',name:'Monthly budget',desc:'Income · Expenses · Savings'},{key:'credit',name:'Credit repair',desc:'Score · Disputes · Progress'},{key:'adv',name:'Advancement plan',desc:'Savings goals · Investments'}]},
  { key:'lab',    name:'Homelab',   color:'#f25f7a',
    icon:'<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
    subs:[{key:'dayday',name:'Day to day',desc:'Tasks · Logs · Uptime'},{key:'week',name:'Week to week',desc:'Projects · Maintenance · Plans'},{key:'catch',name:'Catch all',desc:'Notes · Ideas · Scratch'}]},
];

const DEFAULT_ICON = '<circle cx="12" cy="5" r="2"/><path d="M12 7v10"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><line x1="12" y1="17" x2="7" y2="17"/><line x1="12" y1="17" x2="17" y2="17"/>';

function getCustomCategories() {
  try { return JSON.parse(localStorage.getItem('lifeos-custom-cats') || '[]'); } catch { return []; }
}
function saveCustomCategories(cats) { localStorage.setItem('lifeos-custom-cats', JSON.stringify(cats)); }
function getAllCategories() { return [...BUILTIN_CATEGORIES, ...getCustomCategories()]; }
function getCatMeta(key) {
  const c = getAllCategories().find(c => c.key === key);
  return c ? { name: c.name, color: c.color } : { name: key, color: '#888' };
}
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
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
    if (data.authenticated) { showApp(data.username); } else { showLoginPage(); }
  } catch { showLoginPage(); }
}

function showLoginPage() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('register-section').style.display = 'block';
}

function showApp(username) {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display = 'grid';
  document.getElementById('sidebar-user').textContent = username;
  updateTime();
  renderNav();
  renderOverviewBar();
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
  } catch (err) { showLoginError(err.message); }
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

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('login-page').style.display !== 'none') handleLogin();
  if ((e.ctrlKey || e.metaKey) && e.key === 's' && currentKey) { e.preventDefault(); saveContent(); }
  if (e.key === 'Escape') closeCatModal();
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
  document.getElementById('mo-tab-btn')?.classList.toggle('active', id === 'module-overview');
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
  if (cat === 'fin' && sub === 'overview') { showFinOverview(); return; }
  currentKey  = cat + '_' + sub;
  previewOpen = false;
  const { name: catName, color } = getCatMeta(cat);

  document.getElementById('sub-dot').style.background = color;
  document.getElementById('sub-cat').textContent      = catName;
  document.getElementById('sub-cat').style.color      = color;
  document.getElementById('sub-title').textContent    = title;
  document.getElementById('sub-desc').textContent     = desc;
  document.getElementById('sub-divider').style.cssText =
    `background:linear-gradient(90deg,${color} 0%,transparent 50%);height:1px;opacity:0.2;margin-bottom:24px;`;

  document.querySelectorAll('.nav-sub').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-sub[data-sub]').forEach(s => {
    if (s.dataset.cat === cat && s.dataset.sub === sub) s.classList.add('active');
  });
  const catEl = document.getElementById('navc-' + cat);
  if (catEl) {
    document.querySelectorAll('.nav-category').forEach(c => c.classList.remove('active','open'));
    document.querySelectorAll('.nav-subcats').forEach(sc => sc.classList.remove('open'));
    catEl.classList.add('active','open');
    document.getElementById('nav-' + cat).classList.add('open');
  }
  document.getElementById('nav-home-btn').classList.remove('active');

  _subpageColor = color;
  showPage('sub');
  renderSubpageModules(currentKey, color);
}

// ─── Sidebar nav render ───────────────────────────────────────────────────────
function renderNav() {
  const container = document.getElementById('nav-sections');
  const allCats   = getAllCategories();
  let order;
  try { order = JSON.parse(localStorage.getItem('lifeos-nav-order') || '[]'); } catch { order = []; }
  const orderedKeys = [
    ...order.filter(k => allCats.find(c => c.key === k)),
    ...allCats.map(c => c.key).filter(k => !order.includes(k)),
  ];

  container.innerHTML = orderedKeys.map(key => {
    const cat = allCats.find(c => c.key === key);
    if (!cat) return '';
    const editBtn = cat.custom
      ? `<span class="nav-cat-edit" title="Edit category" data-cat="${cat.key}" onmousedown="event.stopPropagation()" onclick="event.stopPropagation();openCatModal(this.dataset.cat)">✎</span>`
      : '';
    const addSubRow = cat.custom
      ? `<div class="nav-sub nav-sub-add" data-cat="${cat.key}" onclick="openCatModal(this.dataset.cat)">+ Add subcategory</div>`
      : '';
    const subs = cat.subs.map(sub =>
      `<div class="nav-sub" style="--cat-color:${cat.color}"
            data-cat="${cat.key}" data-sub="${sub.key}"
            data-title="${escHtml(sub.name)}" data-hint="${escHtml(sub.desc)}"
            onclick="showSubpage(this.dataset.cat,this.dataset.sub,this.dataset.title,this.dataset.hint)">
        ${escHtml(sub.name)}
      </div>`
    ).join('');

    return `<div class="nav-section">
      <div class="nav-category" style="--cat-color:${cat.color}" id="navc-${cat.key}" onclick="toggleNav(this,'nav-${cat.key}')">
        <span class="drag-handle" onclick="event.stopPropagation()"><svg viewBox="0 0 8 14" width="8" height="14" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/></svg></span>
        <span class="cat-dot" style="background:${cat.color}"></span>
        <span class="nav-cat-label">${escHtml(cat.name)}</span>
        ${editBtn}
        <span class="nav-chevron">▾</span>
      </div>
      <div class="nav-subcats" id="nav-${cat.key}">${subs}${addSubRow}</div>
    </div>`;
  }).join('');
}

// ─── Overview bar ─────────────────────────────────────────────────────────────
function renderOverviewBar() {
  const bar = document.getElementById('overview-bar');
  bar.innerHTML = getAllCategories().map(cat =>
    `<div class="stat-card" style="--cat-color:${cat.color}">
      <div class="stat-count">${cat.subs.length}</div>
      <div class="stat-label">${escHtml(cat.name)} modules</div>
    </div>`
  ).join('');
}

// ─── Home categories ──────────────────────────────────────────────────────────
function renderHomeCategories() {
  const container = document.getElementById('home-categories');
  container.innerHTML = getAllCategories().map(cat => {
    const color = cat.color;
    const bg    = hexToRgba(color, 0.08);
    const icon  = cat.icon || DEFAULT_ICON;
    const subs  = cat.subs.map(s =>
      `<div class="subcat-card" style="--cat-color:${color};--cat-bg:${bg}"
            data-cat="${cat.key}" data-sub="${s.key}"
            data-title="${escHtml(s.name)}" data-hint="${escHtml(s.desc)}"
            onclick="showSubpage(this.dataset.cat,this.dataset.sub,this.dataset.title,this.dataset.hint)">
        <div class="subcat-card-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/></svg></div>
        <div class="subcat-card-name">${escHtml(s.name)}</div>
        <div class="subcat-card-hint">${escHtml(s.desc)}</div>
        <div class="subcat-card-arrow">↗</div>
      </div>`
    ).join('');

    return `<div class="cat-section" style="--cat-color:${color};--cat-bg:${bg}">
      <div class="cat-header">
        <div class="cat-badge"><svg viewBox="0 0 24 24">${icon}</svg></div>
        <span class="cat-name">${escHtml(cat.name)}</span>
        <span class="cat-count">${cat.subs.length} modules</span>
      </div>
      <div class="cat-divider"></div>
      <div class="subcats-grid">${subs}</div>
    </div>`;
  }).join('');
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
  const html  = document.getElementById('editor-textarea').value;
  const frame = document.getElementById('preview-frame');
  const doc   = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write('<style>body{font-family:sans-serif;padding:16px;margin:0;font-size:14px;line-height:1.6;}</style>' + html);
  doc.close();
}

// ─── Entries feed ─────────────────────────────────────────────────────────────
async function loadEntries() {
  const list  = document.getElementById('entries-list');
  const count = document.getElementById('entries-count');
  list.innerHTML = '<div class="entries-loading">Loading…</div>';
  try {
    const data    = await api('GET', `/entries/${currentKey}`);
    const entries = data.entries || [];
    count.textContent = entries.length + ' entr' + (entries.length === 1 ? 'y' : 'ies');
    if (entries.length === 0) {
      list.innerHTML = '<div class="entries-empty">No entries yet — write something above and hit Save.</div>';
      return;
    }
    list.innerHTML = entries.map((e, i) => {
      const isHtml = /<[a-z][\s\S]*>/i.test(e.content);
      const num    = entries.length - i;
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
  } catch (err) { alert('Failed to delete: ' + err.message); }
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
  const raw    = document.getElementById('eraw-' + id);
  const frame  = document.getElementById('eframe-' + id);
  const btn    = document.querySelector(`#ecard-${id} .entry-action`);
  if (!frame) return;
  const showing = frame.style.display !== 'none';
  raw.style.display   = showing ? 'block' : 'none';
  frame.style.display = showing ? 'none'  : 'block';
  if (btn) btn.textContent = showing ? 'Render' : 'Source';
  if (!showing) {
    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write('<style>body{font-family:sans-serif;padding:14px 16px;margin:0;font-size:13px;line-height:1.65;}</style>' + content);
    doc.close();
    frame.style.height = (doc.body.scrollHeight + 32) + 'px';
  }
}

// ─── Category modal ───────────────────────────────────────────────────────────
let _editingCatKey = null;
let _subRowCounter = 0;

function openCatModal(catKey) {
  _editingCatKey = catKey || null;
  document.getElementById('modal-subs-list').innerHTML = '';
  _subRowCounter = 0;

  if (catKey) {
    const cat = getCustomCategories().find(c => c.key === catKey);
    if (!cat) return;
    document.getElementById('cat-name-input').value    = cat.name;
    document.getElementById('cat-color-input').value   = cat.color;
    document.getElementById('modal-title-text').textContent = 'Edit Category';
    document.getElementById('modal-save-btn').textContent   = 'Save changes';
    document.getElementById('modal-delete-btn').style.display = 'flex';
    cat.subs.forEach(s => addSubRow(s.name, s.desc));
  } else {
    document.getElementById('cat-name-input').value    = '';
    document.getElementById('cat-color-input').value   = '#6c8ef7';
    document.getElementById('modal-title-text').textContent = 'New Category';
    document.getElementById('modal-save-btn').textContent   = 'Create';
    document.getElementById('modal-delete-btn').style.display = 'none';
  }

  document.getElementById('cat-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('cat-name-input').focus(), 50);
}

function closeCatModal() {
  document.getElementById('cat-modal').style.display = 'none';
}

function addSubRow(name = '', desc = '') {
  const id  = 'sr-' + (++_subRowCounter);
  const div = document.createElement('div');
  div.className = 'sub-row';
  div.id        = id;
  div.innerHTML = `
    <div class="sub-row-fields">
      <input type="text" class="sub-name-inp" placeholder="Subcategory name *">
      <input type="text" class="sub-desc-inp" placeholder="Short description">
    </div>
    <button class="sub-remove-btn" onclick="this.closest('.sub-row').remove()">✕</button>`;
  div.querySelector('.sub-name-inp').value = name;
  div.querySelector('.sub-desc-inp').value = desc;
  document.getElementById('modal-subs-list').appendChild(div);
}

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'').replace(/^_+|_+$/g,'') || ('sub_' + Date.now());
}

function pickColor(hex) {
  document.getElementById('cat-color-input').value = hex;
}

function saveCategory() {
  const name  = document.getElementById('cat-name-input').value.trim();
  const color = document.getElementById('cat-color-input').value;
  if (!name) { document.getElementById('cat-name-input').focus(); return; }

  const subs = [...document.querySelectorAll('#modal-subs-list .sub-row')].map(row => {
    const n = row.querySelector('.sub-name-inp').value.trim();
    const d = row.querySelector('.sub-desc-inp').value.trim();
    return n ? { key: slugify(n), name: n, desc: d } : null;
  }).filter(Boolean);

  const customs = getCustomCategories();
  if (_editingCatKey) {
    const idx = customs.findIndex(c => c.key === _editingCatKey);
    if (idx !== -1) customs[idx] = { ...customs[idx], name, color, subs };
  } else {
    customs.push({ key: 'c' + Date.now(), name, color, custom: true, subs });
  }
  saveCustomCategories(customs);
  closeCatModal();
  _refresh();
}

function deleteCategory() {
  if (!_editingCatKey) return;
  const cat = getCustomCategories().find(c => c.key === _editingCatKey);
  if (!confirm(`Delete "${cat?.name || 'this category'}"? This cannot be undone.`)) return;
  saveCustomCategories(getCustomCategories().filter(c => c.key !== _editingCatKey));
  const order = JSON.parse(localStorage.getItem('lifeos-nav-order') || '[]');
  localStorage.setItem('lifeos-nav-order', JSON.stringify(order.filter(k => k !== _editingCatKey)));
  closeCatModal();
  _refresh();
}

function _refresh() {
  renderNav();
  renderOverviewBar();
  renderHomeCategories();
  initNavDrag();
}

// ─── Nav drag-to-reorder ──────────────────────────────────────────────────────
let _fromHandle   = false;
let _dragging     = null;
let _dragReady    = false;

function initNavDrag() {
  const container  = document.getElementById('nav-sections');
  const getSections = () => [...container.querySelectorAll('.nav-section')];

  if (!_dragReady) {
    _dragReady = true;
    document.addEventListener('mouseup', () => {
      getSections().forEach(s => { s.draggable = false; });
    });
  }

  getSections().forEach(section => {
    const navCat = section.querySelector('.nav-category');
    if (!navCat) return;

    navCat.addEventListener('mousedown', () => {
      section.draggable = true;
    });

    section.addEventListener('dragstart', e => {
      _dragging = section;
      e.dataTransfer.effectAllowed = 'move';
      requestAnimationFrame(() => section.classList.add('dragging'));
    });

    section.addEventListener('dragend', () => {
      section.draggable = false;
      section.classList.remove('dragging');
      getSections().forEach(s => s.classList.remove('drag-over'));
      _fromHandle = false;
      _dragging   = null;
      const order = getSections().map(s => s.querySelector('.nav-category')?.id?.replace('navc-','')).filter(Boolean);
      localStorage.setItem('lifeos-nav-order', JSON.stringify(order));
    });

    section.addEventListener('dragover', e => {
      e.preventDefault();
      if (!_dragging || _dragging === section) return;
      getSections().forEach(s => s.classList.remove('drag-over'));
      section.classList.add('drag-over');
    });

    section.addEventListener('dragleave', e => {
      if (!section.contains(e.relatedTarget)) section.classList.remove('drag-over');
    });

    section.addEventListener('drop', e => {
      e.preventDefault();
      if (!_dragging || _dragging === section) return;
      const all     = getSections();
      const fromIdx = all.indexOf(_dragging);
      const toIdx   = all.indexOf(section);
      container.insertBefore(_dragging, fromIdx < toIdx ? section.nextSibling : section);
      section.classList.remove('drag-over');
    });
  });
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function formatTs(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + ' · ' + d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
}
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
  return String(str).replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$/g,'\\$');
}

// ─── Subpage Module System ────────────────────────────────────────────────────

function getSubpageLayout(pageKey) {
  try {
    const saved = localStorage.getItem('lifeos-layout-' + pageKey);
    if (saved) return JSON.parse(saved);
  } catch {}
  const ts = Date.now();
  const layout = { modules: [
    { id:'w'+ts,     type:'empty', size:'wide'   },
    { id:'n'+(ts+1), type:'empty', size:'normal' },
    { id:'n'+(ts+2), type:'empty', size:'normal' },
    { id:'n'+(ts+3), type:'empty', size:'normal' },
    { id:'n'+(ts+4), type:'empty', size:'normal' },
  ]};
  saveSubpageLayout(pageKey, layout);
  return layout;
}
function saveSubpageLayout(pageKey, layout) {
  localStorage.setItem('lifeos-layout-' + pageKey, JSON.stringify(layout));
}

const SPM_TYPE_NAMES = { editor:'Content Editor', notes:'Notes', checklist:'Checklist', empty:'Empty' };

function renderSubpageModules(pageKey, color) {
  const layout = getSubpageLayout(pageKey);
  const grid   = document.getElementById('spm-grid');
  if (!grid) return;

  grid.innerHTML = layout.modules.map(mod => spmModuleHTML(mod, pageKey)).join('');

  // Post-render: apply color to editor elements, load entries, init checklists
  const elLang = document.getElementById('editor-lang');
  const elTA   = document.getElementById('editor-textarea');
  const elPri  = document.querySelector('#spm-grid .tbtn.primary');
  if (color) {
    if (elLang) elLang.style.cssText = `color:${color};background:${hexToRgba(color,0.09)};`;
    if (elPri)  elPri.style.cssText  = `border-color:${color};color:${color};`;
    if (elTA)   elTA.style.caretColor = color;
  }
  if (elTA) { elTA.value = ''; updateCharCount(); setSaveIndicator('unsaved', false); }
  if (layout.modules.some(m => m.type === 'editor')) loadEntries();
  layout.modules.filter(m => m.type === 'checklist').forEach(m => renderChecklistBody(m.id));

  initModuleDrag(pageKey);
}

function spmModuleHTML(mod, pageKey) {
  const isWide  = mod.size === 'wide';
  const cls     = 'spm-module' + (isWide ? ' wide' : '');
  const name    = SPM_TYPE_NAMES[mod.type] || mod.type;
  const grip    = `<svg viewBox="0 0 8 14" width="8" height="14" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/></svg>`;

  const resizeIcon = isWide
    ? `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`
    : `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;

  const hdr = mod.type === 'empty' ? '' : `
    <div class="spm-mod-hdr">
      <span class="spm-drag-handle">${grip}</span>
      <span class="spm-mod-name">${name}</span>
      <div class="spm-mod-acts">
        <button class="spm-act" title="${isWide?'Make normal':'Make wide'}"
                onmousedown="event.stopPropagation()"
                onclick="toggleModuleSize('${pageKey}','${mod.id}')">
          ${resizeIcon}
        </button>
        <button class="spm-act spm-act-rm" title="Remove"
                onmousedown="event.stopPropagation()"
                onclick="removeModule('${pageKey}','${mod.id}')">✕</button>
      </div>
    </div>`;

  let body = '';
  if      (mod.type === 'editor')    body = spmEditorHTML();
  else if (mod.type === 'notes')     body = spmNotesHTML(mod.id);
  else if (mod.type === 'checklist') body = spmChecklistHTML(mod.id);
  else body = `<div class="spm-empty-body">
    <button class="spm-empty-add" onclick="openModulePicker('${mod.id}')">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add module
    </button>
  </div>`;

  return `<div class="${cls}" id="spm-mod-${mod.id}" data-id="${mod.id}">${hdr}${body}</div>`;
}

// ── Editor module ──────────────────────────────────────────────────────────────
function spmEditorHTML() {
  return `<div class="editor-shell">
    <div class="editor-toolbar">
      <div class="editor-toolbar-left">
        <span class="editor-label">Content editor</span>
        <span class="lang-badge" id="editor-lang">HTML</span>
      </div>
      <div class="toolbar-btns">
        <button class="tbtn" onclick="clearEditor()">Clear</button>
        <button class="tbtn" onclick="togglePreview()">Preview</button>
        <button class="tbtn primary" onclick="saveContent()">Save ↓</button>
      </div>
    </div>
    <textarea class="editor-textarea" id="editor-textarea"
              placeholder="Write HTML here — headings, tables, lists, anything you need."
              oninput="onEdit()"></textarea>
    <div class="editor-footer">
      <span class="char-count" id="char-count">0 characters</span>
      <span class="save-indicator" id="save-indicator">unsaved</span>
    </div>
  </div>
  <div class="preview-shell" id="preview-shell">
    <div class="preview-bar">
      <span class="preview-label">Live preview</span>
      <button class="tbtn" onclick="togglePreview()">Close</button>
    </div>
    <iframe class="preview-frame" id="preview-frame" style="min-height:300px;"></iframe>
  </div>
  <div class="entries-section">
    <div class="entries-header">
      <span class="entries-title">Saved entries</span>
      <span class="entries-count" id="entries-count"></span>
    </div>
    <div id="entries-list"></div>
  </div>`;
}

// ── Notes module ───────────────────────────────────────────────────────────────
function spmNotesHTML(id) {
  const val = localStorage.getItem('lifeos-note-' + id) || '';
  return `<textarea class="spm-notes-area" placeholder="Write your notes here…"
    oninput="localStorage.setItem('lifeos-note-${id}',this.value)">${escHtml(val)}</textarea>`;
}

// ── Checklist module ───────────────────────────────────────────────────────────
function spmChecklistHTML(id) {
  return `<div class="spm-checklist">
    <div class="cl-items" id="cl-items-${id}"></div>
    <div class="cl-add-row">
      <input class="cl-inp" id="cl-inp-${id}" placeholder="Add item…"
             onkeydown="if(event.key==='Enter')addClItem('${id}')">
      <button class="cl-add-btn" onclick="addClItem('${id}')">+</button>
    </div>
  </div>`;
}
function renderChecklistBody(id) {
  const el    = document.getElementById('cl-items-' + id);
  if (!el) return;
  const items = JSON.parse(localStorage.getItem('lifeos-cl-' + id) || '[]');
  el.innerHTML = items.map(item => `
    <label class="cl-item${item.done?' done':''}">
      <input type="checkbox" ${item.done?'checked':''} onchange="toggleClItem('${id}','${item.id}')">
      <span>${escHtml(item.text)}</span>
      <button class="cl-del" onclick="deleteClItem('${id}','${item.id}')">✕</button>
    </label>`).join('');
}
function addClItem(id) {
  const inp = document.getElementById('cl-inp-' + id);
  const txt = inp?.value.trim(); if (!txt) return;
  const items = JSON.parse(localStorage.getItem('lifeos-cl-' + id) || '[]');
  items.push({ id:'i'+Date.now(), text:txt, done:false });
  localStorage.setItem('lifeos-cl-' + id, JSON.stringify(items));
  inp.value = ''; renderChecklistBody(id);
}
function toggleClItem(clId, itemId) {
  const items = JSON.parse(localStorage.getItem('lifeos-cl-' + clId) || '[]');
  const item  = items.find(i => i.id === itemId); if (item) item.done = !item.done;
  localStorage.setItem('lifeos-cl-' + clId, JSON.stringify(items)); renderChecklistBody(clId);
}
function deleteClItem(clId, itemId) {
  const items = JSON.parse(localStorage.getItem('lifeos-cl-' + clId) || '[]').filter(i => i.id !== itemId);
  localStorage.setItem('lifeos-cl-' + clId, JSON.stringify(items)); renderChecklistBody(clId);
}

// ── Module CRUD ────────────────────────────────────────────────────────────────
function addModule(type, targetId) {
  const layout = getSubpageLayout(currentKey);
  if (targetId) {
    const m = layout.modules.find(m => m.id === targetId);
    if (m && m.type === 'empty') { m.type = type; }
  } else {
    layout.modules.push({ id:'m'+Date.now(), type, size:'normal' });
  }
  saveSubpageLayout(currentKey, layout);
  closeSpmModal();
  renderSubpageModules(currentKey, _subpageColor);
}

function removeModule(pageKey, id) {
  const layout = getSubpageLayout(pageKey);
  layout.modules = layout.modules.filter(m => m.id !== id);
  saveSubpageLayout(pageKey, layout);
  renderSubpageModules(pageKey, _subpageColor);
}

function toggleModuleSize(pageKey, id) {
  const layout = getSubpageLayout(pageKey);
  const mod = layout.modules.find(m => m.id === id);
  if (mod) mod.size = mod.size === 'wide' ? 'normal' : 'wide';
  saveSubpageLayout(pageKey, layout);
  renderSubpageModules(pageKey, _subpageColor);
}

// Store color so re-renders can reapply it
let _subpageColor = '';
const _origShowSubpage = showSubpage;

// ── Module picker modal ────────────────────────────────────────────────────────
let _pickerTargetId = null;

const SPM_TYPES = [
  { type:'editor',    name:'Content Editor', color:'#5b8dff', desc:'HTML editor with save, preview, and a timestamped entries feed.',
    icon:'<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><path d="M9 21V9"/>' },
  { type:'notes',     name:'Notes',          color:'#4ecb8d', desc:'Freeform text area that auto-saves as you type.',
    icon:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
  { type:'checklist', name:'Checklist',      color:'#f7c948', desc:'Add and check off items — to-dos, habits, or any list.',
    icon:'<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
];

function openModulePicker(targetId) {
  _pickerTargetId = targetId || null;
  const body = document.getElementById('spm-modal-body');
  if (!body) return;
  body.innerHTML = `<div class="spm-lib-grid">
    ${SPM_TYPES.map(t => `
      <div class="spm-lib-card" style="--lib-color:${t.color}"
           onclick="addModule('${t.type}',${_pickerTargetId ? `'${_pickerTargetId}'` : 'null'})">
        <div class="spm-lib-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="${t.color}"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>
        </div>
        <div class="spm-lib-name">${t.name}</div>
        <div class="spm-lib-desc">${t.desc}</div>
      </div>`).join('')}
  </div>`;
  document.getElementById('spm-mod-modal').style.display = 'flex';
}

function closeSpmModal() {
  document.getElementById('spm-mod-modal').style.display = 'none';
}

// ── Module drag-to-reorder (mouse-based) ──────────────────────────────────────
let _spmDrag = null;

function initModuleDrag(pageKey) {
  document.getElementById('spm-grid')?.querySelectorAll('.spm-drag-handle').forEach(h => {
    h.addEventListener('mousedown', e => {
      e.preventDefault();
      const mod = h.closest('.spm-module');
      if (mod) spmDragStart(e, mod, pageKey);
    });
  });
}

function spmDragStart(e, mod, pageKey) {
  const r = mod.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.className = 'spm-ghost';
  ghost.style.cssText = `width:${r.width}px;top:${r.top + window.scrollY}px;left:${r.left}px;`;
  document.body.appendChild(ghost);
  mod.classList.add('spm-lifting');
  _spmDrag = { mod, ghost, pageKey, ox: e.clientX - r.left, oy: e.clientY - r.top, over: null };
  document.addEventListener('mousemove', _spmMove);
  document.addEventListener('mouseup', _spmEnd, { once: true });
}

function _spmMove(e) {
  if (!_spmDrag) return;
  const { ghost, ox, oy } = _spmDrag;
  ghost.style.top  = (e.clientY - oy + window.scrollY) + 'px';
  ghost.style.left = (e.clientX - ox) + 'px';
  const grid   = document.getElementById('spm-grid');
  const others = [...grid.querySelectorAll('.spm-module:not(.spm-lifting)')];
  let over = null;
  for (const m of others) {
    const r = m.getBoundingClientRect();
    if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) {
      over = m; break;
    }
  }
  others.forEach(m => m.classList.toggle('spm-drag-over', m === over));
  _spmDrag.over = over;
}

function _spmEnd() {
  if (!_spmDrag) return;
  const { mod, ghost, pageKey, over } = _spmDrag;
  ghost.remove();
  mod.classList.remove('spm-lifting');
  const grid = document.getElementById('spm-grid');
  grid.querySelectorAll('.spm-module').forEach(m => m.classList.remove('spm-drag-over'));
  if (over && over !== mod) {
    const all = [...grid.querySelectorAll('.spm-module')];
    const fi = all.indexOf(mod), ti = all.indexOf(over);
    grid.insertBefore(mod, fi < ti ? over.nextSibling : over);
    const order  = [...grid.querySelectorAll('.spm-module')].map(m => m.dataset.id);
    const layout = getSubpageLayout(pageKey);
    layout.modules.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    saveSubpageLayout(pageKey, layout);
  }
  document.removeEventListener('mousemove', _spmMove);
  _spmDrag = null;
}

// ─── Module Overview ─────────────────────────────────────────────────────────

const GENERAL_MODULES = [
  { name:'Content Editor', color:'#5b8dff', desc:'HTML editor with save, live preview, and a timestamped entries feed. The core writing tool for any page.' },
  { name:'Notes',          color:'#4ecb8d', desc:'Freeform text area that auto-saves as you type. Good for quick context, reminders, or running thoughts.' },
  { name:'Checklist',      color:'#f7c948', desc:'Add, check off, and remove items. Use for to-dos, habits, shopping lists, or anything you want to track.' },
];

const FIN_BUILTIN_MODULES = [
  { name:'P&L Chart',         color:'#b78bfa', location:'Finance › Overview', desc:'12-month profit & loss trend line, auto-calculated from your Budget entries.' },
  { name:'Accounts',          color:'#b78bfa', location:'Finance › Overview', desc:'Track linked bank accounts — name, institution, type, and live balance.' },
  { name:'Credit Score',      color:'#b78bfa', location:'Finance › Overview', desc:'Credit score display with a 300–850 rating bar and color-coded category label.' },
  { name:'Budget',            color:'#b78bfa', location:'Finance › Overview', desc:'Monthly income and expense tracker with editable rows. Feeds the P&L chart.' },
  { name:'Payment Schedule',  color:'#b78bfa', location:'Finance › Overview', desc:'Recurring bill list sorted by due date with per-month paid/unpaid tracking.' },
];

const EXTRA_MODULE_TYPES = [
  { type:'savings', name:'Savings Goal', color:'#4ecb8d', desc:'Progress bar toward a savings target showing current vs goal amounts.' },
  { type:'debt',    name:'Debt Payoff',  color:'#f25f7a', desc:'Track a debt balance going down from its original amount to zero.' },
  { type:'note',    name:'Custom Note',  color:'#f7c948', desc:'Freeform text block — write anything you need on any subpage.' },
];

function showModuleOverview() {
  document.querySelectorAll('.nav-sub').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-category').forEach(c => c.classList.remove('active','open'));
  document.querySelectorAll('.nav-subcats').forEach(sc => sc.classList.remove('open'));
  document.getElementById('nav-home-btn').classList.remove('active');
  document.getElementById('mo-tab-btn')?.classList.add('active');
  showPage('module-overview');
  renderModuleOverview();
}

function renderModuleOverview() {
  const content = document.getElementById('module-overview-content');
  if (!content) return;

  const activeExtras = getFinData('modules');

  const generalCards = GENERAL_MODULES.map(m => moCard({
    name: m.name, color: m.color, location: 'All subpages', desc: m.desc,
    tag: 'General', tagClass: 'mo-tag-general',
  })).join('');

  const builtinCards = FIN_BUILTIN_MODULES.map(m => moCard({
    name: m.name, color: m.color, location: m.location, desc: m.desc,
    tag: 'Finance', tagClass: 'mo-tag-builtin', btnLabel: 'Open →', btnFn: 'showFinOverview()',
  })).join('');

  const activeCards = activeExtras.map(m => {
    const t = EXTRA_MODULE_TYPES.find(x => x.type === m.type);
    return moCard({
      name: escHtml(m.title), color: t?.color||'#888', location: 'Finance › Overview',
      desc: t?.desc||'', tag: t?.name||m.type, tagClass: 'mo-tag-custom', btnLabel: 'Open →', btnFn: 'showFinOverview()',
    });
  }).join('');

  const typeCards = EXTRA_MODULE_TYPES.map(t => moCard({
    name: t.name, color: t.color, location: 'Finance › Overview', desc: t.desc,
    tag: 'Finance add-on', tagClass: 'mo-tag-type', btnLabel: 'Add →', btnFn: 'showFinOverview()',
  })).join('');

  content.innerHTML = `
    <div class="mo-section">
      <div class="mo-section-hdr">
        <span class="mo-section-title">General Modules</span>
        <span class="mo-section-sub">Add to any subpage via + Add module</span>
      </div>
      <div class="mo-grid">${generalCards}</div>
    </div>
    <div class="mo-section">
      <div class="mo-section-hdr">
        <span class="mo-section-title">Finance Dashboard</span>
        <span class="mo-section-sub">5 built-in modules — Finance › Overview</span>
      </div>
      <div class="mo-grid">${builtinCards}</div>
    </div>
    ${activeExtras.length > 0 ? `
    <div class="mo-section">
      <div class="mo-section-hdr">
        <span class="mo-section-title">Your Custom Modules</span>
        <span class="mo-section-sub">${activeExtras.length} active instance${activeExtras.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="mo-grid">${activeCards}</div>
    </div>` : ''}
    <div class="mo-section">
      <div class="mo-section-hdr">
        <span class="mo-section-title">Finance Add-ons</span>
        <span class="mo-section-sub">Expandable modules for Finance › Overview</span>
      </div>
      <div class="mo-grid">${typeCards}</div>
    </div>`;
}

function moCard({name, color, location, desc, tag, tagClass, btnLabel, btnFn}) {
  return `<div class="mo-card" style="--mo-color:${color}">
    <div class="mo-card-top">
      <span class="mo-dot" style="background:${color}"></span>
      <span class="mo-name">${name}</span>
    </div>
    <div class="mo-loc">${location}</div>
    <div class="mo-desc">${desc}</div>
    <div class="mo-card-foot">
      <span class="mo-tag ${tagClass}">${tag}</span>
      ${btnFn ? `<button class="mo-open-btn" onclick="${btnFn}">${btnLabel}</button>` : ''}
    </div>
  </div>`;
}

// ─── Finance Dashboard ────────────────────────────────────────────────────────

// Data helpers
function getFinData(key) {
  try {
    const raw = localStorage.getItem('lifeos-fin-' + key);
    return raw !== null ? JSON.parse(raw) : _finDefault(key);
  } catch { return _finDefault(key); }
}
function setFinData(key, val) { localStorage.setItem('lifeos-fin-' + key, JSON.stringify(val)); }
function _finDefault(k) {
  return k === 'accounts' ? [] : k === 'budget' ? {} : k === 'payments' ? [] : k === 'modules' ? [] : null;
}
function getCurrentMonthISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
}
function getLast12Months() {
  const n = new Date();
  return Array.from({length:12}, (_,i) => {
    const d = new Date(n.getFullYear(), n.getMonth() - 11 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  });
}
function monthShort(iso) {
  const [y,m] = iso.split('-');
  return new Date(+y,+m-1,1).toLocaleDateString('en-US',{month:'short'});
}
function formatCurrency(v) {
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(v);
}
function formatCurrencyShort(v) {
  const abs = Math.abs(v), sign = v < 0 ? '-' : '';
  if (abs >= 1000) return sign + '$' + (abs/1000).toFixed(abs >= 10000 ? 0 : 1) + 'k';
  return sign + '$' + Math.round(abs);
}

// Navigation
function showFinOverview() {
  document.querySelectorAll('.nav-sub').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-sub[data-sub]').forEach(s => {
    if (s.dataset.cat === 'fin' && s.dataset.sub === 'overview') s.classList.add('active');
  });
  const catEl = document.getElementById('navc-fin');
  if (catEl) {
    document.querySelectorAll('.nav-category').forEach(c => c.classList.remove('active','open'));
    document.querySelectorAll('.nav-subcats').forEach(sc => sc.classList.remove('open'));
    catEl.classList.add('active','open');
    document.getElementById('nav-fin')?.classList.add('open');
  }
  document.getElementById('nav-home-btn').classList.remove('active');
  showPage('fin-overview');
  renderFinDashboard();
}

function renderFinDashboard() {
  renderModulesGrid();
  renderPLChart();
}

// ── Modules grid ───────────────────────────────────────────────────────────────
let _budgetOffset = 0;

function renderModulesGrid() {
  const grid = document.getElementById('fin-modules-grid');
  if (!grid) return;
  const extras = getFinData('modules').map(m => renderExtraModuleHTML(m)).join('');
  grid.innerHTML = `
    <div class="fin-module" id="mod-accounts">
      <div class="fin-mod-header">
        <span class="fin-mod-title">Accounts</span>
        <button class="fin-mod-action" onclick="toggleAccForm()">+ Add</button>
      </div>
      <div id="mod-accounts-body"></div>
    </div>
    <div class="fin-module" id="mod-credit">
      <div class="fin-mod-header">
        <span class="fin-mod-title">Credit Score</span>
        <button class="fin-mod-action" onclick="toggleCreditForm()">Update</button>
      </div>
      <div id="mod-credit-body"></div>
    </div>
    <div class="fin-module" id="mod-budget">
      <div class="fin-mod-header">
        <span class="fin-mod-title">Budget</span>
        <div class="budget-nav-ctrl">
          <button class="budget-nav-btn" onclick="changeBudgetMonth(-1)">‹</button>
          <span class="budget-month-lbl" id="budget-month-lbl"></span>
          <button class="budget-nav-btn" onclick="changeBudgetMonth(1)">›</button>
        </div>
      </div>
      <div id="mod-budget-body"></div>
    </div>
    <div class="fin-module" id="mod-payments">
      <div class="fin-mod-header">
        <span class="fin-mod-title">Payment Schedule</span>
        <button class="fin-mod-action" onclick="togglePayForm()">+ Add</button>
      </div>
      <div id="mod-payments-body"></div>
    </div>
    ${extras}`;
  renderAccountsBody();
  renderCreditBody();
  renderBudgetBody();
  renderPaymentsBody();
}

// ── Accounts ───────────────────────────────────────────────────────────────────
let _editAccId = null;

function renderAccountsBody() {
  const body = document.getElementById('mod-accounts-body');
  if (!body) return;
  const accs = getFinData('accounts');
  const cards = accs.length === 0
    ? `<p class="fin-empty">No accounts yet.</p>`
    : `<div class="accounts-grid">${accs.map(accCardHTML).join('')}</div>`;
  body.innerHTML = `${cards}
    <div class="acc-form" id="acc-form">
      <div class="fin-input-row">
        <input class="fin-input" id="acc-fname" placeholder="Account name *">
        <input class="fin-input" id="acc-finst" placeholder="Institution">
      </div>
      <div class="fin-input-row">
        <select class="fin-select" id="acc-ftype">
          <option>Checking</option><option>Savings</option>
          <option>Credit Card</option><option>Investment</option><option>Loan</option>
        </select>
        <input class="fin-input" id="acc-fbal" type="number" placeholder="Balance *" step="0.01">
      </div>
      <div class="fin-form-btns">
        <button class="fin-mod-action" onclick="cancelAccForm()">Cancel</button>
        <button class="fin-mod-action fin-primary" onclick="saveAccount()">Save account</button>
      </div>
    </div>`;
}

function accCardHTML(a) {
  const neg = a.balance < 0;
  return `<div class="acc-card">
    <div class="acc-card-actions">
      <button class="acc-act" onclick="editAccount('${a.id}')">Edit</button>
      <button class="acc-act" onclick="deleteAccount('${a.id}')">✕</button>
    </div>
    <div class="acc-top">
      <span class="acc-name">${escHtml(a.name)}</span>
      <span class="acc-type-badge">${escHtml(a.type)}</span>
    </div>
    <div class="acc-balance${neg?' neg':''}">${formatCurrency(a.balance)}</div>
    ${a.institution ? `<div class="acc-inst">${escHtml(a.institution)}</div>` : ''}
    <div class="acc-stripe" style="background:#b78bfa"></div>
  </div>`;
}

function toggleAccForm() {
  _editAccId = null;
  const f = document.getElementById('acc-form');
  if (!f) return;
  const open = f.classList.toggle('open');
  if (open) {
    ['acc-fname','acc-finst','acc-fbal'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('acc-ftype').value = 'Checking';
    document.getElementById('acc-fname').focus();
  }
}
function cancelAccForm() { _editAccId = null; document.getElementById('acc-form')?.classList.remove('open'); }

function editAccount(id) {
  const a = getFinData('accounts').find(x => x.id === id);
  if (!a) return;
  _editAccId = id;
  const f = document.getElementById('acc-form');
  f.classList.add('open');
  document.getElementById('acc-fname').value = a.name;
  document.getElementById('acc-finst').value = a.institution || '';
  document.getElementById('acc-ftype').value = a.type;
  document.getElementById('acc-fbal').value  = a.balance;
  document.getElementById('acc-fname').focus();
}

function saveAccount() {
  const name = document.getElementById('acc-fname').value.trim();
  const bal  = parseFloat(document.getElementById('acc-fbal').value);
  if (!name || isNaN(bal)) { document.getElementById('acc-fname').focus(); return; }
  const accs  = getFinData('accounts');
  const entry = { id: _editAccId || ('a'+Date.now()), name, institution: document.getElementById('acc-finst').value.trim(), type: document.getElementById('acc-ftype').value, balance: bal };
  if (_editAccId) { const i = accs.findIndex(a => a.id === _editAccId); if (i !== -1) accs[i] = entry; }
  else accs.push(entry);
  setFinData('accounts', accs);
  _editAccId = null;
  renderAccountsBody();
}

function deleteAccount(id) {
  if (!confirm('Remove this account?')) return;
  setFinData('accounts', getFinData('accounts').filter(a => a.id !== id));
  renderAccountsBody();
}

// ── Credit Score ───────────────────────────────────────────────────────────────
function renderCreditBody() {
  const body   = document.getElementById('mod-credit-body');
  if (!body) return;
  const credit = getFinData('credit');
  const form   = `<div class="credit-form" id="credit-form" style="display:none">
    <div class="fin-input-row" style="margin-top:12px">
      <input class="fin-input" id="credit-inp" type="number" placeholder="Score (300–850)" min="300" max="850"${credit ? ` value="${credit.score}"` : ''}>
      <button class="fin-mod-action fin-primary" onclick="saveCreditScore()">Save</button>
    </div>
  </div>`;

  if (!credit) {
    body.innerHTML = `<p class="fin-empty" style="margin-bottom:0">No score entered yet.</p>${form}`;
    document.getElementById('credit-form').style.display = 'block';
    return;
  }
  const s   = credit.score;
  const pct = ((s - 300) / 550) * 100;
  const {label, color} = creditRating(s);
  body.innerHTML = `
    <div class="credit-score-num" style="color:${color}">${s}</div>
    <div class="credit-score-label" style="color:${color}">${label}</div>
    <div class="credit-bar-wrap">
      <div class="credit-bar-marker" style="left:${pct}%"></div>
    </div>
    <div class="credit-bar-labels"><span>300</span><span>580</span><span>670</span><span>740</span><span>800</span><span>850</span></div>
    <div class="credit-updated">Updated ${credit.updated}</div>
    ${form}`;
}
function toggleCreditForm() {
  const f = document.getElementById('credit-form');
  if (!f) return;
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
  if (f.style.display === 'block') document.getElementById('credit-inp')?.focus();
}
function saveCreditScore() {
  const v = parseInt(document.getElementById('credit-inp')?.value);
  if (!v || v < 300 || v > 850) { document.getElementById('credit-inp')?.focus(); return; }
  const updated = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  setFinData('credit', { score: v, updated });
  renderCreditBody();
}
function creditRating(s) {
  if (s < 580) return {label:'Poor',       color:'#f25f7a'};
  if (s < 670) return {label:'Fair',       color:'#f0a05a'};
  if (s < 740) return {label:'Good',       color:'#f7c948'};
  if (s < 800) return {label:'Very Good',  color:'#4ecb8d'};
  return              {label:'Exceptional',color:'#5b8dff'};
}

// ── Budget ─────────────────────────────────────────────────────────────────────
function getBudgetISO() {
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth() + _budgetOffset, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function changeBudgetMonth(dir) { _budgetOffset += dir; renderBudgetBody(); renderPLChart(); }

function renderBudgetBody() {
  const body = document.getElementById('mod-budget-body');
  const lbl  = document.getElementById('budget-month-lbl');
  if (!body) return;
  const iso    = getBudgetISO();
  if (lbl) lbl.textContent = new Date(iso + '-15').toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const budget = getFinData('budget');
  const month  = budget[iso] || {income:0, expenses:[]};
  const totExp = (month.expenses||[]).reduce((s,e) => s+(parseFloat(e.amount)||0), 0);
  const net    = (parseFloat(month.income)||0) - totExp;
  const netCls = net >= 0 ? 'positive' : 'negative';

  const expRows = (month.expenses||[]).map(e => `
    <div class="budget-row">
      <input class="budget-label-inp" value="${escHtml(e.label)}" onchange="saveBudgetExpLabel('${iso}','${e.id}',this.value)">
      <div class="budget-amt-wrap"><span class="budget-prefix">$</span><input class="budget-amt-inp" type="number" value="${e.amount||0}" step="0.01" oninput="saveBudgetExpAmt('${iso}','${e.id}',this.value)"></div>
      <button class="budget-row-del" title="Remove" onclick="deleteBudgetExp('${iso}','${e.id}')">✕</button>
    </div>`).join('');

  body.innerHTML = `
    <div class="budget-row budget-income-row">
      <span class="budget-row-lbl">Income</span>
      <div class="budget-amt-wrap"><span class="budget-prefix">$</span><input class="budget-amt-inp" type="number" value="${month.income||0}" step="0.01" oninput="saveBudgetIncome('${iso}',this.value)"></div>
    </div>
    <div class="budget-section-lbl">Expenses</div>
    ${expRows}
    <button class="tbtn budget-add-exp" onclick="addBudgetExp('${iso}')">+ Add expense</button>
    <div class="budget-net-row">
      <span class="budget-net-lbl">Net</span>
      <span class="budget-net-amt ${netCls}" id="budget-net">${net>=0?'+':''}${formatCurrency(net)}</span>
    </div>`;
}

function saveBudgetIncome(iso, val) {
  const b = getFinData('budget');
  if (!b[iso]) b[iso] = {income:0,expenses:[]};
  b[iso].income = parseFloat(val)||0;
  setFinData('budget', b);
  updateBudgetNet(iso);
  renderPLChart();
}
function saveBudgetExpAmt(iso, id, val) {
  const b = getFinData('budget');
  const e = b[iso]?.expenses?.find(x => x.id === id);
  if (e) { e.amount = parseFloat(val)||0; setFinData('budget',b); updateBudgetNet(iso); renderPLChart(); }
}
function saveBudgetExpLabel(iso, id, val) {
  const b = getFinData('budget');
  const e = b[iso]?.expenses?.find(x => x.id === id);
  if (e) { e.label = val.trim()||e.label; setFinData('budget',b); }
}
function addBudgetExp(iso) {
  const b = getFinData('budget');
  if (!b[iso]) b[iso] = {income:0,expenses:[]};
  b[iso].expenses.push({id:'e'+Date.now(), label:'Expense', amount:0});
  setFinData('budget',b);
  renderBudgetBody();
}
function deleteBudgetExp(iso, id) {
  const b = getFinData('budget');
  if (b[iso]) b[iso].expenses = b[iso].expenses.filter(e => e.id !== id);
  setFinData('budget',b);
  renderBudgetBody();
  renderPLChart();
}
function updateBudgetNet(iso) {
  const b   = getFinData('budget');
  const m   = b[iso]||{income:0,expenses:[]};
  const tot = (m.expenses||[]).reduce((s,e) => s+(parseFloat(e.amount)||0),0);
  const net = (parseFloat(m.income)||0) - tot;
  const el  = document.getElementById('budget-net');
  if (el) { el.textContent = (net>=0?'+':'') + formatCurrency(net); el.className = 'budget-net-amt '+(net>=0?'positive':'negative'); }
}

// ── Payment Schedule ───────────────────────────────────────────────────────────
function getPaidSet(iso) {
  try { return new Set(JSON.parse(localStorage.getItem('lifeos-fin-paid-'+iso)||'[]')); } catch { return new Set(); }
}

function renderPaymentsBody() {
  const body  = document.getElementById('mod-payments-body');
  if (!body) return;
  const pays  = getFinData('payments');
  const curM  = getCurrentMonthISO();
  const paid  = getPaidSet(curM);
  const today = new Date().getDate();
  const sorted = [...pays].sort((a,b) => (a.day||1)-(b.day||1));

  const rows = sorted.length === 0
    ? `<p class="fin-empty">No payments yet.</p>`
    : sorted.map(p => {
        const isPaid  = paid.has(p.id);
        const overdue = !isPaid && (p.day||1) < today;
        const dot     = isPaid ? '#4ecb8d' : overdue ? '#f25f7a' : '#b78bfa';
        return `<div class="pay-item">
          <span class="pay-due">Due ${p.day||1}</span>
          <span class="pay-dot" style="background:${dot}"></span>
          <span class="pay-name${isPaid?' paid':''}">${escHtml(p.name)}</span>
          <span class="pay-amt">${formatCurrency(p.amount)}</span>
          <button class="pay-toggle${isPaid?' paid':''}" onclick="togglePayPaid('${p.id}')">${isPaid?'✓ Paid':'Mark paid'}</button>
          <button class="pay-del" onclick="deletePayment('${p.id}')">✕</button>
        </div>`;
      }).join('');

  body.innerHTML = `<div class="pay-list">${rows}</div>
    <div class="pay-form" id="pay-form">
      <div class="fin-input-row">
        <input class="fin-input" id="pay-fname" placeholder="Payment name *">
        <input class="fin-input" id="pay-fday" type="number" placeholder="Day of month" min="1" max="31" style="width:120px">
      </div>
      <div class="fin-input-row">
        <input class="fin-input" id="pay-famt" type="number" placeholder="Amount *" step="0.01">
        <button class="fin-mod-action" onclick="cancelPayForm()">Cancel</button>
        <button class="fin-mod-action fin-primary" onclick="savePayment()">Add</button>
      </div>
    </div>`;
}

function togglePayForm() {
  const f = document.getElementById('pay-form');
  if (!f) return;
  f.classList.toggle('open');
  if (f.classList.contains('open')) document.getElementById('pay-fname')?.focus();
}
function cancelPayForm() { document.getElementById('pay-form')?.classList.remove('open'); }

function savePayment() {
  const name = document.getElementById('pay-fname').value.trim();
  const amt  = parseFloat(document.getElementById('pay-famt').value);
  const day  = parseInt(document.getElementById('pay-fday').value)||1;
  if (!name || isNaN(amt)) return;
  const pays = getFinData('payments');
  pays.push({id:'p'+Date.now(), name, amount:amt, day});
  setFinData('payments', pays);
  cancelPayForm();
  renderPaymentsBody();
}
function deletePayment(id) {
  if (!confirm('Remove this payment?')) return;
  setFinData('payments', getFinData('payments').filter(p => p.id !== id));
  renderPaymentsBody();
}
function togglePayPaid(id) {
  const iso  = getCurrentMonthISO();
  const paid = getPaidSet(iso);
  if (paid.has(id)) paid.delete(id); else paid.add(id);
  localStorage.setItem('lifeos-fin-paid-'+iso, JSON.stringify([...paid]));
  renderPaymentsBody();
}

// ── Extra Modules ──────────────────────────────────────────────────────────────
function toggleModulePicker() {
  const el = document.getElementById('fin-mod-picker');
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (!open) renderModulePickerContent();
}

function renderModulePickerContent() {
  const el = document.getElementById('fin-mod-picker');
  if (!el) return;
  el.innerHTML = `
    <div class="fin-mod-picker-hdr">Choose a module type</div>
    <div class="fin-mod-picker-grid">
      <div class="fin-mod-pick-opt" onclick="showModuleForm('savings')">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#4ecb8d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 1-6.88 2.75"/><polyline points="12 6 12 12 15 15"/></svg>
        <div class="fin-mod-pick-name">Savings Goal</div>
        <div class="fin-mod-pick-desc">Track toward a target</div>
      </div>
      <div class="fin-mod-pick-opt" onclick="showModuleForm('debt')">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f25f7a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <div class="fin-mod-pick-name">Debt Payoff</div>
        <div class="fin-mod-pick-desc">Track balance going down</div>
      </div>
      <div class="fin-mod-pick-opt" onclick="showModuleForm('note')">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#b78bfa" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        <div class="fin-mod-pick-name">Custom Note</div>
        <div class="fin-mod-pick-desc">Freeform text block</div>
      </div>
    </div>`;
}

function showModuleForm(type) {
  const el = document.getElementById('fin-mod-picker');
  const fields = {
    savings: `<input class="fin-input" id="em-title" placeholder="Goal name *">
               <input class="fin-input" id="em-target" type="number" placeholder="Target amount ($)" step="0.01">
               <input class="fin-input" id="em-current" type="number" placeholder="Current amount ($)" step="0.01">`,
    debt:    `<input class="fin-input" id="em-title" placeholder="Debt name *">
               <input class="fin-input" id="em-orig" type="number" placeholder="Original balance ($)" step="0.01">
               <input class="fin-input" id="em-current" type="number" placeholder="Current balance ($)" step="0.01">`,
    note:    `<input class="fin-input" id="em-title" placeholder="Note title *">`,
  };
  el.innerHTML = `
    <div class="fin-mod-picker-hdr">
      <button class="fin-mod-picker-back" onclick="renderModulePickerContent()">← Back</button>
      New ${type} module
    </div>
    <div class="fin-form-fields">${fields[type]}</div>
    <div class="fin-form-btns">
      <button class="fin-mod-action" onclick="toggleModulePicker()">Cancel</button>
      <button class="fin-mod-action fin-primary" onclick="confirmAddModule('${type}')">Add module</button>
    </div>`;
  document.getElementById('em-title')?.focus();
}

function confirmAddModule(type) {
  const title = document.getElementById('em-title')?.value.trim();
  if (!title) { document.getElementById('em-title')?.focus(); return; }
  const mods = getFinData('modules');
  const id   = 'm' + Date.now();
  if (type === 'savings') {
    const target  = parseFloat(document.getElementById('em-target')?.value)||0;
    const current = parseFloat(document.getElementById('em-current')?.value)||0;
    mods.push({id, type, title, data:{target, current}});
  } else if (type === 'debt') {
    const orig    = parseFloat(document.getElementById('em-orig')?.value)||0;
    const current = parseFloat(document.getElementById('em-current')?.value)||orig;
    mods.push({id, type, title, data:{original:orig, current}});
  } else {
    mods.push({id, type, title, data:{text:''}});
  }
  setFinData('modules', mods);
  document.getElementById('fin-mod-picker').style.display = 'none';
  renderModulesGrid();
  renderPLChart();
}

function renderExtraModuleHTML(m) {
  let body = '';
  if (m.type === 'savings') {
    const pct = Math.min(100, (m.data.current/(m.data.target||1))*100);
    body = `<div class="sav-pct">${Math.round(pct)}%</div>
      <div class="sav-bar-bg"><div class="sav-bar-fill" style="width:${pct}%"></div></div>
      <div class="sav-stats"><span>${formatCurrency(m.data.current)} saved</span><span>of ${formatCurrency(m.data.target)}</span></div>
      <div class="fin-input-row" style="margin-top:14px">
        <input class="fin-input" type="number" id="sav-upd-${m.id}" value="${m.data.current}" step="0.01" placeholder="Update amount">
        <button class="fin-mod-action fin-primary" onclick="updateSavings('${m.id}')">Update</button>
      </div>`;
  } else if (m.type === 'debt') {
    const pct = Math.min(100, (m.data.current/(m.data.original||1))*100);
    body = `<div class="debt-bal">${formatCurrency(m.data.current)}</div>
      <div class="debt-orig">of ${formatCurrency(m.data.original)} original</div>
      <div class="sav-bar-bg" style="margin-top:12px"><div class="sav-bar-fill" style="width:${pct}%;background:#f25f7a"></div></div>
      <div class="fin-input-row" style="margin-top:14px">
        <input class="fin-input" type="number" id="debt-upd-${m.id}" value="${m.data.current}" step="0.01" placeholder="Update balance">
        <button class="fin-mod-action fin-primary" onclick="updateDebt('${m.id}')">Update</button>
      </div>`;
  } else {
    body = `<textarea class="fin-note-area" placeholder="Notes…" oninput="saveNote('${m.id}',this.value)">${escHtml(m.data.text||'')}</textarea>`;
  }
  return `<div class="fin-module">
    <div class="fin-mod-header">
      <span class="fin-mod-title">${escHtml(m.title)}</span>
      <button class="fin-mod-action fin-danger" onclick="deleteExtraModule('${m.id}')">Remove</button>
    </div>
    ${body}
  </div>`;
}

function updateSavings(id) {
  const mods = getFinData('modules'), m = mods.find(x => x.id === id);
  if (!m) return;
  m.data.current = parseFloat(document.getElementById('sav-upd-'+id)?.value)||0;
  setFinData('modules', mods); renderModulesGrid(); renderPLChart();
}
function updateDebt(id) {
  const mods = getFinData('modules'), m = mods.find(x => x.id === id);
  if (!m) return;
  m.data.current = parseFloat(document.getElementById('debt-upd-'+id)?.value)||0;
  setFinData('modules', mods); renderModulesGrid(); renderPLChart();
}
function saveNote(id, text) {
  const mods = getFinData('modules'), m = mods.find(x => x.id === id);
  if (m) { m.data.text = text; setFinData('modules', mods); }
}
function deleteExtraModule(id) {
  if (!confirm('Remove this module?')) return;
  setFinData('modules', getFinData('modules').filter(m => m.id !== id));
  renderModulesGrid(); renderPLChart();
}

// ── P/L Chart ──────────────────────────────────────────────────────────────────
function renderPLChart() {
  const wrap = document.getElementById('pl-chart-wrap');
  if (!wrap) return;
  const budget = getFinData('budget');
  const months = getLast12Months();
  const data   = months.map(m => {
    const d = budget[m];
    if (!d) return {m, net:null, label:monthShort(m)};
    const exp = (d.expenses||[]).reduce((s,e) => s+(parseFloat(e.amount)||0), 0);
    return {m, net:(parseFloat(d.income)||0)-exp, label:monthShort(m)};
  });
  if (!data.some(d => d.net !== null)) {
    wrap.innerHTML = `<div class="fin-chart-empty">Enter income and expenses in the Budget module to see your P&amp;L trend.</div>`;
    return;
  }

  const W=960, H=180, pL=64, pR=20, pT=16, pB=36;
  const plotW=W-pL-pR, plotH=H-pT-pB, n=data.length;
  const nets = data.filter(d=>d.net!==null).map(d=>d.net);
  const minV = Math.min(0,...nets), maxV=Math.max(0,...nets);
  const span = maxV-minV||1;
  const toX  = i => pL + (i/(n-1))*plotW;
  const toY  = v => pT + plotH - ((v-minV)/span)*plotH;
  const zeroY = toY(0);

  const gridSVG = Array.from({length:5},(_,i) => {
    const v=minV+(span/4)*i, y=toY(v);
    return `<line x1="${pL}" y1="${y}" x2="${W-pR}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
            <text x="${pL-8}" y="${y+4}" text-anchor="end" font-family="DM Mono,monospace" font-size="10" fill="rgba(240,237,232,0.3)">${formatCurrencyShort(v)}</text>`;
  }).join('');

  const zeroLine = minV<0&&maxV>0
    ? `<line x1="${pL}" y1="${zeroY}" x2="${W-pR}" y2="${zeroY}" stroke="rgba(255,255,255,0.18)" stroke-width="1" stroke-dasharray="4,3"/>`
    : '';

  const pts = data.map((d,i) => ({x:toX(i), y:d.net!==null?toY(d.net):null, net:d.net, label:d.label}));
  const segs=[]; let cur=null;
  pts.forEach(p => { if(p.y!==null){if(!cur)cur=[];cur.push(p);}else if(cur){segs.push(cur);cur=null;} });
  if(cur)segs.push(cur);

  const areaPath = segs.map(s => s.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')+` L${s[s.length-1].x} ${zeroY} L${s[0].x} ${zeroY}Z`).join(' ');
  const linePath = segs.map(s => s.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')).join(' ');

  const circles = pts.filter(p=>p.y!==null).map(p =>
    `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${p.net>=0?'#b78bfa':'#f25f7a'}" stroke="#0d0d0f" stroke-width="2.5" class="pl-dot" data-net="${p.net}" data-label="${p.label}"/>`
  ).join('');

  const xLabels = pts.map((p,i) =>
    (i===0||i===n-1||i%2===0) ? `<text x="${p.x}" y="${H-6}" text-anchor="middle" font-family="DM Mono,monospace" font-size="10" fill="rgba(240,237,232,0.3)">${p.label}</text>` : ''
  ).join('');

  wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:180px;display:block;overflow:visible">
    <defs><linearGradient id="plGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#b78bfa" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#b78bfa" stop-opacity="0.01"/>
    </linearGradient></defs>
    ${gridSVG}${zeroLine}
    <path d="${areaPath}" fill="url(#plGrad)"/>
    <path d="${linePath}" fill="none" stroke="#b78bfa" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${circles}${xLabels}
  </svg>`;

  wrap.querySelectorAll('.pl-dot').forEach(dot => {
    dot.addEventListener('mouseenter', e => {
      const tip=document.getElementById('pl-tooltip'), v=parseFloat(dot.dataset.net);
      if(!tip) return;
      tip.innerHTML = `${dot.dataset.label} &nbsp;<strong>${v>=0?'+':''}${formatCurrency(v)}</strong>`;
      tip.style.display='block'; _moveTip(tip,e);
    });
    dot.addEventListener('mousemove', e => _moveTip(document.getElementById('pl-tooltip'),e));
    dot.addEventListener('mouseleave', () => { const t=document.getElementById('pl-tooltip'); if(t) t.style.display='none'; });
  });
}
function _moveTip(tip, e) { if(tip){tip.style.left=(e.clientX+14)+'px';tip.style.top=(e.clientY-38)+'px';} }

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
