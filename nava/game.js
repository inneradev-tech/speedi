(() => {
'use strict';

// ---------------------------------------------------------------- helpers
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const faNum = n => Math.round(n).toLocaleString('fa-IR');
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return [c, c.getContext('2d')]; };
function rrect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// ---------------------------------------------------------------- notation parser
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACC = { '#': 1, b: -1, k: -0.5, s: 0.5, '': 0 };
function parsePitch(s) {
  const m = /^([A-Ga-g])(#|b|k|s)?(\d)$/.exec(s);
  if (!m) return NaN;
  return 12 * (+m[3] + 1) + SEMI[m[1].toUpperCase()] + ACC[m[2] || ''];
}
function parseDur(s) {
  if (s === undefined || s === '') return 1;
  if (s.includes('/')) { const [a, b] = s.split('/').map(Number); return a / b; }
  return Number(s);
}
// Returns { events, error } where events = [{ notes: [midi], dur } | { rest: true, dur }]
function parseSong(text) {
  const toks = text.replace(/[|،,]/g, ' ').split(/\s+/).filter(Boolean);
  const events = [];
  for (const tok of toks) {
    const [head, d] = tok.split(':');
    const dur = parseDur(d);
    if (!(dur > 0) || dur > 16) return { error: tok };
    if (head === 'r' || head === '-') { events.push({ rest: true, dur }); continue; }
    const notes = head.split('+').map(parsePitch);
    if (!notes.length || notes.some(n => !isFinite(n) || n < 21 || n > 108)) return { error: tok };
    events.push({ notes, dur });
  }
  if (!events.some(e => !e.rest)) return { error: '' };
  return { events };
}

// ---------------------------------------------------------------- canvas & layout
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
let W = 0, H = 0, dpr = 1;
const COLS = 4;
const B = { x: 0, w: 0, colW: 0, rowH: 0 };
const START_ROW = 1; // first tile sits one row above the bottom edge
let bgC = null;

function resize() {
  W = window.innerWidth; H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  B.w = Math.min(W, H * 0.62);
  B.x = (W - B.w) / 2;
  B.colW = B.w / COLS;
  B.rowH = H / 4;
  buildBg();
}

// ---------------------------------------------------------------- themes & background patterns
const THEMES = {
  classic: { bg1: '#0d0f1c', bg2: '#1b1f38', line: 'rgba(214,181,110,.16)', tile1: '#11131c', tile2: '#2a2e40', edge: '#d6b56e', hit: '#d6b56e', text: '#f4ead2' },
  iranian: { bg1: '#06162e', bg2: '#0c2b52', line: 'rgba(64,208,200,.16)', tile1: '#0a2a5c', tile2: '#15468a', edge: '#e2b951', hit: '#40d0c8', text: '#f4ead2' },
};
let theme = THEMES.classic;

// Eight-point star (khatam) lattice for Iranian songs; faint staff lines for classical ones.
function buildBg() {
  const [c, g] = mk(W * dpr, H * dpr);
  g.scale(dpr, dpr);
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, theme.bg2); grd.addColorStop(1, theme.bg1);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.strokeStyle = theme.line; g.lineWidth = 1;
  if (theme === THEMES.iranian) {
    const s = 64;
    for (let y = -s; y < H + s; y += s) for (let x = -s; x < W + s; x += s) {
      const cx = x + (Math.floor(y / s) % 2 ? s / 2 : 0), cy = y;
      g.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU - Math.PI / 2, r = i % 2 ? s * 0.2 : s * 0.34;
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.closePath(); g.stroke();
      g.beginPath(); g.arc(cx, cy, s * 0.08, 0, TAU); g.stroke();
    }
  } else {
    for (let k = 0; k < 4; k++) {
      const y0 = H * (0.15 + k * 0.22);
      for (let l = 0; l < 5; l++) { g.beginPath(); g.moveTo(0, y0 + l * 9); g.lineTo(W, y0 + l * 9); g.stroke(); }
    }
  }
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  bgC = c;
}

// ---------------------------------------------------------------- game state
let mode = 'menu'; // menu | loading | ready | play | fail | over | pause
let song = null, events = [], unit = 1, firstLapTiles = 0;
let tiles = [], nextIdx = 0, genRow = 0, genEvent = 0, genLap = 1, lastCol = -1;
let pos = 0, baseSpeed = 3, speedMul = 1, score = 0, lap = 1, failT = 0, fail = null;
let t = 0, ripples = [], menuTiles = [];
let best = store.get('nava.best', {});
let mine = store.get('nava.mine', []);

const allSongs = () => SONGS.concat(mine.map(s => ({ ...s, cat: 'mine' })));
const rowsFor = dur => clamp(dur / unit, 1, 2);
const restRows = dur => Math.min(2, dur / unit);
const ACC_VEL = 0.42;

// Give each melody note its slice of the accompaniment: every accompaniment note belongs to the
// melody note sounding when it starts, with an offset in beats. On tap those notes are scheduled
// relative to the tap, stretched to the time the player actually has until the next tile.
function buildTiming(acc) {
  let t0 = 0;
  for (const e of events) { e.t0 = t0; t0 += e.dur; }
  const total = t0;
  const notes = events.filter(e => !e.rest);
  notes.forEach((e, i) => {
    const next = notes[i + 1];
    e.beats = (next ? next.t0 : total + notes[0].t0) - e.t0;
    let rows = rowsFor(e.dur);
    for (let j = events.indexOf(e) + 1; j < events.length && events[j].rest; j++) rows += restRows(events[j].dur);
    e.rows = rows;
    e.acc = [];
  });
  if (!acc) return;
  let at = 0, k = 0;
  for (const a of acc) {
    if (!a.rest) {
      while (k + 1 < notes.length && notes[k + 1].t0 <= at + 1e-9) k++;
      const owner = notes[k];
      owner.acc.push({ off: Math.max(0, at - owner.t0), notes: a.notes });
    }
    at += a.dur;
  }
}
const speedNow = () => baseSpeed * speedMul * (1 + Math.min(0.6, score * 0.0035));

function genTiles(untilRow) {
  while (genRow < untilRow) {
    if (genEvent >= events.length) {
      genEvent = 0; genLap++;
      tiles.push({ marker: genLap, b: genRow });
      genRow += 0.6;
    }
    const e = events[genEvent++];
    if (e.rest) { genRow += restRows(e.dur); continue; }
    let col;
    do { col = (Math.random() * COLS) | 0; } while (col === lastCol);
    lastCol = col;
    const h = rowsFor(e.dur);
    tiles.push({ col, b: genRow, h, notes: e.notes, ev: e, tapped: false, tt: 0, lap: genLap });
    genRow += h;
  }
}

// tile screen rect: bottom at H - rowH*START_ROW - (b - pos)*rowH
const tileBottom = tl => H - B.rowH * START_ROW - (tl.b - pos) * B.rowH;
const nextTile = () => { while (nextIdx < tiles.length && (tiles[nextIdx].marker || tiles[nextIdx].tapped)) nextIdx++; return tiles[nextIdx]; };

// ---------------------------------------------------------------- UI
const $ = id => document.getElementById(id);
const ui = {
  menu: $('menu'), list: $('songList'), tabs: document.querySelectorAll('.tab'), addBtn: $('btnAdd'),
  hud: $('hud'), btnBack: $('btnBack'), score: $('score'), progFill: $('progFill'), progStars: document.querySelectorAll('#prog .st'), btnSound: $('btnSound'),
  pause: $('pause'), btnResume: $('btnResume'), btnQuit: $('btnQuit'),
  over: $('over'), overTitle: $('overTitle'), overScore: $('overScore'), overStars: $('overStars'), overBest: $('overBest'), newBest: $('newBest'),
  btnRetry: $('btnRetry'), btnSongs: $('btnSongs'),
  loading: $('loading'), loadBar: $('loadBar'),
  editor: $('editor'), edTitle: $('edTitle'), edNotes: $('edNotes'), edSpeed: $('edSpeed'), edErr: $('edErr'),
  edInst: document.querySelectorAll('[data-inst]'), btnPreview: $('btnPreview'), btnSave: $('btnSave'), btnCancel: $('btnCancel'),
};
const show = (el, on) => { el.hidden = !on; };
let tab = store.get('nava.tab', 'classic');

const ICONS = {
  piano: '<svg viewBox="0 0 32 32"><rect x="3" y="7" width="26" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 7v18M16 7v18M22.5 7v18" stroke="currentColor" stroke-width="1.6"/><rect x="7.5" y="7" width="4" height="10" rx="1" fill="currentColor"/><rect x="14" y="7" width="4" height="10" rx="1" fill="currentColor"/><rect x="20.5" y="7" width="4" height="10" rx="1" fill="currentColor"/></svg>',
  santur: '<svg viewBox="0 0 32 32"><path d="M4 23 9 9h14l5 14z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 13h16M7 16.5h18M6 20h20" stroke="currentColor" stroke-width="1.2"/><path d="M11 4l4 7M21 4l-4 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};
const starsHtml = n => [0, 1, 2].map(i => `<span class="${i < n ? 'on' : ''}">★</span>`).join('');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderList() {
  ui.tabs.forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  show(ui.addBtn, tab === 'mine');
  const list = allSongs().filter(s => s.cat === tab);
  if (!list.length) {
    ui.list.innerHTML = `<p class="empty">هنوز آهنگی نساخته‌ای.<br>با دکمه‌ی «افزودن آهنگ» یک ملودی بنویس، مثلاً یک ترانه‌ی محلی ایرانی.</p>`;
    return;
  }
  ui.list.innerHTML = list.map(s => {
    const b = best[s.id] || { score: 0, stars: 0 };
    const lvl = s.level ? '<i class="lvl">' + '●'.repeat(s.level) + '<span class="off">' + '●'.repeat(3 - s.level) + '</span></i>' : '';
    return `<button class="song ${s.inst}" data-id="${esc(s.id)}">
      <span class="ic">${ICONS[s.inst] || ICONS.piano}</span>
      <span class="meta"><b>${esc(s.title)}</b><small>${esc(s.by || (s.inst === 'santur' ? 'سنتور' : 'پیانو'))} ${lvl}</small></span>
      <span class="res"><span class="stars">${starsHtml(b.stars)}</span><small>${b.score ? faNum(b.score) : ''}</small></span>
      ${s.cat === 'mine' ? `<span class="del" data-del="${esc(s.id)}" aria-label="حذف">×</span>` : ''}
    </button>`;
  }).join('');
}

ui.tabs.forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; store.set('nava.tab', tab); renderList(); }));
ui.list.addEventListener('click', e => {
  const del = e.target.closest('[data-del]');
  if (del) {
    e.stopPropagation();
    const s = mine.find(m => m.id === del.dataset.del);
    if (s && confirm(`«${s.title}» حذف شود؟`)) { mine = mine.filter(m => m !== s); store.set('nava.mine', mine); renderList(); }
    return;
  }
  const card = e.target.closest('.song');
  if (card) startSong(allSongs().find(s => s.id === card.dataset.id));
});

