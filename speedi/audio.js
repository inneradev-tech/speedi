// Procedural synthwave soundtrack + game SFX, all generated with the Web Audio API (no audio files).
const Sound = (() => {
  'use strict';

  const KEY = 'speedi.sound';
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== '0'; } catch (e) {}

  let ctx = null;
  let master, musicBus, musicLP, pump, sfx, verbIn, dlyIn, noiseBuf;
  let eng = null;

  const BPM = 118;
  const S16 = 60 / BPM / 4;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // ---------- song data (A minor: Am – F – C – G) ----------
  const CHORDS = [
    { b: 45, pad: [57, 60, 64], arp: [69, 72, 76, 81] },
    { b: 41, pad: [57, 60, 65], arp: [65, 69, 72, 77] },
    { b: 48, pad: [55, 60, 64], arp: [67, 72, 76, 79] },
    { b: 43, pad: [55, 59, 62], arp: [67, 71, 74, 79] },
  ];
  const BASS_OCT = [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 12, 0, 12];
  const ARP = [0, 1, 2, 3, 1, 2, 3, 2, 0, 1, 2, 3, 1, 2, 3, 2];
  // [bar, step, midi, length in 16ths]
  const LEAD_A = [
    [0, 0, 76, 6], [0, 6, 74, 2], [0, 8, 72, 4], [0, 12, 71, 4],
    [1, 0, 72, 6], [1, 6, 69, 2], [1, 8, 72, 4], [1, 12, 77, 4],
    [2, 0, 76, 8], [2, 8, 79, 4], [2, 12, 76, 4],
    [3, 0, 74, 10], [3, 10, 71, 2], [3, 12, 74, 4],
  ];
  const LEAD_B = [
    [0, 0, 81, 6], [0, 6, 79, 2], [0, 8, 76, 4], [0, 12, 72, 4],
    [1, 0, 77, 6], [1, 6, 76, 2], [1, 8, 72, 4], [1, 12, 69, 4],
    [2, 0, 72, 4], [2, 4, 76, 4], [2, 8, 79, 8],
    [3, 0, 74, 6], [3, 6, 76, 2], [3, 8, 79, 8],
  ];
  const SONG = [
    { bars: 4, kick: 1, hat: 0, snare: 0, bass: 1, pad: 1, arp: 0, lead: 0 },
    { bars: 4, kick: 1, hat: 1, snare: 1, bass: 1, pad: 1, arp: 1, lead: 0 },
    { bars: 8, kick: 1, hat: 1, snare: 1, bass: 1, pad: 1, arp: 1, lead: 1 },
    { bars: 4, kick: 0, hat: 1, snare: 0, bass: 0, pad: 1, arp: 1, lead: 0, fill: 1 },
    { bars: 8, kick: 1, hat: 1, snare: 1, bass: 1, pad: 1, arp: 1, lead: 1 },
  ];
  const LOOP_FROM = 1;

  let musicOn = false, timer = 0, nextT = 0, step = 0, sec = 0, secBar = 0, bar = 0;

  // ---------- node helpers ----------
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
    // Lets iOS play Web Audio even when the hardware silent switch is on.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    ctx = new AC();

    master = gain(enabled ? 0.9 : 0);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 3.5;
    comp.attack.value = 0.004; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);

    musicLP = filt('lowpass', 18000, 0.8);
    musicBus = gain(0.5);
    musicBus.connect(musicLP); musicLP.connect(master);
    pump = gain(1); pump.connect(musicBus);

    const verb = ctx.createConvolver(); verb.buffer = impulse(2.6, 3.2);
    verbIn = gain(1); const verbOut = gain(0.55);
    verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(musicBus);

    const dly = ctx.createDelay(1.5); dly.delayTime.value = S16 * 3;
    const fb = gain(0.36), dlp = filt('lowpass', 2600);
    dlyIn = gain(1);
    dlyIn.connect(dly); dly.connect(dlp); dlp.connect(fb); fb.connect(dly);
    const dlyOut = gain(0.6); dlp.connect(dlyOut); dlyOut.connect(musicBus);

    sfx = gain(0.9); sfx.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    resume();
  }

  function resume() { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); }
  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); }

  // ---------- instruments ----------
  function kick(t) {
    const o = osc('sine', 160), g = gain(0.0001);
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.45);
    // side-chain "pump" on pads / bass / arp
    pump.gain.cancelScheduledValues(t);
    pump.gain.setValueAtTime(0.28, t);
    pump.gain.linearRampToValueAtTime(1, t + 0.26);
  }

  function snare(t, v = 1) {
    const n = noiseSrc(), hp = filt('highpass', 1300), g = gain(0.0001);
    g.gain.setValueAtTime(0.42 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    n.connect(hp); hp.connect(g); g.connect(musicBus);
    const send = gain(0.45); g.connect(send); send.connect(verbIn);
    n.start(t, Math.random() * 1.5, 0.3);
    const o = osc('triangle', 210), og = gain(0.0001);
    o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    og.gain.setValueAtTime(0.3 * v, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(og); og.connect(musicBus); o.start(t); o.stop(t + 0.12);
  }

  function hat(t, v, open) {
    const n = noiseSrc(), hp = filt('highpass', 7800), g = gain(0.0001);
    const d = open ? 0.16 : 0.045;
    g.gain.setValueAtTime(0.14 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    n.connect(hp); hp.connect(g); g.connect(musicBus);
    n.start(t, Math.random() * 1.5, d + 0.02);
  }

  function crashCym(t) {
    const n = noiseSrc(), hp = filt('highpass', 5000), g = gain(0.0001);
    g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    n.connect(hp); hp.connect(g); g.connect(musicBus);
    const send = gain(0.5); g.connect(send); send.connect(verbIn);
    n.start(t, 0, 1.9);
  }

  function bass(t, m, v) {
    const f = mtof(m), dur = S16 * 0.92;
    const o1 = osc('sawtooth', f), o2 = osc('sine', f / 2);
    const lp = filt('lowpass', 2000, 7), g = gain(0.0001), sub = gain(0.55);
    lp.frequency.setValueAtTime(900 + 1500 * v, t);
    lp.frequency.exponentialRampToValueAtTime(240, t + 0.13);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o1.connect(lp); o2.connect(sub); sub.connect(lp); lp.connect(g); g.connect(pump);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }

  function pad(t, notes, dur) {
    const lp = filt('lowpass', 700, 0.6), g = gain(0.0001);
    lp.frequency.setValueAtTime(650, t);
    lp.frequency.linearRampToValueAtTime(1700, t + dur * 0.75);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.35);
    g.gain.setValueAtTime(0.1, t + dur);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.5);
    lp.connect(g); g.connect(pump);
    const send = gain(0.7); g.connect(send); send.connect(verbIn);
    for (const m of notes) {
      for (const det of [-9, 9]) {
        const o = osc('sawtooth', mtof(m)); o.detune.value = det;
        o.connect(lp); o.start(t); o.stop(t + dur + 0.55);
      }
    }
  }

  function arp(t, m, v) {
    const o = osc('sawtooth', mtof(m)), lp = filt('lowpass', 3000, 3), g = gain(0.0001);
    lp.frequency.setValueAtTime(3400, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.075 * v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(lp); lp.connect(g); g.connect(pump);
    const send = gain(0.5); g.connect(send); send.connect(dlyIn);
    o.start(t); o.stop(t + 0.22);
  }

  function lead(t, m, dur) {
    const f = mtof(m);
    const o1 = osc('sawtooth', f), o2 = osc('sawtooth', f);
    o1.detune.value = -7; o2.detune.value = 7;
    const lfo = osc('sine', 5.3), lg = gain(0);
    lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(16, t + 0.3);
    lfo.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune);
    const lp = filt('lowpass', 2600, 1.2), g = gain(0.0001);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.085, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.065, t + 0.25);
    g.gain.setValueAtTime(0.065, t + dur);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.28);
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(musicBus);
    const ds = gain(0.35); g.connect(ds); ds.connect(dlyIn);
    const vs = gain(0.4); g.connect(vs); vs.connect(verbIn);
    const end = t + dur + 0.3;
    o1.start(t); o2.start(t); lfo.start(t);
    o1.stop(end); o2.stop(end); lfo.stop(end);
  }

  // ---------- sequencer ----------
  function playStep(s, t) {
    const S = SONG[sec];
    const ch = CHORDS[bar % 4];
    const beat = s % 4 === 0;

    if (s === 0) {
      if (secBar === 0 && sec !== 0) crashCym(t);
      if (S.pad) pad(t, ch.pad, S16 * 16);
    }
    if (S.kick && beat) kick(t);
    if (S.snare && (s === 4 || s === 12)) snare(t, 1);
    if (S.fill && secBar === S.bars - 1 && s >= 8) snare(t, 0.35 + (s - 8) * 0.08);
    if (S.hat) {
      const off = s % 4 === 2;
      hat(t, off ? 1 : 0.4, off && s === 14);
    }
    if (S.bass) bass(t, ch.b + BASS_OCT[s], beat ? 1 : 0.55);
    if (S.arp) arp(t, ch.arp[ARP[s]], beat ? 1 : 0.7);
    if (S.lead) {
      const phrase = (secBar >> 2) % 2 ? LEAD_B : LEAD_A;
      const b = secBar % 4;
      for (const n of phrase) if (n[0] === b && n[1] === s) lead(t, n[2], n[3] * S16);
    }
  }

  function tick() {
    if (!ctx) return;
    while (nextT < ctx.currentTime + 0.12) {
      playStep(step, nextT);
      nextT += S16;
      if (++step === 16) {
        step = 0; bar++;
        if (++secBar >= SONG[sec].bars) {
          secBar = 0;
          sec = sec + 1 >= SONG.length ? LOOP_FROM : sec + 1;
        }
      }
    }
  }

  function startMusic() {
    if (!ctx || musicOn) return;
    musicOn = true;
    step = 0; sec = 0; secBar = 0; bar = 0;
    nextT = ctx.currentTime + 0.08;
    timer = setInterval(tick, 25);
    tick();
  }

  function setMood(mood) {
    if (!ctx) return;
    const f = mood === 'full' ? 18000 : 650;
    musicLP.frequency.cancelScheduledValues(ctx.currentTime);
    musicLP.frequency.setTargetAtTime(f, ctx.currentTime, mood === 'full' ? 0.15 : 0.35);
  }

  // ---------- engine / ambience ----------
  function engineStart() {
    if (!ctx || eng) return;
    const o1 = osc('sawtooth', 50), o2 = osc('square', 25);
    const o2g = gain(0.45), lp = filt('lowpass', 500, 2.5), g = gain(0);
    o1.connect(lp); o2.connect(o2g); o2g.connect(lp); lp.connect(g); g.connect(sfx);

    const wn = noiseSrc(); wn.loop = true;
    const wbp = filt('bandpass', 900, 0.6), wg = gain(0);
    wn.connect(wbp); wbp.connect(wg); wg.connect(sfx);

    const eo = osc('square', 38), elp = filt('lowpass', 220, 1), eg = gain(0);
    eo.connect(elp); elp.connect(eg); eg.connect(sfx);

    o1.start(); o2.start(); wn.start(); eo.start();
    eng = { o1, o2, lp, g, wg, wbp, eg };
  }

  const GEARS = [0, 0.2, 0.38, 0.56, 0.76, 1.3];
  function engineUpdate(sp, nitro, edge, active) {
    if (!eng) return;
    const now = ctx.currentTime;
    let gi = 0;
    while (gi < GEARS.length - 2 && sp > GEARS[gi + 1]) gi++;
    const r = Math.min(1, Math.max(0, (sp - GEARS[gi]) / (GEARS[gi + 1] - GEARS[gi])));
    const rpm = 0.32 + 0.68 * r;
    const f = 40 + rpm * 85 + (nitro ? 14 : 0);
    eng.o1.frequency.setTargetAtTime(f, now, 0.04);
    eng.o2.frequency.setTargetAtTime(f * 0.5, now, 0.04);
    eng.lp.frequency.setTargetAtTime(300 + rpm * 1300 + (nitro ? 900 : 0), now, 0.05);
    eng.g.gain.setTargetAtTime(active ? 0.05 + rpm * 0.045 : 0, now, active ? 0.08 : 0.3);
    eng.wg.gain.setTargetAtTime(active ? Math.min(1, sp) * sp * 0.07 + (nitro ? 0.06 : 0) : 0, now, 0.15);
    eng.wbp.frequency.setTargetAtTime(600 + sp * 1400, now, 0.2);
    eng.eg.gain.setTargetAtTime(active && edge ? 0.1 : 0, now, 0.03);
  }

  // ---------- one-shot SFX ----------
  function crash() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = noiseSrc(), lp = filt('lowpass', 4000, 0.8), g = gain(0.0001);
    lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(200, t + 0.9);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    n.connect(lp); lp.connect(g); g.connect(sfx); n.start(t, 0, 1.2);

    const o = osc('sine', 120), og = gain(0.0001);
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.3);
    og.gain.setValueAtTime(1, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(og); og.connect(sfx); o.start(t); o.stop(t + 0.5);

    const bp = filt('bandpass', 1900, 4), mg = gain(0.0001);
    mg.gain.setValueAtTime(0.12, t); mg.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    bp.connect(mg); mg.connect(sfx);
    for (const f of [431, 587, 933, 1277]) {
      const m = osc('square', f); m.connect(bp); m.start(t); m.stop(t + 0.62);
    }
  }

  const CHIME = [81, 84, 86, 88, 91, 93, 96];
  function nearMiss(combo) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = noiseSrc(), bp = filt('bandpass', 500, 1.4), g = gain(0.0001);
    bp.frequency.setValueAtTime(450, t); bp.frequency.exponentialRampToValueAtTime(2800, t + 0.28);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    n.connect(bp); bp.connect(g); g.connect(sfx); n.start(t, Math.random(), 0.4);

    const m = CHIME[Math.min(combo - 1, CHIME.length - 1)];
    [[m, 0.03], [m + 7, 0.09]].forEach(([note, dt]) => {
      const o = osc('triangle', mtof(note)), og = gain(0.0001);
      og.gain.setValueAtTime(0.0001, t + dt);
      og.gain.exponentialRampToValueAtTime(0.13, t + dt + 0.01);
      og.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.4);
      o.connect(og); og.connect(sfx);
      const s = gain(0.4); og.connect(s); s.connect(dlyIn);
      o.start(t + dt); o.stop(t + dt + 0.45);
    });
  }

  function nitro() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = noiseSrc(), bp = filt('bandpass', 300, 0.9), g = gain(0.0001);
    bp.frequency.setValueAtTime(250, t); bp.frequency.exponentialRampToValueAtTime(2400, t + 0.7);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
    n.connect(bp); bp.connect(g); g.connect(sfx); n.start(t, 0, 1.4);
    const o = osc('sine', 70), og = gain(0.0001);
    og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(og); og.connect(sfx); o.start(t); o.stop(t + 0.4);
  }

  function click() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = osc('triangle', 880), g = gain(0.0001);
    o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(1320, t + 0.05);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 0.1);
  }

  function toggle() {
    enabled = !enabled;
    try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (e) {}
    if (ctx) master.gain.setTargetAtTime(enabled ? 0.9 : 0, ctx.currentTime, 0.05);
    return enabled;
  }

  return {
    init, resume, suspend, startMusic, setMood,
    engineStart, engineUpdate, crash, nearMiss, nitro, click, toggle,
    get enabled() { return enabled; },
  };
})();
