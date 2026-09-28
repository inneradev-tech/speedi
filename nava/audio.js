// Piano and santur voices synthesised note-by-note into cached AudioBuffers (additive synthesis),
// so quarter tones (koron / sori) are tuned exactly. No audio files are used.
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

  function render(inst, midi) {
    const v = VOICES[inst];
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
    return src;
  }

  // Get everything a song needs ready: the piano samples, or the rendered santur notes
  // (a few per frame so the UI never freezes).
  function preload(inst, midis, onProgress) {
    if (!ctx) return Promise.resolve();
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
    midis.forEach((m, i) => start(inst, m, vel * h * (i === 0 ? 1 : restVel), t + i * 0.006));
  }

  // Accompaniment notes scheduled ahead of time; cancelPending() drops whatever has not started yet.
  let pending = [];
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
    init, resume, suspend, preload, play, playAt, cancelPending, fail, chime, toggle,
    get ready() { return !!ctx; },
    get enabled() { return enabled; },
  };
})();