function syncSound() { ui.btnSound.classList.toggle('muted', !Sound.enabled); }
ui.btnSound.addEventListener('click', () => { Sound.toggle(); syncSound(); });
syncSound();

ui.btnBack.addEventListener('click', () => { if (mode === 'play') pauseGame(); else if (mode === 'ready') toMenu(); });
ui.btnResume.addEventListener('click', resumeGame);
ui.btnQuit.addEventListener('click', toMenu);
ui.btnRetry.addEventListener('click', () => startSong(song));
ui.btnSongs.addEventListener('click', toMenu);

// ---------------------------------------------------------------- flow
async function startSong(s) {
  if (!s) return;
  Sound.init();
  song = s;
  const parsed = parseSong(s.notes);
  if (parsed.error !== undefined) return;
  events = parsed.events;
  unit = Math.min(...events.filter(e => !e.rest).map(e => e.dur));
  const acc = s.accomp ? parseSong(s.accomp).events : null;
  buildTiming(acc);
  theme = s.inst === 'santur' ? THEMES.iranian : THEMES.classic;
  buildBg();
  show(ui.menu, false); show(ui.over, false); show(ui.pause, false);
  mode = 'loading';
  show(ui.loading, true);
  ui.loadBar.style.transform = 'scaleX(0)';
  const midis = events.concat(acc || []).flatMap(e => e.notes || []);
  await Sound.preload(s.inst, midis, p => { ui.loadBar.style.transform = `scaleX(${p})`; });
  show(ui.loading, false);
  tiles = []; nextIdx = 0; genRow = 0; genEvent = 0; genLap = 1; lastCol = -1;
  pos = 0; score = 0; lap = 1; speedMul = 1; fail = null; ripples = [];
  baseSpeed = (s.speed || 3) * (H > W ? 1 : 0.95);
  genTiles(12);
  firstLapTiles = events.filter(e => !e.rest).length;
  hudScore = -1; hudProg = -1;
  mode = 'ready';
  show(ui.hud, true);
}

