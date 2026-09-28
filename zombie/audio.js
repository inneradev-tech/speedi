// Dark synth soundtrack + SFX for the zombie game, generated with the Web Audio API.
const Sound = (() => {
  'use strict';

  const KEY = 'undead.sound';
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== '0'; } catch (e) {}

  let ctx = null;
  let master, musicBus, musicLP, drumBus, pump, sfx, verbIn, dlyIn, noiseBuf;

  const BPM = 96;
  const S16 = 60 / BPM / 4;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // D minor: Dm – Bb – Gm – A
  const CHORDS = [
    { b: 38, pad: [62, 65, 69], bell: [74, 77, 81, 86] },
    { b: 34, pad: [62, 65, 70], bell: [74, 77, 82, 86] },
    { b: 31, pad: [62, 67, 70], bell: [74, 79, 82, 86] },
    { b: 33, pad: [61, 64, 69], bell: [73, 76, 81, 85] },
  ];
  const BELL = [0, -1, 2, -1, 1, -1, 3, -1, 0, -1, 2, -1, 1, 3, -1, 2];
  // [bar, step, midi, len16]
  const LEAD = [
    [0, 0, 74, 6], [0, 6, 72, 2], [0, 8, 69, 8],
    [1, 0, 70, 6], [1, 6, 69, 2], [1, 8, 65, 8],
    [2, 0, 67, 4], [2, 4, 70, 4], [2, 8, 74, 8],
    [3, 0, 73, 8], [3, 8, 69, 4], [3, 12, 64, 4],
  ];
  const SONG = [
    { bars: 4, beat: 0, hat: 0, bass: 1, pad: 1, bell: 1, lead: 0 },
    { bars: 4, beat: 1, hat: 1, bass: 1, pad: 1, bell: 1, lead: 0 },
    { bars: 8, beat: 1, hat: 1, bass: 1, pad: 1, bell: 1, lead: 1 },
    { bars: 4, beat: 0, hat: 1, bass: 0, pad: 1, bell: 1, lead: 0 },
    { bars: 8, beat: 1, hat: 1, bass: 1, pad: 1, bell: 0, lead: 1 },
  ];
  const LOOP_FROM = 1;
  let musicOn = false, timer = 0, nextT = 0, step = 0, sec = 0, secBar = 0, bar = 0;

  const gain = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const filt = (type, f, q) => {
    const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f;
    if (q !== undefined) b.Q.value = q; return b;
  };
  const osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; };
  const noiseSrc = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; return s; };

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

    master = gain(enabled ? 0.9 : 0);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 16; comp.ratio.value = 4;
    comp.attack.value = 0.003; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);

    musicLP = filt('lowpass', 18000, 0.7);
    musicBus = gain(0.5);
    musicBus.connect(musicLP); musicLP.connect(master);
    drumBus = gain(1); drumBus.connect(musicBus);
    pump = gain(1); pump.connect(musicBus);

    const verb = ctx.createConvolver(); verb.buffer = impulse(3.4, 2.6);
    verbIn = gain(1); const vo = gain(0.6);
    verbIn.connect(verb); verb.connect(vo); vo.connect(musicBus);

    const dly = ctx.createDelay(2); dly.delayTime.value = S16 * 3;
    const fb = gain(0.42), dlp = filt('lowpass', 2200);
    dlyIn = gain(1);
    dlyIn.connect(dly); dly.connect(dlp); dlp.connect(fb); fb.connect(dly);
    const dout = gain(0.55); dlp.connect(dout); dout.connect(musicBus);

    sfx = gain(0.85); sfx.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    resume();
  }

  function resume() { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); }
  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); }

  // ---------- instruments ----------
  function thump(t, v) {
    const o = osc('sine', 110), g = gain(0.0001);
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g); g.connect(drumBus); o.start(t); o.stop(t + 0.5);
    pump.gain.cancelScheduledValues(t);
    pump.gain.setValueAtTime(0.35, t);
    pump.gain.linearRampToValueAtTime(1, t + 0.3);
  }

  function snare(t) {
    const n = noiseSrc(), bp = filt('bandpass', 1800, 0.8), g = gain(0.0001);
    g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    n.connect(bp); bp.connect(g); g.connect(drumBus);
    const s = gain(0.7); g.connect(s); s.connect(verbIn);
    n.start(t, Math.random(), 0.35);
  }

  function tick(t, v) {
    const n = noiseSrc(), hp = filt('highpass', 8500), g = gain(0.0001);
    g.gain.setValueAtTime(0.1 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    n.connect(hp); hp.connect(g); g.connect(drumBus);
    n.start(t, Math.random() * 1.5, 0.05);
  }

  function bass(t, m, v) {
    const dur = S16 * 1.8;
    const o1 = osc('sawtooth', mtof(m)), o2 = osc('square', mtof(m) * 0.5);
    const og = gain(0.4), lp = filt('lowpass', 600, 9), g = gain(0.0001);
    lp.frequency.setValueAtTime(300 + 900 * v, t);
    lp.frequency.exponentialRampToValueAtTime(140, t + 0.2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o1.connect(lp); o2.connect(og); og.connect(lp); lp.connect(g); g.connect(pump);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }

  function pad(t, notes, dur) {
    const lp = filt('lowpass', 500, 2), g = gain(0.0001);
    const lfo = osc('sine', 0.23), lg = gain(260);
    lfo.connect(lg); lg.connect(lp.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.085, t + 0.6);
    g.gain.setValueAtTime(0.085, t + dur);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.9);
    lp.connect(g); g.connect(pump);
    const s = gain(0.8); g.connect(s); s.connect(verbIn);
    for (const m of notes) {
      for (const det of [-12, 0, 12]) {
        const o = osc(det ? 'sawtooth' : 'triangle', mtof(m - 12)); o.detune.value = det;
        o.connect(lp); o.start(t); o.stop(t + dur + 1);
      }
    }
    lfo.start(t); lfo.stop(t + dur + 1);
  }

  // Music-box bell: two sines at a non-integer ratio give the metallic tone.
  function bell(t, m, v) {
    const f = mtof(m), g = gain(0.0001);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07 * v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    const a = osc('sine', f), b = osc('sine', f * 2.76), bg = gain(0.3);
    a.connect(g); b.connect(bg); bg.connect(g);
    g.connect(musicBus);
    const d = gain(0.6); g.connect(d); d.connect(dlyIn);
    const r = gain(0.5); g.connect(r); r.connect(verbIn);
    a.start(t); b.start(t); a.stop(t + 1.25); b.stop(t + 1.25);
  }

  function lead(t, m, dur) {
    const f = mtof(m);
    const o1 = osc('sawtooth', f), o2 = osc('square', f * 0.5);
    const o2g = gain(0.25);
    const lfo = osc('sine', 4.6), lg = gain(0);
    lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(22, t + 0.4);
    lfo.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune);
    const lp = filt('lowpass', 1500, 2), g = gain(0.0001);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.06);
    g.gain.setValueAtTime(0.07, t + dur);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.4);
    o1.connect(lp); o2.connect(o2g); o2g.connect(lp); lp.connect(g); g.connect(musicBus);
    const d = gain(0.35); g.connect(d); d.connect(dlyIn);
    const r = gain(0.5); g.connect(r); r.connect(verbIn);
    const end = t + dur + 0.45;
    o1.start(t); o2.start(t); lfo.start(t); o1.stop(end); o2.stop(end); lfo.stop(end);
  }

  function swell(t) {
    const n = noiseSrc(), bp = filt('bandpass', 400, 3), g = gain(0.0001);
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(2600, t + S16 * 15);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + S16 * 15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + S16 * 16);
    n.connect(bp); bp.connect(g); g.connect(musicBus);
    n.loop = true; n.start(t); n.stop(t + S16 * 16 + 0.05);
  }

  function playStep(s, t) {
    const S = SONG[sec];
    const ch = CHORDS[bar % 4];
    if (s === 0 && S.pad) pad(t, ch.pad, S16 * 16);
    if (S.beat) {
      if (s === 0 || s === 3 || s === 8 || s === 11) thump(t, s === 0 || s === 8 ? 0.95 : 0.55);
      if (s === 4 || s === 12) snare(t);
    }
    if (S.hat && s % 2 === 0) tick(t, s % 4 === 2 ? 1 : 0.4);
    if (S.bass && s % 2 === 0) bass(t, ch.b + (s === 6 || s === 14 ? 12 : 0), s % 4 === 0 ? 1 : 0.5);
    if (S.bell && BELL[s] >= 0) bell(t, ch.bell[BELL[s]], s % 4 === 0 ? 1 : 0.6);
    if (S.lead) for (const n of LEAD) if (n[0] === secBar % 4 && n[1] === s) lead(t, n[2], n[3] * S16);
    if (s === 0 && secBar === S.bars - 1 && sec + 1 < SONG.length && SONG[sec + 1].beat) swell(t);
  }

  function run() {
    if (!ctx) return;
    while (nextT < ctx.currentTime + 0.12) {
      playStep(step, nextT);
      nextT += S16;
      if (++step === 16) {
        step = 0; bar++;
        if (++secBar >= SONG[sec].bars) { secBar = 0; sec = sec + 1 >= SONG.length ? LOOP_FROM : sec + 1; }
      }
    }
  }

  function startMusic() {
    if (!ctx || musicOn) return;
    musicOn = true;
    nextT = ctx.currentTime + 0.08;
    timer = setInterval(run, 25);
    run();
  }

  function setMood(mood) {
    if (!ctx) return;
    const now = ctx.currentTime;
    musicLP.frequency.cancelScheduledValues(now);
    musicLP.frequency.setTargetAtTime(mood === 'full' ? 18000 : 600, now, mood === 'full' ? 0.2 : 0.4);
  }

  // ---------- SFX ----------
  function shot() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = noiseSrc(), bp = filt('bandpass', 1400, 0.7), g = gain(0.0001);
    bp.frequency.setValueAtTime(2600, t); bp.frequency.exponentialRampToValueAtTime(500, t + 0.09);
    g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    n.connect(bp); bp.connect(g); g.connect(sfx); n.start(t, Math.random() * 1.5, 0.14);
    const o = osc('triangle', 160), og = gain(0.0001);
    o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.08);
    og.gain.setValueAtTime(0.28, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(og); og.connect(sfx); o.start(t); o.stop(t + 0.12);
  }

  function hit() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = noiseSrc(), lp = filt('lowpass', 900, 1.5), g = gain(0.0001);
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    n.connect(lp); lp.connect(g); g.connect(sfx); n.start(t, Math.random() * 1.5, 0.08);
  }

  // Groan: a detuned saw pair through two formant filters with a sagging pitch.
  function groan(vol = 0.18, low = 1) {
    if (!ctx) return;
    const t = ctx.currentTime, d = 0.5 + Math.random() * 0.5;
    const f = (70 + Math.random() * 40) * low;
    const a = osc('sawtooth', f), b = osc('sawtooth', f * 1.01);
    a.frequency.setValueAtTime(f * 1.15, t); a.frequency.linearRampToValueAtTime(f * 0.8, t + d);
    b.frequency.setValueAtTime(f * 1.16, t); b.frequency.linearRampToValueAtTime(f * 0.79, t + d);
    const f1 = filt('bandpass', 500, 5), f2 = filt('bandpass', 1100, 6), g = gain(0.0001);
    f1.frequency.setValueAtTime(700, t); f1.frequency.linearRampToValueAtTime(400, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.08);
    g.gain.setValueAtTime(vol, t + d * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    a.connect(f1); b.connect(f1); a.connect(f2); f1.connect(g); f2.connect(g); g.connect(sfx);
    a.start(t); b.start(t); a.stop(t + d + 0.05); b.stop(t + d + 0.05);
  }

  function hurt() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = osc('square', 220), lp = filt('lowpass', 900, 2), g = gain(0.0001);
    o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.18);
    g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(lp); lp.connect(g); g.connect(sfx); o.start(t); o.stop(t + 0.25);
    const n = noiseSrc(), ng = gain(0.0001), nl = filt('lowpass', 500);
    ng.gain.setValueAtTime(0.4, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    n.connect(nl); nl.connect(ng); ng.connect(sfx); n.start(t, 0, 0.2);
  }

  function chime(notes, gap = 0.07, vol = 0.14) {
    if (!ctx) return;
    const t = ctx.currentTime;
    notes.forEach((m, i) => {
      const s = t + i * gap, o = osc('triangle', mtof(m)), g = gain(0.0001);
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(vol, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.5);
      o.connect(g); g.connect(sfx);
      const d = gain(0.3); g.connect(d); d.connect(dlyIn);
      o.start(s); o.stop(s + 0.55);
    });
  }
  const pickup = () => chime([81, 88]);
  const upgrade = () => chime([74, 77, 81, 86], 0.08, 0.13);

  function wave() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [38, 38.1, 50].forEach(m => {
      const o = osc('sawtooth', mtof(m)), lp = filt('lowpass', 400, 1), g = gain(0.0001);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
      o.connect(lp); lp.connect(g); g.connect(sfx);
      const r = gain(0.6); g.connect(r); r.connect(verbIn);
      o.start(t); o.stop(t + 2.3);
    });
  }

  function death() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [50, 53, 57].forEach((m, i) => {
      const o = osc('sawtooth', mtof(m)), lp = filt('lowpass', 800), g = gain(0.0001);
      o.frequency.setValueAtTime(mtof(m), t); o.frequency.exponentialRampToValueAtTime(mtof(m - 12), t + 2);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.05 + i * 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
      o.connect(lp); lp.connect(g); g.connect(sfx);
      o.start(t); o.stop(t + 2.5);
    });
  }

  function toggle() {
    enabled = !enabled;
    try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (e) {}
    if (ctx) master.gain.setTargetAtTime(enabled ? 0.9 : 0, ctx.currentTime, 0.05);
    return enabled;
  }

  return {
    init, resume, suspend, startMusic, setMood,
    shot, hit, groan, hurt, pickup, upgrade, wave, death, click: () => chime([86], 0, 0.1), toggle,
    get enabled() { return enabled; },
  };
})();
