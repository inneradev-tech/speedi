(() => {
'use strict';

// ---------------------------------------------------------------- helpers
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const TAU = Math.PI * 2;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};
const faNum = n => Math.round(n).toLocaleString('fa-IR');
const mk = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return [c, c.getContext('2d')];
};
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------- canvas
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
let W = 0, H = 0, dpr = 1, dprCap = Math.min(window.devicePixelRatio || 1, 2), zoom = 1;
let darkC, darkG, darkScale = 0.5;
const TILE = 240;
let tileC = null;

function resize() {
  W = window.innerWidth; H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  zoom = clamp(Math.min(W, H) / 330, 1, 2.4);
  [darkC, darkG] = mk(W * dpr * darkScale, H * dpr * darkScale);
  buildGround();
}

// ---------------------------------------------------------------- drawing primitives (current ctx = g)
let g = ctx;
let FL = 0; // hit-flash amount; >0 paints bodies white
const col = c => (FL > 0.5 ? '#ffffff' : c);
function ell(x, y, rx, ry, c) { g.fillStyle = col(c); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }
function circ(x, y, r, c) { g.fillStyle = col(c); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function rr(x, y, w, h, r, c) {
  r = Math.min(r, w / 2, h / 2);
  g.fillStyle = col(c);
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill();
}
function limb(x1, y1, x2, y2, w, c) {
  g.strokeStyle = col(c); g.lineWidth = w; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
}
function poly(pts, c) {
  g.fillStyle = col(c); g.beginPath();
  for (let i = 0; i < pts.length; i += 2) (i ? g.lineTo(pts[i], pts[i + 1]) : g.moveTo(pts[i], pts[i + 1]));
  g.closePath(); g.fill();
}
function shadow(rx, ry, a = 0.45) { g.fillStyle = `rgba(0,0,0,${a})`; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill(); }

// ---------------------------------------------------------------- characters
// All characters are drawn at the origin (feet), facing +x, about 60 units tall.
function leg(hx, hy, len, ang, w, pants, shoe) {
  const fx = hx + Math.sin(ang) * len, fy = hy + Math.cos(ang) * len;
  limb(hx, hy, fx, fy, w, pants);
  ell(fx + 2, fy + 1, w * 0.75, w * 0.45, shoe);
}

function drawSurvivor(p) {
  const m = p.moveAmt, w = p.walk;
  const bob = Math.abs(Math.sin(w)) * 2.2 * m;
  shadow(15, 5);
  // legs
  leg(-3, -18, 16, Math.sin(w + Math.PI) * 0.55 * m, 6.5, '#232b42', '#121318');
  leg(3, -18, 16, Math.sin(w) * 0.55 * m, 6.5, '#2d3756', '#17181e');
  g.save();
  g.translate(0, -bob);
  // backpack
  rr(-17, -38, 10, 19, 4, '#4f5d34');
  rr(-17, -38, 4, 19, 3, '#3d4828');
  rr(-16, -27, 8, 5, 2, '#5f6e40');
  // torso (jacket)
  rr(-10, -38, 21, 23, 8, '#e0702a');
  rr(-10, -38, 7, 23, 6, '#b8561c');
  rr(3, -37, 7, 21, 6, '#f08a3e');
  limb(4, -36, 4, -17, 1.4, '#7a3510');
  rr(-10, -20, 21, 5, 2.5, '#9c4515');
  // head
  const hx = 2, hy = -50;
  circ(hx - 7, hy + 1, 3.2, '#d39a74');
  circ(hx, hy, 13.5, '#f2c39a');
  ell(hx - 4, hy + 8, 6, 3, '#e8b58c');
  // hair
  g.fillStyle = col('#3e2616');
  g.beginPath();
  g.arc(hx, hy - 1, 14, Math.PI * 0.95, Math.PI * 2.05);
  g.lineTo(hx + 13, hy - 3);
  g.lineTo(hx + 9, hy - 6);
  g.lineTo(hx + 6, hy - 3);
  g.lineTo(hx + 2, hy - 7);
  g.lineTo(hx - 3, hy - 4);
  g.lineTo(hx - 12, hy + 3);
  g.closePath(); g.fill();
  // headband + tails
  const flap = Math.sin(p.t * 12) * 3 * (0.4 + m);
  poly([hx - 13, hy - 5, hx - 22, hy - 9 + flap, hx - 21, hy - 5 + flap, hx - 13, hy - 2], '#b8232b');
  poly([hx - 13, hy - 3, hx - 20, hy + 1 + flap * 0.7, hx - 18, hy + 3 + flap * 0.7, hx - 12, hy - 1], '#9c1c23');
  g.save(); g.beginPath(); g.arc(hx, hy, 13.6, 0, TAU); g.clip();
  rr(hx - 15, hy - 8, 30, 4.5, 1, '#d6333a');
  g.restore();
  // face
  ell(hx + 7, hy + 1, 2, 2.8, '#1c1512');
  circ(hx + 7.6, hy, 0.8, '#ffffff');
  limb(hx + 5, hy - 3.5, hx + 9.5, hy - 3, 1.3, '#3e2616');
  ell(hx + 4, hy + 5.5, 2.5, 1.3, '#f0a08a');
  limb(hx + 9, hy + 7.5, hx + 12, hy + 7, 1.2, '#8a4a3a');
  g.restore();
}

function drawGun(p, ang, flash) {
  // drawn in the character's (possibly mirrored) space, around the shoulder
  g.save();
  g.translate(1, -30 - Math.abs(Math.sin(p.walk)) * 2.2 * p.moveAmt);
  g.rotate(ang);
  limb(0, 0, 11, 1, 6.5, '#e0702a');
  circ(12, 1.5, 3.2, '#f2c39a');
  rr(8, -2, 19, 6, 2, '#23262d');
  rr(10, -3, 12, 3, 1.5, '#3a3f4a');
  rr(11, 3, 4, 7, 1.5, '#1a1c21');
  rr(18, 3, 3, 5, 1, '#1a1c21');
  limb(10, -1.8, 25, -1.8, 1, '#6d7585');
  if (flash > 0) {
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = flash;
    const s = 0.7 + Math.random() * 0.5;
    g.fillStyle = '#ffd36b';
    g.beginPath();
    g.moveTo(27, 1);
    g.lineTo(34 * s + 4, -5 * s); g.lineTo(33, 1); g.lineTo(34 * s + 4, 7 * s);
    g.closePath(); g.fill();
    g.fillStyle = '#fff6d8';
    g.beginPath(); g.arc(29, 1, 3.5 * s, 0, TAU); g.fill();
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }
  g.restore();
}

const ZSKIN = {
  walker: [['#8fb56a', '#6f9150', '#5a7a40'], ['#9dba7c', '#7b9a5d', '#627f48'], ['#a3b08a', '#838f6b', '#6a7555']],
  runner: [['#a4b4b3', '#7f908f', '#667473'], ['#b0a9b8', '#8a8394', '#6f6879']],
  brute: [['#7d9a5a', '#627d44', '#4d6535']],
};
const ZSHIRT = ['#5d6b8a', '#7a4f4f', '#6b6b4f', '#4f6b63', '#6e5a7d', '#8a7a5a'];

function zombieHead(z, hx, hy, r, sk, pass) {
  if (pass === 'eyes') {
    g.fillStyle = z.type === 'walker' ? 'rgba(255,225,90,1)' : 'rgba(255,70,50,1)';
    const s = z.type === 'brute' ? 1.6 : 1.9;
    g.beginPath(); g.arc(hx + r * 0.55, hy - r * 0.05, s, 0, TAU); g.fill();
    g.beginPath(); g.arc(hx + r * 0.1, hy - r * 0.08, s * 0.8, 0, TAU); g.fill();
    return;
  }
  circ(hx, hy, r, sk[0]);
  ell(hx - r * 0.3, hy + r * 0.35, r * 0.7, r * 0.45, sk[1]);
  // hair tufts / scalp
  if (z.type === 'brute') {
    limb(hx - r * 0.6, hy - r * 0.5, hx + r * 0.2, hy - r * 0.9, 1.2, '#3a2a22');
    for (let i = 0; i < 4; i++) limb(hx - r * 0.5 + i * 3, hy - r * 0.8 + i * 0.3, hx - r * 0.5 + i * 3 + 0.5, hy - r * 0.5 + i * 0.3, 1, '#3a2a22');
  } else {
    g.fillStyle = col(z.hair);
    g.beginPath();
    g.arc(hx - 1, hy - 2, r * 0.98, Math.PI * 1.05, Math.PI * 1.75);
    g.lineTo(hx + r * 0.2, hy - r * 0.45);
    g.lineTo(hx - r * 0.2, hy - r * 0.2);
    g.lineTo(hx - r * 0.6, hy - r * 0.35);
    g.closePath(); g.fill();
  }
  // eye sockets
  ell(hx + r * 0.55, hy - r * 0.05, r * 0.26, r * 0.3, '#2a1a14');
  ell(hx + r * 0.1, hy - r * 0.08, r * 0.2, r * 0.26, '#2a1a14');
  // mouth with teeth
  g.fillStyle = col('#2b0d0d');
  g.beginPath();
  g.moveTo(hx + r * 0.05, hy + r * 0.45);
  g.lineTo(hx + r * 0.85, hy + r * 0.35);
  g.lineTo(hx + r * 0.75, hy + r * 0.75 + z.jaw * r * 0.2);
  g.lineTo(hx + r * 0.15, hy + r * 0.7 + z.jaw * r * 0.2);
  g.closePath(); g.fill();
  g.fillStyle = col('#e8e0c0');
  for (let i = 0; i < 3; i++) g.fillRect(hx + r * (0.2 + i * 0.2), hy + r * 0.42, r * 0.1, r * 0.12);
  // wound
  if (z.scar) { ell(hx - r * 0.35, hy - r * 0.2, r * 0.18, r * 0.12, '#7a1d1d'); }
}

function drawZombie(z, pass) {
  const w = z.walk, m = z.moveAmt, sk = z.skin;
  const bob = Math.abs(Math.sin(w)) * 2 * m;
  if (pass !== 'eyes') shadow(z.type === 'brute' ? 19 : 14, z.type === 'brute' ? 6 : 5);
  g.save();

  if (z.type === 'brute') {
    if (pass !== 'eyes') {
      leg(-5, -20, 17, Math.sin(w + Math.PI) * 0.35 * m, 10, '#2e3f5c', '#1a1a1a');
      leg(5, -20, 17, Math.sin(w) * 0.35 * m, 10, '#364a6b', '#1f1f1f');
    }
    g.translate(0, -bob);
    g.rotate(0.08);
    if (pass === 'eyes') { zombieHead(z, 5, -54, 11.5, sk, pass); g.restore(); return; }
    const reach = Math.sin(w * 0.5) * 2;
    limb(0, -40, 25, -31 + reach, 9, sk[2]);
    circ(26, -31 + reach, 6, sk[2]);
    rr(-18, -48, 34, 32, 13, sk[0]);
    rr(-18, -48, 10, 32, 9, sk[1]);
    rr(-14, -34, 28, 20, 8, '#3e5680');
    rr(-14, -34, 8, 20, 6, '#324668');
    limb(-8, -34, -8, -47, 3, '#3e5680');
    limb(8, -34, 8, -47, 3, '#3e5680');
    circ(-8, -34, 1.8, '#c9b37a'); circ(8, -34, 1.8, '#c9b37a');
    ell(4, -40, 3, 2, '#7a1d1d');
    zombieHead(z, 5, -54, 11.5, sk, pass);
    limb(2, -54 + 6, 10, -54 + 4, 1, '#3a2a22');
    limb(5, -38, 28, -27 - reach, 9.5, sk[0]);
    circ(29, -27 - reach, 6.5, sk[1]);
    g.restore();
    return;
  }

  const runner = z.type === 'runner';
  const lean = runner ? 0.32 : 0.14;
  const legSwing = runner ? 0.8 : 0.4;
  if (pass !== 'eyes') {
    leg(-3, -18, 16, Math.sin(w + Math.PI) * legSwing * m * (runner ? 1 : 0.6), 6, z.pants, '#1b1a18');
    leg(3, -18, 16, Math.sin(w) * legSwing * m, 6, shadeHex(z.pants, 12), '#23211e');
  }
  g.translate(0, -bob);
  g.translate(0, -18); g.rotate(lean); g.translate(0, 18);
  const hx = 5, hy = -49 + (runner ? 3 : 0);
  if (pass === 'eyes') { zombieHead(z, hx, hy, 12, sk, pass); g.restore(); return; }

  const sway = Math.sin(w * 0.5 + z.seed) * 3;
  // back arm
  if (runner) {
    const sw = Math.sin(w) * 10 * m;
    limb(0, -34, 8 - sw * 0.6, -22, 5, sk[2]);
    circ(8 - sw * 0.6, -22, 3.2, sk[2]);
  } else {
    limb(0, -35, 22, -33 + sway, 5.5, sk[2]);
    circ(23, -33 + sway, 3.4, sk[2]);
  }
  // torso
  rr(-10, -38, 20, 23, 7, z.shirt);
  rr(-10, -38, 6, 23, 5, shadeHex(z.shirt, -22));
  poly([-4, -20, 0, -26, 3, -21, 6, -24, 10, -18, 10, -15, -10, -15, -10, -19], sk[1]);
  ell(3, -30, 3.5, 2.6, '#6e1a1a');
  ell(-2, -26, 1.8, 1.4, '#6e1a1a');
  if (runner) { rr(-10, -38, 20, 5, 2, sk[0]); }
  // head
  zombieHead(z, hx, hy, 12, sk, pass);
  // front arm
  if (runner) {
    const sw = Math.sin(w + Math.PI) * 10 * m;
    limb(2, -34, 12 - sw * 0.6, -24, 5.5, sk[0]);
    circ(12 - sw * 0.6, -24, 3.4, sk[1]);
  } else {
    limb(3, -33, 24, -29 - sway, 6, sk[0]);
    circ(25, -29 - sway, 3.6, sk[1]);
    limb(25, -29 - sway, 29, -30 - sway, 1.5, sk[1]);
  }
  g.restore();
}

function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => clamp(v + amt, 0, 255);
  return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`;
}

// ---------------------------------------------------------------- scenery
function drawGrave(o) {
  shadow(15, 4, 0.5);
  if (o.v === 0) {
    rr(-11, -30, 22, 30, 3, '#555b69');
    g.fillStyle = '#6f7686';
    g.beginPath(); g.moveTo(-9, 0); g.lineTo(-9, -20); g.arc(0, -20, 9, Math.PI, 0); g.lineTo(9, 0); g.closePath(); g.fill();
    rr(-3.5, -24, 7, 1.8, 1, '#4a4f5b'); rr(-1, -27, 2, 8, 1, '#4a4f5b');
    rr(-6, -14, 12, 1.4, 0.7, '#4a4f5b'); rr(-5, -10, 10, 1.4, 0.7, '#4a4f5b');
  } else if (o.v === 1) {
    rr(-3.5, -34, 9, 34, 2, '#50566a');
    rr(-4, -34, 8, 34, 2, '#6a7184');
    rr(-11, -26, 22, 7, 2, '#6a7184');
    rr(-11, -21, 22, 2, 1, '#50566a');
  } else {
    g.save(); g.rotate(-0.18);
    rr(-10, -24, 20, 24, 4, '#4f5563');
    rr(-8, -24, 16, 24, 4, '#646b7b');
    rr(-5, -16, 10, 1.4, 0.7, '#474c58');
    g.restore();
  }
  ell(-6, -2, 5, 2, '#2f4a2a'); ell(5, -1, 4, 1.6, '#35532f');
  circ(-4, -18 + o.v, 1.5, '#4f6e3c'); circ(3, -9, 1.2, '#4f6e3c');
}

function drawTree(o) {
  shadow(26, 8, 0.45);
  g.strokeStyle = '#1f1916'; g.lineCap = 'round';
  const s = o.s;
  g.lineWidth = 11 * s;
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-4 * s, -40 * s, 3 * s, -80 * s); g.stroke();
  g.lineWidth = 3 * s; g.strokeStyle = '#2d2420';
  g.beginPath(); g.moveTo(2 * s, -4 * s); g.quadraticCurveTo(-1 * s, -40 * s, 4 * s, -76 * s); g.stroke();
  g.strokeStyle = '#1f1916';
  for (const [x1, y1, x2, y2, cx, cy, lw] of o.br) {
    g.lineWidth = lw * s;
    g.beginPath(); g.moveTo(x1 * s, y1 * s); g.quadraticCurveTo(cx * s, cy * s, x2 * s, y2 * s); g.stroke();
  }
  g.lineWidth = 4 * s;
  g.beginPath(); g.moveTo(-6 * s, -2 * s); g.lineTo(-14 * s, 2 * s); g.moveTo(5 * s, -1 * s); g.lineTo(13 * s, 3 * s); g.stroke();
}

function drawBush(o) {
  shadow(20, 6, 0.4);
  for (const [x, y, r, c] of o.b) circ(x, y, r, c);
}

function drawLamp() {
  shadow(10, 3.5, 0.5);
  rr(-5, -6, 10, 6, 2, '#1c1d24');
  rr(-2, -84, 4, 80, 2, '#262833');
  rr(-1, -84, 1.5, 80, 1, '#3a3d4c');
  rr(-7, -94, 14, 10, 3, '#262833');
  rr(-5, -92, 10, 7, 2, '#ffdca0');
  poly([-8, -94, 8, -94, 4, -99, -4, -99], '#1c1d24');
}

function drawPumpkin() {
  shadow(10, 3.5, 0.45);
  ell(-5, -8, 6, 8, '#c25a12'); ell(5, -8, 6, 8, '#c25a12'); ell(0, -8, 7, 8.5, '#e06d18');
  rr(-1.5, -19, 3, 5, 1, '#3d4a1f');
  poly([-6, -11, -3, -11, -4.5, -8], '#ffd35a'); poly([3, -11, 6, -11, 4.5, -8], '#ffd35a');
  poly([-5, -5, 5, -5, 3, -2, 0, -4, -3, -2], '#ffd35a');
}

function drawMedkit(p) {
  const bob = Math.sin(p.t * 3) * 2;
  shadow(9, 3, 0.4);
  g.translate(0, -8 + bob);
  rr(-9, -8, 18, 13, 3, '#f1f1f1');
  rr(-9, 1, 18, 4, 2, '#c9c9c9');
  rr(-2, -6, 4, 9, 1, '#d6333a'); rr(-5.5, -3.5, 11, 4, 1, '#d6333a');
  rr(-4, -11, 8, 3, 1.5, '#9a9a9a');
}

// ---------------------------------------------------------------- ground tile
function buildGround() {
  const s = zoom * dpr;
  const [c, tg] = mk(TILE * s, TILE * s);
  tg.scale(s, s);
  const r = seeded(7);
  tg.fillStyle = '#1a2319'; tg.fillRect(0, 0, TILE, TILE);
  const wrap = fn => { for (const ox of [-TILE, 0, TILE]) for (const oy of [-TILE, 0, TILE]) { tg.save(); tg.translate(ox, oy); fn(); tg.restore(); } };
  for (let i = 0; i < 14; i++) {
    const x = r() * TILE, y = r() * TILE, rx = 14 + r() * 30, ry = rx * (0.4 + r() * 0.3), c2 = r() < 0.5 ? 'rgba(40,34,24,.55)' : 'rgba(30,44,30,.6)';
    wrap(() => { tg.fillStyle = c2; tg.beginPath(); tg.ellipse(x, y, rx, ry, 0, 0, TAU); tg.fill(); });
  }
  for (let i = 0; i < 900; i++) {
    const x = r() * TILE, y = r() * TILE, l = 2 + r() * 4, lean = (r() - 0.5) * 3;
    const cc = ['#243322', '#2b3c27', '#1e2a1c', '#314530'][(r() * 4) | 0];
    wrap(() => { tg.strokeStyle = cc; tg.lineWidth = 0.8; tg.beginPath(); tg.moveTo(x, y); tg.lineTo(x + lean, y - l); tg.stroke(); });
  }
  for (let i = 0; i < 26; i++) {
    const x = r() * TILE, y = r() * TILE, rad = 0.8 + r() * 1.6;
    wrap(() => { tg.fillStyle = '#3a3f3a'; tg.beginPath(); tg.ellipse(x, y, rad * 1.3, rad, 0, 0, TAU); tg.fill(); tg.fillStyle = '#4c524b'; tg.beginPath(); tg.ellipse(x - 0.3, y - 0.3, rad * 0.7, rad * 0.5, 0, 0, TAU); tg.fill(); });
  }
  tileC = c;
}

// ---------------------------------------------------------------- light sprites
const LIGHT = (() => {
  const [c, lg] = mk(128, 128);
  const grd = lg.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(0.45, 'rgba(0,0,0,.8)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  lg.fillStyle = grd; lg.fillRect(0, 0, 128, 128);
  return c;
})();
const CONE = (() => {
  const [c, cg] = mk(256, 256);
  const grd = cg.createRadialGradient(0, 128, 0, 0, 128, 256);
  grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(0.6, 'rgba(0,0,0,.75)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  cg.fillStyle = grd;
  cg.beginPath(); cg.moveTo(0, 128); cg.arc(0, 128, 256, -0.42, 0.42); cg.closePath(); cg.fill();
  return c;
})();
const glowSprite = (r, gcol) => {
  const [c, gg] = mk(r * 2, r * 2);
  const grd = gg.createRadialGradient(r, r, 0, r, r, r);
  grd.addColorStop(0, gcol); grd.addColorStop(1, 'rgba(0,0,0,0)');
  gg.fillStyle = grd; gg.fillRect(0, 0, r * 2, r * 2);
  return c;
};
const GLOW_WARM = glowSprite(64, 'rgba(255,190,110,.55)');
const GLOW_ORANGE = glowSprite(64, 'rgba(255,140,40,.7)');
const GLOW_MUZZLE = glowSprite(64, 'rgba(255,210,120,.8)');
const GLOW_EYE_Y = glowSprite(16, 'rgba(255,220,90,.9)');
const GLOW_EYE_R = glowSprite(16, 'rgba(255,60,40,.9)');
const GLOW_RED = glowSprite(64, 'rgba(255,60,60,.5)');

// ---------------------------------------------------------------- world decor (procedural chunks)
const CHUNK = 360;
const chunks = new Map();
function chunkAt(cx, cy) {
  const key = cx + ',' + cy;
  let ch = chunks.get(key);
  if (ch) return ch;
  const r = seeded((cx * 73856093) ^ (cy * 19349663) ^ 0x5bd1e995);
  ch = [];
  const n = 2 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const x = cx * CHUNK + r() * CHUNK, y = cy * CHUNK + r() * CHUNK;
    if (Math.hypot(x, y) < 90) continue;
    const k = r();
    if (k < 0.42) ch.push({ k: 'grave', x, y, v: Math.floor(r() * 3) });
    else if (k < 0.6) {
      const br = [];
      for (let b = 0; b < 4; b++) {
        const y1 = -45 - b * 9, side = b % 2 ? 1 : -1;
        br.push([1, y1, side * (18 + r() * 14), y1 - 18 - r() * 16, side * 8, y1 - 16, 4 - b * 0.6]);
      }
      ch.push({ k: 'tree', x, y, s: 0.9 + r() * 0.4, br });
    } else if (k < 0.8) {
      const b = [];
      for (let j = 0; j < 7; j++) b.push([(r() - 0.5) * 26, -6 - r() * 12, 6 + r() * 6, ['#16281a', '#1c3321', '#223d27'][j % 3]]);
      b.sort((p, q) => p[1] - q[1]);
      ch.push({ k: 'bush', x, y, b });
    } else if (k < 0.9) ch.push({ k: 'lamp', x, y, light: true });
    else if (k < 0.96) ch.push({ k: 'pumpkin', x, y, light: true });
    else ch.push({ k: 'grave', x, y, v: 2 });
  }
  if (chunks.size > 600) chunks.clear();
  chunks.set(key, ch);
  return ch;
}
const DECOR_DRAW = { grave: drawGrave, tree: drawTree, bush: drawBush, lamp: drawLamp, pumpkin: drawPumpkin };

// ---------------------------------------------------------------- game state
let mode = 'menu', t = 0;
const cam = { x: 0, y: 0 };
let shake = 0, hurtFx = 0;
let player, zombies = [], bullets = [], parts = [], decals = [], pickups = [];
let wave = 0, toSpawn = 0, spawnT = 0, breakT = 0, kills = 0, score = 0;
let best = +store.get('undead.best', 0) || 0;
let groanT = 2;

const UPGRADES = [
  { k: 'rate', label: 'شلیک سریع‌تر' },
  { k: 'multi', label: 'گلوله‌ی دوتایی' },
  { k: 'dmg', label: 'گلوله‌ی قوی‌تر' },
  { k: 'speed', label: 'سرعت بیشتر' },
  { k: 'pierce', label: 'گلوله‌ی نافذ' },
  { k: 'hp', label: 'جان بیشتر' },
  { k: 'rate', label: 'شلیک سریع‌تر' },
  { k: 'multi', label: 'گلوله‌ی سه‌تایی' },
  { k: 'dmg', label: 'گلوله‌ی قوی‌تر' },
];

function newPlayer() {
  return {
    x: 0, y: 0, vx: 0, vy: 0, r: 12, hp: 100, maxHp: 100, speed: 125,
    walk: 0, moveAmt: 0, face: 1, aim: 0, t: 0, inv: 0, flash: 0, cool: 0,
    rate: 4.2, dmg: 1, multi: 1, pierce: 0, range: 300, up: 0, dead: 0,
  };
}

function makeZombie(type, x, y) {
  const skins = ZSKIN[type];
  const hpMul = 1 + (wave - 1) * 0.12;
  const base = { walker: [3, 34, 11, 10], runner: [2, 78, 10, 8], brute: [14, 24, 18, 25] }[type];
  return {
    type, x, y, r: base[2], hp: Math.ceil(base[0] * hpMul), maxHp: 0,
    speed: base[1] * (1 + Math.min(0.35, (wave - 1) * 0.03)) * rand(0.9, 1.1),
    dmg: base[3], skin: pick(skins), shirt: pick(ZSHIRT), pants: pick(['#3d3a33', '#33384a', '#40352c', '#2e3a34']),
    hair: pick(['#2e2620', '#3d3226', '#1f1c1a', '#4a3a2c']), scar: Math.random() < 0.5,
    walk: Math.random() * TAU, moveAmt: 1, face: 1, flash: 0, kx: 0, ky: 0, seed: Math.random() * 10,
    jaw: 0, dead: 0, dieDir: 1, tx: x, ty: y,
  };
}

// ---------------------------------------------------------------- input
const keys = new Set();
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0 };
const STICK_R = 52;

window.addEventListener('pointerdown', e => {
  if (mode !== 'play' || stick.id !== null) return;
  if (e.target.closest('.overlay, .icon-btn')) return;
  stick.id = e.pointerId; stick.ox = stick.x = e.clientX; stick.oy = stick.y = e.clientY; stick.dx = stick.dy = 0;
});
window.addEventListener('pointermove', e => {
  if (e.pointerId !== stick.id) return;
  let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
  const d = Math.hypot(dx, dy);
  if (d > STICK_R) {
    // drag the base along so direction changes stay responsive
    stick.ox += dx * (1 - STICK_R / d); stick.oy += dy * (1 - STICK_R / d);
    dx = e.clientX - stick.ox; dy = e.clientY - stick.oy;
  }
  stick.x = e.clientX; stick.y = e.clientY;
  stick.dx = dx / STICK_R; stick.dy = dy / STICK_R;
});
const endStick = e => { if (e.pointerId === stick.id) { stick.id = null; stick.dx = stick.dy = 0; } };
window.addEventListener('pointerup', endStick);
window.addEventListener('pointercancel', endStick);
window.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

window.addEventListener('keydown', e => {
  if (e.repeat && mode !== 'play') { e.preventDefault(); return; }
  const k = e.code;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(k)) keys.add(k);
  else if (k === 'Enter' || k === 'Space') {
    if (mode === 'menu' || (mode === 'over' && !ui.btnRestart.disabled)) startRun();
    else if (mode === 'pause') resumeGame();
  } else if (k === 'Escape' || k === 'KeyP') {
    if (mode === 'play') pauseGame(); else if (mode === 'pause') resumeGame();
  } else if (k === 'KeyM') toggleSound();
  else return;
  e.preventDefault();
});
window.addEventListener('keyup', e => keys.delete(e.code));

function moveInput() {
  let x = stick.dx, y = stick.dy;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
  const d = Math.hypot(x, y);
  if (d > 1) { x /= d; y /= d; }
  return [x, y];
}

// ---------------------------------------------------------------- UI
const $ = id => document.getElementById(id);
const ui = {
  hud: $('hud'), score: $('score'), wave: $('waveLabel'), hpFill: $('hpFill'), hpText: $('hpText'),
  banner: $('banner'), bannerTitle: $('bannerTitle'), bannerSub: $('bannerSub'),
  menu: $('menu'), menuBest: $('menuBest'), over: $('over'), pause: $('pause'),
  finalScore: $('finalScore'), finalWave: $('finalWave'), finalKills: $('finalKills'), overBest: $('overBest'), newBest: $('newBest'),
  btnStart: $('btnStart'), btnRestart: $('btnRestart'), btnResume: $('btnResume'), btnPause: $('btnPause'), btnSound: $('btnSound'),
};
const show = (el, on) => { el.hidden = !on; };
const syncSoundBtn = () => ui.btnSound.classList.toggle('muted', !Sound.enabled);
function toggleSound() { Sound.toggle(); syncSoundBtn(); }
ui.btnStart.addEventListener('click', startRun);
ui.btnRestart.addEventListener('click', startRun);
ui.btnResume.addEventListener('click', resumeGame);
ui.btnPause.addEventListener('click', pauseGame);
ui.btnSound.addEventListener('click', () => { toggleSound(); if (Sound.enabled) Sound.click(); });
ui.menuBest.textContent = faNum(best);
syncSoundBtn();

let bannerTimer = 0;
function banner(title, sub) {
  ui.bannerTitle.textContent = title;
  ui.bannerSub.textContent = sub || '';
  show(ui.banner, false);
  void ui.banner.offsetWidth;
  show(ui.banner, true);
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => show(ui.banner, false), 2200);
}

function requestFullscreen() {
  const el = document.documentElement;
  if (!matchMedia('(pointer: coarse)').matches || document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}

function startRun() {
  Sound.init(); Sound.startMusic(); Sound.setMood('full'); Sound.click();
  requestFullscreen();
  const keepX = player.x, keepY = player.y;
  player = newPlayer(); player.x = keepX; player.y = keepY;
  zombies = []; bullets = []; parts = []; pickups = [];
  wave = 0; kills = 0; score = 0; hurtFx = 0;
  stick.id = null; stick.dx = stick.dy = 0;
  mode = 'play';
  nextWave();
  show(ui.menu, false); show(ui.over, false); show(ui.pause, false); show(ui.hud, true);
}

function nextWave() {
  wave++;
  toSpawn = 5 + wave * 4;
  spawnT = 1.2;
  breakT = 0;
  banner(`موج ${faNum(wave)}`, wave === 1 ? 'تا صبح زنده بمون' : '');
  Sound.wave();
}

function pauseGame() {
  if (mode !== 'play') return;
  mode = 'pause'; stick.id = null; stick.dx = stick.dy = 0;
  show(ui.pause, true);
  Sound.suspend();
}
function resumeGame() {
  if (mode !== 'pause') return;
  Sound.resume();
  mode = 'play';
  show(ui.pause, false);
}

function gameOver() {
  mode = 'over';
  const isBest = score > best;
  if (isBest) { best = score; store.set('undead.best', String(best)); }
  ui.finalScore.textContent = faNum(score);
  ui.finalWave.textContent = faNum(wave);
  ui.finalKills.textContent = faNum(kills);
  ui.overBest.textContent = faNum(best);
  ui.menuBest.textContent = faNum(best);
  show(ui.newBest, isBest && score > 0);
  show(ui.hud, false); show(ui.over, true); show(ui.banner, false);
  ui.btnRestart.disabled = true;
  setTimeout(() => { ui.btnRestart.disabled = false; }, 900);
  Sound.setMood('muffled');
}

function applyUpgrade() {
  const u = UPGRADES[player.up % UPGRADES.length];
  const loop = Math.floor(player.up / UPGRADES.length);
  player.up++;
  switch (u.k) {
    case 'rate': player.rate *= 1.25; break;
    case 'multi': player.multi = Math.min(5, player.multi + 1); break;
    case 'dmg': player.dmg += 1; break;
    case 'speed': player.speed *= 1.12; break;
    case 'pierce': player.pierce += 1; break;
    case 'hp': player.maxHp += 25; player.hp += 25; break;
  }
  player.hp = Math.min(player.maxHp, player.hp + 20);
  Sound.upgrade();
  return loop > 0 && u.k === 'multi' ? 'گلوله‌ی بیشتر' : u.label;
}

// ---------------------------------------------------------------- spawning
function spawnZombie() {
  const halfW = W / zoom / 2, halfH = H / zoom / 2;
  const R = Math.hypot(halfW, halfH) + 40;
  const a = Math.random() * TAU;
  let type = 'walker';
  const r = Math.random();
  if (wave >= 3 && r < Math.min(0.2, 0.06 + wave * 0.015)) type = 'brute';
  else if (wave >= 2 && r < Math.min(0.5, 0.25 + wave * 0.03)) type = 'runner';
  zombies.push(makeZombie(type, player.x + Math.cos(a) * R, player.y + Math.sin(a) * R));
}

function blood(x, y, n, dirx = 0, diry = 0, h = 26) {
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(diry, dirx) + rand(-0.9, 0.9), s = rand(40, 160);
    parts.push({ k: 'blood', x, y, z: h, vx: Math.cos(a) * s + rand(-30, 30), vy: Math.sin(a) * s * 0.6 + rand(-20, 20), vz: rand(20, 120), life: rand(0.4, 0.8), t: 0, r: rand(1.2, 2.6) });
  }
}
function decal(x, y, r) {
  const blobs = [];
  for (let i = 0; i < 5; i++) blobs.push([rand(-r, r), rand(-r, r) * 0.5, rand(r * 0.3, r * 0.7)]);
  decals.push({ x, y, blobs, t: 0 });
  if (decals.length > 90) decals.shift();
}

// ---------------------------------------------------------------- update
function update(dt) {
  t += dt;
  const p = player;
  p.t += dt;

  // --- player movement
  let mx = 0, my = 0;
  if (mode === 'play') [mx, my] = moveInput();
  const mag = Math.min(1, Math.hypot(mx, my));
  p.vx = lerp(p.vx, mx * p.speed, Math.min(1, dt * 12));
  p.vy = lerp(p.vy, my * p.speed, Math.min(1, dt * 12));
  if (mode === 'play') { p.x += p.vx * dt; p.y += p.vy * dt; }
  p.moveAmt = lerp(p.moveAmt, mode === 'play' ? mag : 0, Math.min(1, dt * 10));
  p.walk += dt * (6 + 8 * p.moveAmt) * p.moveAmt;
  if (Math.abs(p.vx) > 8) p.face = Math.sign(p.vx);
  p.inv = Math.max(0, p.inv - dt);
  p.flash = Math.max(0, p.flash - dt * 14);

  // --- zombies
  const px = p.x, py = p.y;
  for (const z of zombies) {
    if (z.dead) { z.dead += dt; z.flash = Math.max(0, z.flash - dt * 12); continue; }
    let dx, dy;
    if (mode === 'menu') {
      if (Math.hypot(z.tx - z.x, z.ty - z.y) < 12) { const a = Math.random() * TAU, d = rand(120, 220); z.tx = px + Math.cos(a) * d; z.ty = py + Math.sin(a) * d; }
      dx = z.tx - z.x; dy = z.ty - z.y;
    } else { dx = px - z.x; dy = py - z.y; }
    const d = Math.hypot(dx, dy) || 1;
    const sp = z.speed * (mode === 'menu' ? 0.5 : 1) * (mode === 'over' ? 0.4 : 1);
    z.x += (dx / d) * sp * dt + z.kx * dt;
    z.y += (dy / d) * sp * dt + z.ky * dt;
    z.kx *= Math.exp(-8 * dt); z.ky *= Math.exp(-8 * dt);
    if (Math.abs(dx) > 4) z.face = Math.sign(dx);
    z.walk += dt * (z.type === 'runner' ? 13 : z.type === 'brute' ? 4.5 : 5.5);
    z.flash = Math.max(0, z.flash - dt * 12);
    z.jaw = 0.5 + 0.5 * Math.sin(t * 7 + z.seed * 3);

    if (mode === 'play' && d < z.r + p.r && p.inv <= 0) {
      p.hp -= z.dmg; p.inv = 0.7; hurtFx = 1; shake = Math.max(shake, 0.6);
      p.vx += (-dx / d) * 260; p.vy += (-dy / d) * 260;
      p.x += (-dx / d) * 8; p.y += (-dy / d) * 8;
      Sound.hurt();
      if (navigator.vibrate) navigator.vibrate(40);
      if (p.hp <= 0) { p.hp = 0; Sound.death(); blood(p.x, p.y, 20); decal(p.x, p.y, 14); gameOver(); }
    }
  }
  // separation
  for (let i = 0; i < zombies.length; i++) {
    const a = zombies[i]; if (a.dead) continue;
    for (let j = i + 1; j < zombies.length; j++) {
      const b = zombies[j]; if (b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min && d2 > 0.01) {
        const d = Math.sqrt(d2), push = (min - d) * 0.5, nx = dx / d, ny = dy / d;
        const wa = b.type === 'brute' ? 0.8 : 0.5, wb = 1 - wa;
        a.x -= nx * push * wa * 2; a.y -= ny * push * wa * 2;
        b.x += nx * push * wb * 2; b.y += ny * push * wb * 2;
      }
    }
  }
  zombies = zombies.filter(z => z.dead < 1.6 && Math.hypot(z.x - px, z.y - py) < 1400);

  if (mode === 'play') {
    // --- shooting (auto-aim at nearest zombie)
    p.cool -= dt;
    let target = null, bd = p.range;
    for (const z of zombies) {
      if (z.dead) continue;
      const d = Math.hypot(z.x - px, z.y - py);
      if (d < bd) { bd = d; target = z; }
    }
    if (target) {
      // zombies walk straight at the player, so lead the shot along that line
      const lead = target.speed * bd / 720 / (bd || 1);
      p.aim = Math.atan2(target.y + (py - target.y) * lead - py, target.x + (px - target.x) * lead - px);
      p.face = Math.cos(p.aim) >= 0 ? 1 : -1;
      if (p.cool <= 0) {
        p.cool = 1 / p.rate;
        const spread = 0.13;
        for (let i = 0; i < p.multi; i++) {
          const a = p.aim + (i - (p.multi - 1) / 2) * spread + rand(-0.03, 0.03);
          bullets.push({ x: px + Math.cos(a) * 24, y: py + Math.sin(a) * 24, vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, life: p.range / 720 + 0.05, pierce: p.pierce, hit: [] });
        }
        p.flash = 1;
        parts.push({ k: 'shell', x: px, y: py, z: 28, vx: -Math.cos(p.aim) * 40 + rand(-30, 30), vy: rand(-20, 20), vz: rand(60, 110), life: 1.2, t: 0, rot: 0 });
        Sound.shot();
      }
    } else {
      p.aim = lerp(p.aim, p.face > 0 ? 0 : Math.PI, 0.2);
    }

    // --- waves
    if (toSpawn > 0) {
      spawnT -= dt;
      const alive = zombies.filter(z => !z.dead).length;
      if (spawnT <= 0 && alive < 45) {
        spawnZombie(); toSpawn--;
        spawnT = Math.max(0.22, 1.05 - wave * 0.07) * rand(0.6, 1.3);
        if (wave > 2 && Math.random() < 0.25 && toSpawn > 0) { spawnZombie(); toSpawn--; }
      }
    } else if (!zombies.some(z => !z.dead)) {
      if (breakT === 0) {
        breakT = 3.2;
        score += wave * 100;
        banner('موج تمام شد!', '+ ' + applyUpgrade());
      }
      breakT -= dt;
      if (breakT <= 0) nextWave();
    }

    groanT -= dt;
    if (groanT <= 0) {
      groanT = rand(1.5, 4);
      const near = zombies.find(z => !z.dead && Math.hypot(z.x - px, z.y - py) < 260);
      if (near) Sound.groan(0.12, near.type === 'brute' ? 0.7 : 1);
    }
  }

  // --- bullets
  for (const b of bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    for (const z of zombies) {
      if (z.dead || b.hit.includes(z)) continue;
      const dx = z.x - b.x, dy = z.y - b.y;
      if (dx * dx + dy * dy < (z.r + 4) * (z.r + 4)) {
        b.hit.push(z);
        z.hp -= player.dmg; z.flash = 1;
        const kb = z.type === 'brute' ? 60 : 180;
        const bl = Math.hypot(b.vx, b.vy);
        z.kx += (b.vx / bl) * kb; z.ky += (b.vy / bl) * kb;
        blood(z.x, z.y, 5, b.vx, b.vy, z.type === 'brute' ? 34 : 26);
        Sound.hit();
        if (z.hp <= 0) killZombie(z, b.vx);
        if (b.pierce-- <= 0) { b.life = 0; break; }
      }
    }
  }
  bullets = bullets.filter(b => b.life > 0);

  // --- pickups
  for (const k of pickups) {
    k.t += dt;
    if (mode === 'play' && Math.hypot(k.x - px, k.y - py) < 22) {
      k.taken = true;
      p.hp = Math.min(p.maxHp, p.hp + 30);
      Sound.pickup();
    }
  }
  pickups = pickups.filter(k => !k.taken && k.t < 20);

  // --- particles
  for (const q of parts) {
    q.t += dt;
    q.x += q.vx * dt; q.y += q.vy * dt;
    q.z += q.vz * dt; q.vz -= 420 * dt;
    if (q.z <= 0) {
      q.z = 0; q.vx *= 0.5; q.vy *= 0.5; q.vz = q.k === 'shell' ? -q.vz * 0.3 : 0;
      if (q.k === 'blood' && !q.landed) { q.landed = true; if (Math.random() < 0.25) decal(q.x, q.y, rand(2, 4)); }
    }
    if (q.k === 'shell') q.rot += dt * 18 * (q.z > 0 ? 1 : 0);
  }
  parts = parts.filter(q => q.t < q.life);
  for (const d of decals) d.t += dt;

  // --- camera
  cam.x = lerp(cam.x, p.x, Math.min(1, dt * 6));
  cam.y = lerp(cam.y, p.y - 10 - menuOffset(), Math.min(1, dt * 6));
  shake *= Math.exp(-7 * dt);
  hurtFx *= Math.exp(-3 * dt);
}

// On the portrait menu, the panel covers the middle, so show the survivor lower on screen.
const menuOffset = () => (mode === 'menu' && H > W ? (H * 0.27) / zoom : 0);

function killZombie(z, dir) {
  z.dead = 0.0001; z.dieDir = dir >= 0 ? 1 : -1;
  kills++;
  score += { walker: 10, runner: 15, brute: 60 }[z.type];
  blood(z.x, z.y, z.type === 'brute' ? 18 : 10, 0, 0);
  decal(z.x, z.y, z.type === 'brute' ? 16 : 11);
  shake = Math.max(shake, z.type === 'brute' ? 0.5 : 0.18);
  if (Math.random() < 0.3) Sound.groan(0.14, z.type === 'brute' ? 0.65 : 1.1);
  if (Math.random() < (z.type === 'brute' ? 0.5 : 0.06) && mode === 'play') pickups.push({ x: z.x, y: z.y, t: 0 });
}

// ---------------------------------------------------------------- render
function worldTransform(sx, sy) {
  const k = zoom * dpr;
  ctx.setTransform(k, 0, 0, k, (W / 2 - cam.x * zoom + sx) * dpr, (H / 2 - cam.y * zoom + sy) * dpr);
}

function drawActor(fn, obj, x, y, face, extra) {
  g.save();
  g.translate(x, y);
  if (face < 0) g.scale(-1, 1);
  fn(obj, extra);
  g.restore();
}

function render() {
  g = ctx;
  const sx = (Math.random() - 0.5) * shake * 12, sy = (Math.random() - 0.5) * shake * 12;
  worldTransform(sx, sy);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const halfW = W / zoom / 2 + 40, halfH = H / zoom / 2 + 40;
  const x0 = cam.x - halfW, x1 = cam.x + halfW, y0 = cam.y - halfH, y1 = cam.y + halfH + 60;

  // ground
  for (let tx = Math.floor(x0 / TILE) * TILE; tx < x1; tx += TILE)
    for (let ty = Math.floor(y0 / TILE) * TILE; ty < y1; ty += TILE)
      ctx.drawImage(tileC, tx, ty, TILE + 0.6, TILE + 0.6);

  // blood decals
  for (const d of decals) {
    if (d.x < x0 || d.x > x1 || d.y < y0 || d.y > y1) continue;
    ctx.globalAlpha = Math.max(0, 0.85 - d.t / 40);
    ctx.fillStyle = '#4a0d0d';
    for (const [bx, by, r] of d.blobs) { ctx.beginPath(); ctx.ellipse(d.x + bx, d.y + by, r, r * 0.55, 0, 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;

  // collect visible scenery + actors, y-sorted
  const list = [];
  const lights = [];
  const cx0 = Math.floor(x0 / CHUNK), cx1 = Math.floor(x1 / CHUNK), cy0 = Math.floor(y0 / CHUNK), cy1 = Math.floor((y1 + 100) / CHUNK);
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
    for (const o of chunkAt(cx, cy)) {
      if (o.x < x0 - 60 || o.x > x1 + 60 || o.y < y0 || o.y > y1 + 120) continue;
      list.push({ y: o.y, o, kind: 'decor' });
      if (o.k === 'lamp') lights.push([o.x, o.y - 88, 150, GLOW_WARM, 1]);
      if (o.k === 'pumpkin') lights.push([o.x, o.y - 8, 60, GLOW_ORANGE, 0.8 + Math.sin(t * 9 + o.x) * 0.15]);
    }
  }
  for (const k of pickups) list.push({ y: k.y, o: k, kind: 'pickup' });
  for (const z of zombies) if (z.x > x0 - 40 && z.x < x1 + 40 && z.y > y0 && z.y < y1 + 80) list.push({ y: z.y, o: z, kind: 'zombie' });
  if (mode !== 'over') list.push({ y: player.y, o: player, kind: 'player' });
  list.sort((a, b) => a.y - b.y);

  for (const it of list) {
    const o = it.o;
    if (it.kind === 'decor') { drawActor(DECOR_DRAW[o.k], o, o.x, o.y, 1); }
    else if (it.kind === 'pickup') {
      g.save(); g.translate(o.x, o.y); g.globalAlpha = o.t > 17 ? (Math.sin(o.t * 20) > 0 ? 1 : 0.3) : 1; drawMedkit(o); g.restore(); g.globalAlpha = 1;
    } else if (it.kind === 'zombie') {
      g.save(); g.translate(o.x, o.y);
      if (o.dead) {
        const k = Math.min(1, o.dead / 0.3);
        g.rotate(o.dieDir * k * Math.PI / 2 * 0.95);
        g.globalAlpha = o.dead > 0.9 ? Math.max(0, 1 - (o.dead - 0.9) / 0.7) : 1;
      }
      if (o.face < 0) g.scale(-1, 1);
      FL = o.flash;
      drawZombie(o, 'body');
      FL = 0;
      g.restore(); g.globalAlpha = 1;
    } else {
      const p = o;
      const blink = p.inv > 0 && Math.sin(p.t * 40) > 0;
      g.save(); g.translate(p.x, p.y);
      if (blink) g.globalAlpha = 0.55;
      if (p.face < 0) g.scale(-1, 1);
      const aimLocal = p.face < 0 ? Math.PI - p.aim : p.aim;
      const a = Math.atan2(Math.sin(aimLocal), Math.cos(aimLocal));
      const aimBehind = Math.abs(a) > Math.PI / 2;
      if (aimBehind) drawGun(p, a, p.flash);
      drawSurvivor(p);
      if (!aimBehind) drawGun(p, a, p.flash);
      g.restore(); g.globalAlpha = 1;
    }
  }

  // bullets (tracers)
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const b of bullets) {
    const l = Math.hypot(b.vx, b.vy);
    ctx.strokeStyle = 'rgba(255,220,140,.9)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(b.x, b.y - 26); ctx.lineTo(b.x - b.vx / l * 16, b.y - 26 - b.vy / l * 16); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  // particles
  for (const q of parts) {
    if (q.k === 'blood') {
      ctx.fillStyle = q.z > 0 ? '#8e1212' : '#5a0d0d';
      ctx.beginPath(); ctx.arc(q.x, q.y - q.z, q.r, 0, TAU); ctx.fill();
    } else {
      ctx.save(); ctx.translate(q.x, q.y - q.z); ctx.rotate(q.rot);
      ctx.fillStyle = '#d9a441'; ctx.fillRect(-2, -1, 4, 2);
      ctx.restore();
    }
  }

  // ---- darkness with lights
  const m = dpr * darkScale;
  darkG.setTransform(1, 0, 0, 1, 0, 0);
  darkG.globalCompositeOperation = 'source-over';
  darkG.fillStyle = 'rgba(6,8,22,0.8)';
  darkG.fillRect(0, 0, darkC.width, darkC.height);
  darkG.globalCompositeOperation = 'destination-out';
  const toDark = (x, y) => [((x - cam.x) * zoom + W / 2 + sx) * m, ((y - cam.y) * zoom + H / 2 + sy) * m];
  const hole = (x, y, r, a = 1) => {
    const [dx, dy] = toDark(x, y), rr2 = r * zoom * m;
    darkG.globalAlpha = a;
    darkG.drawImage(LIGHT, dx - rr2, dy - rr2, rr2 * 2, rr2 * 2);
  };
  const p = player;
  if (mode !== 'over') {
    hole(p.x, p.y - 20, 175, 1);
    hole(p.x, p.y - 20, 90, 1);
    const [dx, dy] = toDark(p.x, p.y - 26);
    const len = 330 * zoom * m;
    darkG.save(); darkG.translate(dx, dy); darkG.rotate(p.aim);
    darkG.globalAlpha = 0.95;
    darkG.drawImage(CONE, 0, -len / 2, len, len);
    darkG.restore();
    if (p.flash > 0) hole(p.x + Math.cos(p.aim) * 30, p.y - 26 + Math.sin(p.aim) * 30, 140, p.flash);
  } else {
    hole(p.x, p.y, 90, 0.8);
  }
  for (const [x, y, r, , a] of lights) { hole(x, y + 60, r, a * 0.9); hole(x, y, r * 0.5, a); }
  for (const k of pickups) hole(k.x, k.y - 8, 40, 0.8);
  // faint moonlight
  darkG.globalAlpha = 1;
  darkG.globalCompositeOperation = 'source-over';

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(darkC, 0, 0, canvas.width, canvas.height);

  // additive glows on top of darkness
  worldTransform(sx, sy);
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, spr, a] of lights) {
    ctx.globalAlpha = a;
    ctx.drawImage(spr, x - r * 0.5, y - r * 0.5, r, r);
  }
  if (p.flash > 0 && mode === 'play') {
    ctx.globalAlpha = p.flash * 0.9;
    const fx = p.x + Math.cos(p.aim) * 30, fy = p.y - 28 + Math.sin(p.aim) * 30;
    ctx.drawImage(GLOW_MUZZLE, fx - 50, fy - 50, 100, 100);
  }
  for (const k of pickups) { ctx.globalAlpha = 0.6 + Math.sin(k.t * 4) * 0.2; ctx.drawImage(GLOW_RED, k.x - 24, k.y - 34, 48, 48); }
  // zombie eyes glow in the dark
  ctx.globalAlpha = 1;
  g = ctx;
  for (const z of zombies) {
    if (z.dead || z.x < x0 || z.x > x1 || z.y < y0 || z.y > y1 + 80) continue;
    g.save(); g.translate(z.x, z.y); if (z.face < 0) g.scale(-1, 1);
    drawZombie(z, 'eyes');
    g.restore();
    const e = z.type === 'walker' ? GLOW_EYE_Y : GLOW_EYE_R;
    const hy = z.type === 'brute' ? -54 : z.type === 'runner' ? -44 : -49;
    ctx.globalAlpha = 0.7;
    ctx.drawImage(e, z.x + z.face * 8 - 8, z.y + hy - 8 - 2, 16, 16);
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  // player health ring under the feet
  if (mode === 'play') {
    const f = p.hp / p.maxHp;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 17, 6, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = f > 0.5 ? '#6ee07a' : f > 0.25 ? '#f2c14e' : '#ff4d4d';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 17, 6, 0, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
  }

  // screen-space overlays
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const low = mode === 'play' ? clamp(1 - p.hp / p.maxHp, 0, 1) : 0;
  const hv = Math.max(hurtFx, low > 0.6 ? (low - 0.6) * 1.5 * (0.6 + 0.4 * Math.sin(t * 6)) : 0);
  if (hv > 0.02) {
    const grd = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    grd.addColorStop(0, 'rgba(160,0,0,0)'); grd.addColorStop(1, `rgba(160,0,0,${0.6 * hv})`);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  }
  if (stick.id !== null) {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(stick.ox, stick.oy, STICK_R, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.arc(stick.ox + stick.dx * STICK_R, stick.oy + stick.dy * STICK_R, 22, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- HUD
let hudScore = -1, hudHp = -1, hudWave = -1;
function updateHud() {
  if (mode !== 'play') return;
  if (score !== hudScore) { hudScore = score; ui.score.textContent = score.toLocaleString('en-US'); }
  if (wave !== hudWave) { hudWave = wave; ui.wave.textContent = `موج ${faNum(wave)}`; }
  const hp = Math.ceil(player.hp) + player.maxHp * 1000;
  if (hp !== hudHp) {
    hudHp = hp;
    const f = player.hp / player.maxHp;
    ui.hpFill.style.transform = `scaleX(${f})`;
    ui.hpFill.style.background = f > 0.5 ? 'linear-gradient(90deg,#3fbf5a,#8ef08c)' : f > 0.25 ? 'linear-gradient(90deg,#d99a1e,#f2c14e)' : 'linear-gradient(90deg,#b3232a,#ff5a5a)';
    ui.hpText.textContent = Math.ceil(player.hp);
  }
}

// ---------------------------------------------------------------- adaptive resolution
const QUALITY = [2, 1.5, 1.25, 1];
let perfAcc = 0, perfN = 0;
function trackPerf(dt) {
  if (mode !== 'play') { perfAcc = 0; perfN = 0; return; }
  perfAcc += dt; perfN++;
  if (perfN < 150) return;
  const avg = perfAcc / perfN; perfAcc = 0; perfN = 0;
  if (avg > 1 / 45) { const next = QUALITY.find(q => q < dpr - 0.01); if (next) { dprCap = next; resize(); } }
}

// ---------------------------------------------------------------- lifecycle
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (mode === 'play') pauseGame(); Sound.suspend(); }
  else if (mode !== 'pause') Sound.resume();
});
window.addEventListener('blur', () => { if (mode === 'play') pauseGame(); });
window.addEventListener('resize', resize);

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt <= 0) return;
  if (mode !== 'pause') update(dt);
  render();
  updateHud();
  trackPerf(dt);
}

player = newPlayer();
resize();
for (let i = 0; i < 6; i++) {
  const a = Math.random() * TAU, d = rand(140, 240);
  wave = 1 + (i % 3);
  const z = makeZombie(['walker', 'walker', 'runner', 'walker', 'brute', 'walker'][i], Math.cos(a) * d, Math.sin(a) * d);
  zombies.push(z);
}
wave = 0;
cam.x = 0; cam.y = -10 - menuOffset();
requestAnimationFrame(frame);
})();