function toMenu() {
  mode = 'menu';
  Sound.cancelPending();
  show(ui.hud, false); show(ui.over, false); show(ui.pause, false); show(ui.loading, false);
  show(ui.menu, true);
  theme = THEMES[tab === 'iranian' ? 'iranian' : 'classic'];
  buildBg();
  renderList();
}

function pauseGame() { if (mode !== 'play') return; mode = 'pause'; Sound.cancelPending(); show(ui.pause, true); }
function resumeGame() {
  if (mode !== 'pause') return;
  show(ui.pause, false);
  Sound.resume();
  mode = 'play';
}

const starsFor = () => Math.min(3, Math.floor((3 * score) / firstLapTiles + 1e-9));

function triggerFail(kind, tile, x, y) {
  mode = 'fail'; failT = 0;
  fail = { kind, tile, x, y, fromPos: pos, toPos: pos };
  // scroll back so the missed tile sits just above the bottom edge
  if (kind === 'miss') fail.toPos = tile.b + START_ROW - 0.3;
  Sound.fail();
  if (navigator.vibrate) navigator.vibrate([50, 40, 80]);
}

function finishRun() {
  mode = 'over';
  const stars = starsFor();
  const prev = best[song.id] || { score: 0, stars: 0 };
  const isBest = score > prev.score;
  best[song.id] = { score: Math.max(prev.score, score), stars: Math.max(prev.stars, stars) };
  store.set('nava.best', best);
  ui.overTitle.textContent = stars >= 3 ? (lap > 2 ? 'استادانه!' : 'آفرین!') : stars > 0 ? 'خوب بود!' : 'دوباره امتحان کن';
  ui.overScore.textContent = faNum(score);
  ui.overStars.innerHTML = starsHtml(stars) + (lap > 1 ? `<em>دور ${faNum(lap)}</em>` : '');
  ui.overBest.textContent = faNum(best[song.id].score);
  show(ui.newBest, isBest && score > 0);
  show(ui.hud, false); show(ui.over, true);
  ui.btnRetry.disabled = true;
  setTimeout(() => { ui.btnRetry.disabled = false; }, 500);
}

