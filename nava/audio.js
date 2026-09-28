// Santur, tar and kamancheh are synthesised note-by-note into cached AudioBuffers (additive, plucked-string
// and bowed models), so quarter tones (koron / sori) are tuned exactly. The piano uses recorded samples.
const Sound = (() => {
  'use strict';

  const KEY = 'nava.sound';
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== '0'; } catch (e) {}

  let ctx = null, master, dry, verbIn, noiseBuf;
  const cache = new Map();
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  const VOICES = {
    // partials, amplitude rolloff, per-partial decay, inharmonicity, string detune (cents), length, hammer
    piano: { partials: 9, roll: 1.35, d0: 0.75, dn: 0.42, B: 0.00035, strings: [-0.9, 0.9], len: 2.8, attack: 0.004, hammer: 0.06, hammerLP: 0.08, bright: 1 },
    tar: { model: 'pluck', strings: [-2.5, 2.5], len: 2.6, t60: 3.2, bright: 0.55, pick: 0.13 },
    kamancheh: { model: 'bow', partials: 16, len: 2.2, attack: 0.09 },
    santur: { partials: 12, roll: 0.85, d0: 1.25, dn: 0.5, B: 0.00012, strings: [-5, -1.2, 3.5], len: 2.3, attack: 0.0015, hammer: 0.16, hammerLP: 0.55, bright: 1.35 },
  };

  function impulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function init() {
    if (ctx) { resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = enabled ? 0.9 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.002; comp.release.value = 0.25;
    master.connect(comp); comp.connect(ctx.destination);
    dry = ctx.createGain(); dry.gain.value = 1; dry.connect(master);
    const verb = ctx.createConvolver(); verb.buffer = impulse(2.4, 2.8);
    verbIn = ctx.createGain(); verbIn.gain.value = 0.28;
    const vo = ctx.createGain(); vo.gain.value = 0.8;
    verbIn.connect(verb); verb.connect(vo); vo.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    resume();
  }
  function resume() { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); }
  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); }

  // Tar: plucked double course (Karplus-Strong). An allpass sets the fractional loop length, so quarter
  // tones stay exactly in tune.
  function renderPluck(v, f0, n, sr) {
    const out = new Float32Array(n);
    for (const cents of v.strings) {
      const f = f0 * Math.pow(2, cents / 1200);
      let L = sr / f - 0.5, N = Math.floor(L), fr = L - N;
      if (fr < 0.1) { N--; fr += 1; }
      const C = (1 - fr) / (1 + fr);
      const g = Math.pow(10, -3 / (v.t60 * Math.pow(f / 220, 0.35) * f));
      const dl = new Float32Array(N);
      // pluck: bright noise burst with a pick-position notch
      let lp = 0;
      for (let i = 0; i < N; i++) { lp += (Math.random() * 2 - 1 - lp) * v.bright; dl[i] = lp; }
      const pk = Math.max(1, Math.round(N * v.pick));
      for (let i = N - 1; i >= pk; i--) dl[i] -= dl[i - pk] * 0.9;
      let idx = 0, prev = 0, x1 = 0, y1 = 0;
      for (let i = 0; i < n; i++) {
        const sm = dl[idx];
        const avg = 0.5 * (sm + prev); prev = sm;
        const ap = C * avg + x1 - C * y1; x1 = avg; y1 = ap;
        dl[idx] = ap * g;
        out[i] += sm;
        if (++idx >= N) idx = 0;
      }
    }
    return out;
  }

  // Kamancheh: bowed string. Rich partials shaped by a body resonance, a soft bow attack, vibrato that
  // blooms after the attack, and a little bow noise.
  function renderBow(v, f0, n, sr) {
    const out = new Float32Array(n);
    const body = fk => 0.35 + Math.exp(-Math.pow(Math.log2(fk / 1100), 2) * 1.6) + 0.5 * Math.exp(-Math.pow(Math.log2(fk / 2900), 2) * 3);
    // one period of the spectrum in a wavetable, then read with a vibrato-modulated phase: cheap enough for phones
    const TN = 2048, tab = new Float32Array(TN + 1);
    for (let k = 1; k <= v.partials && f0 * k < sr * 0.42; k++) {
      const amp = body(f0 * k) / Math.pow(k, 0.95), ph0 = Math.random() * 6.283;
      for (let i = 0; i <= TN; i++) tab[i] += Math.sin(ph0 + 6.283 * k * i / TN) * amp;
    }
    for (const det of [-3, 3]) {
      const fs = f0 * Math.pow(2, det / 1200), vr = 5.3 + det * 0.05;
      let ph = Math.random();
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const depth = 0.0065 * Math.min(1, Math.max(0, (t - 0.18) / 0.35));
        ph += fs * (1 + depth * Math.sin(6.283 * vr * t)) / sr;
        ph -= Math.floor(ph);
        const x = ph * TN, j = x | 0;
        out[i] += (tab[j] + (tab[j + 1] - tab[j]) * (x - j)) * 0.5;
      }
    }
    let lp = 0;
    for (let i = 0; i < n; i++) { lp += (Math.random() * 2 - 1 - lp) * 0.3; out[i] += lp * 0.05; }
    const an = Math.floor(sr * v.attack);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const env = i < an ? Math.pow(i / an, 1.5) : 1 - 0.25 * Math.min(1, (t - v.attack) / 1.5);
      out[i] *= env;
    }
    return out;
  }

  function render(inst, midi) {
    const v = VOICES[inst];
    if (v.model) {
      const sr = ctx.sampleRate, n = Math.floor(sr * v.len);
      const out = (v.model === 'pluck' ? renderPluck : renderBow)(v, mtof(midi), n, sr);
      const rn = Math.floor(sr * 0.12);
      for (let i = 0; i < rn; i++) out[n - 1 - i] *= i / rn;
      let peak = 0;
      for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
      const buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0), g = 0.55 / (peak || 1);
      for (let i = 0; i < n; i++) d[i] = out[i] * g;
      return buf;
    }
    const sr = ctx.sampleRate;
    const f0 = mtof(midi);
    const n = Math.floor(sr * v.len);
    const out = new Float32Array(n);
    // lower notes ring longer, higher notes die faster
    const pitchK = Math.pow(f0 / 262, 0.45);
    for (const cents of v.strings) {
      const fs = f0 * Math.pow(2, cents / 1200);
      for (let k = 1; k <= v.partials; k++) {
        const fk = fs * k * Math.sqrt(1 + v.B * k * k);
        if (fk > sr * 0.45) break;
        let amp = Math.pow(k, -v.roll) / v.strings.length;
        if (v.bright > 1 && k >= 2 && k <= 5) amp *= v.bright;
        const dec = (v.d0 + v.dn * k) * pitchK;
        const w = 2 * Math.PI * fk / sr;
        // rotating phasor: cheaper than Math.sin per sample
        let c = Math.cos(w), s = Math.sin(w), re = Math.cos(Math.random() * 6.283), im = Math.sin(Math.random() * 6.283);
        const e = Math.exp(-dec / sr);
        let a = amp;
        for (let i = 0; i < n; i++) {
          out[i] += im * a;
          const r2 = re * c - im * s; im = re * s + im * c; re = r2;
          a *= e;
        }
      }
    }
    // hammer strike: short filtered noise burst
    const hn = Math.floor(sr * 0.012);
    let lp = 0;
    for (let i = 0; i < hn; i++) {
      lp += (Math.random() * 2 - 1 - lp) * v.hammerLP;
      out[i] += lp * v.hammer * (1 - i / hn);
    }
    // attack ramp + release tail, then normalise
    const an = Math.max(1, Math.floor(sr * v.attack));
    for (let i = 0; i < an; i++) out[i] *= i / an;
    const rn = Math.floor(sr * 0.08);
    for (let i = 0; i < rn; i++) out[n - 1 - i] *= i / rn;
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
    const g = (0.55 / (peak || 1)) * (midi < 48 ? 0.85 : 1);
    const buf = ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = out[i] * g;
    return buf;
  }

  const key = (inst, midi) => inst + ':' + midi.toFixed(2);
  function get(inst, midi) {
    const k = key(inst, midi);
    let b = cache.get(k);
    if (!b) { b = render(inst, midi); cache.set(k, b); }
    return b;
  }

  // ---- recorded piano: 21 samples (every minor third, C2–C7); other pitches, quarter tones included,
  // are played by resampling the nearest one. Falls back to the synthesised piano if loading fails.
  const PIANO_SAMPLES = [];
  for (let o = 2; o <= 6; o++) for (const [n, s] of [['C', 0], ['Ds', 3], ['Fs', 6], ['A', 9]]) PIANO_SAMPLES.push([n + o, 12 * (o + 1) + s]);
  PIANO_SAMPLES.push(['C7', 96]);
  let piano = null, pianoLoad = null;
  function loadPiano(onProgress) {
    if (piano) return Promise.resolve();
    if (pianoLoad) return pianoLoad;
    let done = 0;
    const decode = ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej));
    pianoLoad = Promise.all(PIANO_SAMPLES.map(([name, midi]) =>
      fetch(`piano/${name}.mp3`).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(decode)
        .then(buffer => { done++; if (onProgress) onProgress(done / PIANO_SAMPLES.length); return { midi, buffer }; })))
      .then(list => { piano = list; })
      .catch(() => { pianoLoad = null; });
    return pianoLoad;
  }

  function voice(inst, midi) {
    if (inst === 'piano' && piano) {
      let best = piano[0];
      for (const s of piano) if (Math.abs(s.midi - midi) < Math.abs(best.midi - midi)) best = s;
      return { buffer: best.buffer, rate: Math.pow(2, (midi - best.midi) / 12), gain: 1.1 };
    }
    return { buffer: get(inst, midi), rate: 1, gain: 1 };
  }

  function start(inst, midi, vel, when) {
    const v = voice(inst, midi);
    const src = ctx.createBufferSource();
    src.buffer = v.buffer;
    src.playbackRate.value = v.rate;
    const g = ctx.createGain();
    g.gain.value = vel * v.gain;
    src.connect(g); g.connect(dry); g.connect(verbIn);
    src.start(when);
    src.g = g;
    return src;
  }

  // Get everything a song needs ready: the piano samples, or the rendered santur notes
  // (a few per frame so the UI never freezes).
  function preload(inst, midis, onProgress) {
    if (!ctx) return Promise.resolve();
    ['tom', 'bak', 'riz'].forEach(drumBuf);
    if (inst === 'piano') return loadPiano(onProgress);
    const todo = [...new Set(midis.map(m => key(inst, m)))].filter(k => !cache.has(k)).map(k => +k.split(':')[1]);
    let done = 0;
    return new Promise(res => {
      const step = () => {
        const t0 = performance.now();
        while (done < todo.length && performance.now() - t0 < 24) { get(inst, todo[done]); done++; }
        if (onProgress) onProgress(todo.length ? done / todo.length : 1);
        if (done < todo.length) setTimeout(step, 0); else res();
      };
      step();
    });
  }

  function play(inst, midis, vel = 1, restVel = 0.62) {
    if (!ctx) return;
    const t = ctx.currentTime;
    // a touch of human variation keeps repeated notes from sounding mechanical
    const h = 0.92 + Math.random() * 0.1;
    return midis.map((m, i) => start(inst, m, vel * h * (i === 0 ? 1 : restVel), t + i * 0.006));
  }
  // Lifting the finger off a long tile damps its note, like letting go of a piano key.
  function release(voices, fade = 0.09) {
    if (!ctx || !voices) return;
    const t = ctx.currentTime;
    for (const v of voices) { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, fade); try { v.stop(t + fade * 6); } catch (e) {} }
  }

  // ---- tonbak: tom (deep centre stroke), bak (sharp edge stroke) and riz (soft finger-roll stroke),
  // each rendered in a few slightly different takes so repeated strokes never sound identical.
  let pending = [];
  const drums = {};
  function renderDrum(kind) {
    const sr = ctx.sampleRate;
    const len = kind === 'tom' ? 0.7 : 0.28, n = Math.floor(sr * len);
    const out = new Float32Array(n);
    const r = () => 0.93 + Math.random() * 0.14;
    if (kind === 'tom') {
      const base = 92 * r(), drop = 90 * r();
      let ph = 0, ph2 = 0, lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr, f = base + drop * Math.exp(-t / 0.022);
        ph += 6.283 * f / sr; ph2 += 6.283 * f * 1.58 / sr;
        lp += (Math.random() * 2 - 1 - lp) * 0.08;
        out[i] = Math.sin(ph) * Math.exp(-t / 0.24) + 0.28 * Math.sin(ph2) * Math.exp(-t / 0.07) + lp * 0.9 * Math.exp(-t / 0.018);
      }
    } else {
      const soft = kind === 'riz';
      const fc = (soft ? 2300 : 3300) * r(), q = soft ? 1.6 : 2.4;
      // resonant band-pass (state variable filter) over noise for the skin's crack
      const F = 2 * Math.sin(Math.PI * fc / sr);
      let low = 0, band = 0;
      const f1 = 700 * r(), f2 = 1150 * r();
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const x = Math.random() * 2 - 1;
        low += F * band; const high = x - low - band / q; band += F * high;
        out[i] = band * 0.6 * Math.exp(-t / (soft ? 0.02 : 0.028))
          + 0.5 * Math.sin(6.283 * f1 * t) * Math.exp(-t / (soft ? 0.03 : 0.055))
          + 0.25 * Math.sin(6.283 * f2 * t) * Math.exp(-t / 0.035);
      }
      for (let i = 0; i < 40 && i < n; i++) out[i] += (1 - i / 40) * (soft ? 0.2 : 0.5);
    }
    const an = Math.floor(sr * 0.0008);
    for (let i = 0; i < an; i++) out[i] *= i / an;
    const rn = Math.floor(sr * 0.03);
    for (let i = 0; i < rn; i++) out[n - 1 - i] *= i / rn;
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
    const g = { tom: 0.8, bak: 0.5, riz: 0.3 }[kind] / (peak || 1);
    const buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = out[i] * g;
    return buf;
  }
  function drumBuf(kind) {
    if (!drums[kind]) drums[kind] = [0, 1, 2].map(() => renderDrum(kind));
    const v = drums[kind];
    return v[(Math.random() * v.length) | 0];
  }
  function drum(kind, vel, delay) {
    if (!ctx) return;
    const t = ctx.currentTime + Math.max(0, delay);
    const src = ctx.createBufferSource();
    src.buffer = drumBuf(kind);
    const g = ctx.createGain();
    g.gain.value = vel * (0.9 + Math.random() * 0.15);
    const send = ctx.createGain(); send.gain.value = 0.35;
    src.connect(g); g.connect(dry); g.connect(send); send.connect(verbIn);
    src.start(t);
    src.g = g;
    pending.push({ src, t });
  }

  // Accompaniment notes scheduled ahead of time; cancelPending() drops whatever has not started yet.
  function playAt(inst, midis, vel, delay) {
    if (!ctx) return;
    const t = ctx.currentTime + Math.max(0, delay);
    for (const m of midis) pending.push({ src: start(inst, m, vel, t), t });
    if (pending.length > 64) pending = pending.filter(p => p.t > ctx.currentTime);
  }
  function cancelPending() {
    if (!ctx) return;
    const now = ctx.currentTime + 0.005;
    for (const p of pending) if (p.t > now) { try { p.src.stop(); } catch (e) {} }
    pending = [];
  }

  function fail() {
    cancelPending();
    if (!ctx) return;
    const t = ctx.currentTime;
    [40, 41, 46].forEach(m => {
      const src = ctx.createBufferSource(); src.buffer = get('piano', m);
      const g = ctx.createGain(); g.gain.value = 0.9;
      src.connect(g); g.connect(dry); g.connect(verbIn); src.start(t);
    });
    const o = ctx.createOscillator(), og = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.5);
    lp.type = 'lowpass'; lp.frequency.value = 700;
    og.gain.setValueAtTime(0.25, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    o.connect(lp); lp.connect(og); og.connect(master); o.start(t); o.stop(t + 0.6);
  }

  function chime(inst, midis, gap = 0.09) {
    if (!ctx) return;
    midis.forEach((m, i) => setTimeout(() => play(inst, [m], 0.7), i * gap * 1000));
  }

  function toggle() {
    enabled = !enabled;
    try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (e) {}
    if (ctx) master.gain.setTargetAtTime(enabled ? 0.9 : 0, ctx.currentTime, 0.05);
    return enabled;
  }

  return {
    init, resume, suspend, preload, play, release, playAt, drum, cancelPending, fail, chime, toggle,
    get ready() { return !!ctx; },
    get enabled() { return enabled; },
  };
})();