// ---------------------------------------------------------------- input
canvas.addEventListener('pointerdown', e => {
  if (mode !== 'play' && mode !== 'ready') return;
  const x = e.clientX, y = e.clientY;
  if (x < B.x || x > B.x + B.w) return;
  const col = Math.floor((x - B.x) / B.colW);
  const tl = nextTile();
  if (!tl) return;
  const bottom = tileBottom(tl), top = bottom - tl.h * B.rowH;
  const slop = B.rowH * 0.3;
  if (col === tl.col && y >= top - slop && y <= bottom + slop) {
    hit(tl, x, y);
  } else {
    // ignore taps on tiles already played
    for (const o of tiles) {
      if (o.marker || !o.tapped || o.col !== col) continue;
      const ob = tileBottom(o);
      if (y <= ob && y >= ob - o.h * B.rowH) return;
    }
    if (mode === 'ready') return;
    triggerFail('wrong', null, x, y);
  }
});

function hit(tl, x, y) {
  tl.tapped = true; tl.tt = 0;
  score++;
  if (tl.lap > lap) { lap = tl.lap; speedMul = Math.pow(1.14, lap - 1); Sound.chime(song.inst, [tl.notes[0] + 12]); }
  Sound.cancelPending();
  Sound.play(song.inst, tl.notes, 0.95, tl.ev.acc.length ? 0.8 : 0.62);
  if (tl.ev.acc.length) {
    const secPerBeat = (tl.ev.rows / speedNow()) / tl.ev.beats;
    for (const a of tl.ev.acc) Sound.playAt(song.inst, a.notes, ACC_VEL, a.off * secPerBeat);
  }
  ripples.push({ x, y, t: 0, col: tl.col });
  if (mode === 'ready') mode = 'play';
  nextIdx++;
}

window.addEventListener('keydown', e => {
  if ((mode === 'play' || mode === 'ready') && ['KeyD', 'KeyF', 'KeyJ', 'KeyK'].includes(e.code)) {
    const col = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'].indexOf(e.code);
    const tl = nextTile();
    if (!tl) return;
    const bottom = tileBottom(tl);
    if (col === tl.col) hit(tl, B.x + (col + 0.5) * B.colW, bottom - B.rowH * 0.5);
    else if (mode === 'play') triggerFail('wrong', null, B.x + (col + 0.5) * B.colW, bottom - B.rowH * 0.5);
    e.preventDefault();
  } else if (e.code === 'Escape') {
    if (mode === 'play') pauseGame(); else if (mode === 'pause') resumeGame();
  } else if (e.code === 'Space' && mode === 'over' && !ui.btnRetry.disabled) { startSong(song); e.preventDefault(); }
});

// ---------------------------------------------------------------- editor (my songs)
let edInst = 'santur', previewTimer = null;
function openEditor() {
  ui.edTitle.value = ''; ui.edNotes.value = ''; ui.edSpeed.value = 3; ui.edErr.textContent = '';
  setInst('santur');
  show(ui.editor, true);
}
function setInst(i) { edInst = i; ui.edInst.forEach(b => b.classList.toggle('on', b.dataset.inst === i)); }
ui.edInst.forEach(b => b.addEventListener('click', () => setInst(b.dataset.inst)));
ui.addBtn.addEventListener('click', openEditor);
ui.btnCancel.addEventListener('click', () => { stopPreview(); show(ui.editor, false); });

function validate() {
  const p = parseSong(ui.edNotes.value);
  if (p.error !== undefined) {
    ui.edErr.textContent = p.error ? `این بخش را نفهمیدم: «${p.error}»` : 'دست‌کم یک نُت بنویس.';
    return null;
  }
  ui.edErr.textContent = '';
  return p.events;
}
function stopPreview() { clearTimeout(previewTimer); previewTimer = null; ui.btnPreview.textContent = 'شنیدن'; }
ui.btnPreview.addEventListener('click', async () => {
  if (previewTimer) { stopPreview(); return; }
  const ev = validate();
  if (!ev) return;
  Sound.init();
  ui.btnPreview.textContent = '…';
  await Sound.preload(edInst, ev.flatMap(e => e.notes || []));
  const u = Math.min(...ev.map(e => e.dur));
  const secPerUnit = 1 / (+ui.edSpeed.value || 3);
  let i = 0;
  ui.btnPreview.textContent = 'توقف';
  const step = () => {
    if (i >= ev.length) { stopPreview(); return; }
    const e = ev[i++];
    if (!e.rest) Sound.play(edInst, e.notes);
    previewTimer = setTimeout(step, (e.dur / u) * secPerUnit * 1000);
  };
  step();
});
ui.btnSave.addEventListener('click', () => {
  const ev = validate();
  if (!ev) return;
  const title = ui.edTitle.value.trim() || 'آهنگ من';
  mine.push({ id: 'u' + Date.now(), title, inst: edInst, speed: clamp(+ui.edSpeed.value || 3, 1.5, 6), notes: ui.edNotes.value.trim(), by: edInst === 'santur' ? 'سنتور · ساخته‌ی شما' : 'پیانو · ساخته‌ی شما' });
  store.set('nava.mine', mine);
  stopPreview();
  show(ui.editor, false);
  renderList();
});

// ---------------------------------------------------------------- update
function update(dt) {
  t += dt;
  for (const r of ripples) r.t += dt;
  ripples = ripples.filter(r => r.t < 0.5);
  for (const tl of tiles) if (tl.tapped) tl.tt += dt;

  if (mode === 'play') {
    pos += speedNow() * dt;
    genTiles(pos + 10);
    const tl = nextTile();
    // missed: the tile slid half-way off the bottom untapped
    if (tl && tileBottom(tl) - tl.h * B.rowH * 0.5 > H) triggerFail('miss', tl);
    // drop tiles that are long gone
    let cut = 0;
    while (cut < nextIdx && tileBottom(tiles[cut]) - (tiles[cut].h || 0) * B.rowH > H + B.rowH) cut++;
    if (cut > 16) { tiles.splice(0, cut); nextIdx -= cut; }
  } else if (mode === 'fail') {
    failT += dt;
    if (fail.kind === 'miss') {
      const k = Math.min(1, failT / 0.35);
      pos = lerp(fail.fromPos, fail.toPos, 1 - Math.pow(1 - k, 3));
    }
    if (failT > 1.3) finishRun();
  } else if (mode === 'menu') {
    if (Math.random() < dt * 1.6) menuTiles.push({ col: (Math.random() * COLS) | 0, y: -B.rowH, v: rand(60, 110), h: Math.random() < 0.3 ? 2 : 1 });
    for (const m of menuTiles) m.y += m.v * dt;
    menuTiles = menuTiles.filter(m => m.y < H + B.rowH);
  }
}
// ---------------------------------------------------------------- render
function drawTile(x, y, w, h, tl, alpha) {
  const pad = 1.5;
  ctx.globalAlpha = alpha;
  const grd = ctx.createLinearGradient(0, y, 0, y + h);
  grd.addColorStop(0, theme.tile2); grd.addColorStop(1, theme.tile1);
  ctx.fillStyle = grd;
  rrect(ctx, x + pad, y + pad, w - pad * 2, h - pad * 2, 8); ctx.fill();
  ctx.strokeStyle = theme.edge; ctx.globalAlpha = alpha * 0.55; ctx.lineWidth = 1.2;
  rrect(ctx, x + pad + 3, y + pad + 3, w - pad * 2 - 6, h - pad * 2 - 6, 6); ctx.stroke();
  ctx.globalAlpha = alpha * 0.12; ctx.fillStyle = '#fff';
  rrect(ctx, x + pad + 4, y + pad + 4, w - pad * 2 - 8, Math.min(18, h * 0.2), 5); ctx.fill();
  if (theme === THEMES.iranian) {
    ctx.globalAlpha = alpha * 0.5; ctx.strokeStyle = theme.edge; ctx.lineWidth = 1;
    const cx = x + w / 2, cy = y + h - Math.min(h, B.rowH) / 2, s = Math.min(w, B.rowH) * 0.16;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU - Math.PI / 2, r = i % 2 ? s * 0.55 : s; i ? ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    ctx.closePath(); ctx.stroke();
  }
  if (tl && tl.h > 1.01) {
    ctx.globalAlpha = alpha * 0.35; ctx.strokeStyle = theme.edge; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + B.rowH * 0.3); ctx.lineTo(x + w / 2, y + h - B.rowH * 0.7); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.drawImage(bgC, 0, 0, W, H);

  // lanes
  ctx.fillStyle = 'rgba(255,255,255,.025)';
  ctx.fillRect(B.x, 0, B.w, H);
  ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1;
  for (let i = 0; i <= COLS; i++) { const x = Math.round(B.x + i * B.colW) + 0.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }

  if (mode === 'menu') {
    for (const m of menuTiles) drawTile(B.x + m.col * B.colW, m.y, B.colW, B.rowH * m.h, null, 0.35);
    return;
  }
  if (mode === 'loading') return;

  for (const tl of tiles) {
    const bottom = tileBottom(tl);
    if (tl.marker) {
      if (bottom < -20 || bottom > H + 20) continue;
      ctx.fillStyle = theme.edge; ctx.globalAlpha = 0.8;
      ctx.font = `800 ${Math.round(B.rowH * 0.13)}px Vazirmatn, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`دور ${faNum(tl.marker)} · سریع‌تر`, B.x + B.w / 2, bottom - B.rowH * 0.3);
      ctx.globalAlpha = 1;
      continue;
    }
    const h = tl.h * B.rowH, top = bottom - h;
    if (bottom < 0 || top > H) continue;
    const x = B.x + tl.col * B.colW;
    if (tl.tapped) {
      const a = Math.max(0, 0.55 - tl.tt * 0.9);
      ctx.globalAlpha = a; ctx.fillStyle = theme.hit;
      rrect(ctx, x + 2, top + 2, B.colW - 4, h - 4, 8); ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    let alpha = 1;
    if (fail && fail.tile === tl) {
      const blink = Math.sin(failT * 22) > 0;
      drawTile(x, top, B.colW, h, tl, 1);
      if (blink) { ctx.globalAlpha = 0.7; ctx.fillStyle = '#e8384f'; rrect(ctx, x + 2, top + 2, B.colW - 4, h - 4, 8); ctx.fill(); ctx.globalAlpha = 1; }
      continue;
    }
    drawTile(x, top, B.colW, h, tl, alpha);
    if (mode === 'ready' && tl === tiles.find(o => !o.marker)) {
      ctx.fillStyle = theme.text;
      ctx.font = `900 ${Math.round(Math.min(B.colW * 0.24, 24))}px Vazirmatn, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.75 + Math.sin(t * 5) * 0.25;
      ctx.fillText('شروع', x + B.colW / 2, bottom - B.rowH / 2);
      ctx.globalAlpha = 1;
    }
  }

  // wrong tap
  if (fail && fail.kind === 'wrong') {
    const col = Math.floor((fail.x - B.x) / B.colW);
    const blink = Math.sin(failT * 22) > 0;
    ctx.globalAlpha = blink ? 0.75 : 0.35; ctx.fillStyle = '#e8384f';
    rrect(ctx, B.x + col * B.colW + 2, fail.y - B.rowH / 2 + 2, B.colW - 4, B.rowH - 4, 8); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ripples
  for (const r of ripples) {
    const k = r.t / 0.5;
    ctx.globalAlpha = (1 - k) * 0.6; ctx.strokeStyle = theme.hit; ctx.lineWidth = 3 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(r.x, r.y, 10 + k * B.colW * 0.6, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- HUD
let hudScore = -1, hudProg = -1;
function updateHud() {
  if (mode !== 'play' && mode !== 'ready' && mode !== 'fail') return;
  if (score !== hudScore) { hudScore = score; ui.score.textContent = faNum(score); }
  const prog = Math.min(1, score / firstLapTiles);
  if (prog !== hudProg) {
    hudProg = prog;
    ui.progFill.style.transform = `scaleX(${prog})`;
    ui.progStars.forEach((s, i) => s.classList.toggle('on', prog >= (i + 1) / 3 - 1e-9));
  }
}

// ---------------------------------------------------------------- lifecycle
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (mode === 'play') pauseGame(); Sound.suspend(); }
  else Sound.resume();
});
window.addEventListener('resize', resize);
window.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('touchmove', e => { if (!e.target.closest('.scroll, textarea')) e.preventDefault(); }, { passive: false });

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt <= 0) return;
  if (mode !== 'pause') update(dt);
  render();
  updateHud();
}

resize();
toMenu();
requestAnimationFrame(frame);
})();
