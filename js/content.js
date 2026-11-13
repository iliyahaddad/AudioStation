'use strict';
/* ---------- built-in song generator (stand-in content) ---------- */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const BASS = {
  eighths: [[0, 0, .45], [.5, 0, .45], [1, 0, .45], [1.5, 0, .45], [2, 0, .45], [2.5, 0, .45], [3, 4, .45], [3.5, 4, .45]],
  walk: [[0, 0, .9], [1, 2, .9], [2, 4, .9], [3, 5, .9]],
  push: [[0, 0, 1.4], [1.5, 0, .45], [2, 4, 1.4], [3.5, 4, .45]],
};
function buildSong(s) {
  const R = rng(s.seed), beat = 60 / s.bpm, ev = [];
  const scale = s.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const note = (deg, oct) => s.key + 12 * oct + 12 * Math.floor(deg / 7) + scale[((deg % 7) + 7) % 7];
  const add = (b, ch, inst, m, d, v) => ev.push({ t: b * beat, ch, inst, m, d: d * beat, v });
  const rhythms = [
    [[0, 1], [1, 1], [2, 1.5], [3.5, .5]], [[0, 1.5], [1.5, .5], [2, 1], [3, 1]], [[0, .5], [.5, .5], [1, 1], [2, 2]],
    [[0, 2], [2, 1], [3, .5], [3.5, .5]], [[0, 1], [1, .5], [1.5, .5], [2, 1], [3, 1]],
  ];
  const phrase = []; let cur = 4;
  for (let i = 0; i < 8; i++) {
    const cd = s.prog[i % s.prog.length], rh = rhythms[Math.floor(R() * rhythms.length)];
    phrase.push(rh.map(([b, d], j) => {
      if (j === 0) cur = [cd, cd + 2, cd + 4, cd + 7].reduce((a, o) => Math.abs(o - cur) < Math.abs(a - cur) ? o : a);
      else cur += [-2, -1, -1, 1, 1, 2][Math.floor(R() * 6)];
      cur = clamp(cur, 0, 11); return [b, d, cur];
    }));
  }
  const B = s.bars, half = Math.floor(B / 2), bass = BASS[s.bass], step = s.arp16 ? .25 : .5;
  for (let bar = 0; bar < B; bar++) {
    const b0 = bar * 4, last = bar === B - 1, deg = last ? 0 : s.prog[bar % s.prog.length], tri = [deg, deg + 2, deg + 4];
    const brk = bar >= half && bar < half + 2, intro = bar < 2, late = bar >= half + 2;
    if (last) {
      tri.forEach(d => add(b0, 1, 'pad', note(d, 0), 4, .5));
      add(b0, 2, 'bass', note(0, -1), 3, .9); add(b0, 0, 'lead', note(7, 0), 3, .8); add(b0, 4, 'bell', note(4, 2), 3, .7);
      add(b0, 9, 'kick', 36, 0, 1); add(b0, 9, 'open', 46, 0, .8); continue;
    }
    tri.forEach(d => add(b0, 1, 'pad', note(d, 0), 4, .45));
    for (let i = 0; i < 4 / step; i++) add(b0 + i * step, 3, 'arp', note(tri[[0, 1, 2, 1][i % 4]] + (s.arp16 && i % 8 >= 4 ? 7 : 0), 2), step * .9, intro || brk ? .6 : .4);
    if (!intro && !brk) {
      bass.forEach(([b, off, d]) => add(b0 + b, 2, 'bass', note(deg + off, -1), d, .85));
      s.kick.forEach(b => add(b0 + b, 9, 'kick', 36, 0, 1));
      [1, 3].forEach(b => add(b0 + b, 9, 'snare', 38, 0, .8));
      for (let i = 0; i < 8; i++) add(b0 + i * .5 + (i % 2 ? s.swing || 0 : 0), 9, i === 7 && bar % 4 === 3 ? 'open' : 'hat', 42, 0, i % 2 ? .35 : .55);
      if (bar % 4 === 3) [3.25, 3.5, 3.75].forEach((b, i) => add(b0 + b, 9, 'snare', 38, 0, .45 + .12 * i));
    }
    if (bar >= 4 && !brk) {
      phrase[bar % 8].forEach(([b, d, m]) => { add(b0 + b, 0, 'lead', note(m, 1), d * .92, .75); if (late) add(b0 + b, 6, 'soft', note(m, 2), d * .9, .3); });
    }
    if (late) {
      add(b0, 5, 'soft', note(deg + 2, 1), 2, .5); add(b0 + 2, 5, 'soft', note(deg + 4, 1), 2, .5);
      [1.5, 3.5].forEach(b => tri.forEach(d => add(b0 + b, 7, 'stab', note(d, 1), .3, .5)));
    }
    if (bar % 2 === 0 && (brk || bar >= 4)) add(b0, 4, 'bell', note(deg + 4, 2), 2, .55);
  }
  ev.sort((a, b) => a.t - b.t);
  return {
    kind: 'seq', builtin: true, name: s.name || s.title, events: ev, dur: B * 4 * beat + .5,
    chNames: { 0: 'Lead', 1: 'Pad', 2: 'Bass', 3: 'Arp', 4: 'Bell', 5: 'Flute', 6: 'Octave', 7: 'Stab', 9: 'Drums' },
  };
}
const CD_SONGS = [
  { title: 'Sunrise Drive', seed: 11, bpm: 118, bars: 24, key: 52, prog: [0, 4, 5, 3], bass: 'eighths', kick: [0, 2], arp16: false },
  { title: 'Harbor Lights', seed: 23, bpm: 92, bars: 20, key: 50, minor: true, prog: [0, 5, 3, 4], bass: 'walk', kick: [0, 2.5], arp16: true, swing: .06 },
  { title: 'Night Circuit', seed: 37, bpm: 128, bars: 28, key: 45, minor: true, prog: [0, 0, 5, 6], bass: 'eighths', kick: [0, 1, 2, 3], arp16: true },
  { title: 'Paper Planes', seed: 41, bpm: 104, bars: 20, key: 55, prog: [0, 3, 0, 4], bass: 'push', kick: [0, 1.5, 2], arp16: false },
].map(buildSong);
const MIDI_SONGS = [
  { name: 'CANYON.MID', seed: 7, bpm: 116, bars: 28, key: 52, prog: [0, 4, 5, 3], bass: 'push', kick: [0, 1.5, 2], arp16: true },
  { name: 'PASSPORT.MID', seed: 19, bpm: 98, bars: 22, key: 48, minor: true, prog: [0, 5, 2, 6], bass: 'walk', kick: [0, 2], arp16: false, swing: .08 },
  { name: 'ONESTOP.MID', seed: 53, bpm: 132, bars: 30, key: 50, prog: [0, 5, 3, 4], bass: 'eighths', kick: [0, 1, 2, 3], arp16: true },
].map(buildSong);

/* ---------- DAT built-in wave files (synthesised at load) ---------- */
const SR = 44100;
function synth(len, fn) {
  const n = Math.floor(len * SR), L = new Float32Array(n), R = new Float32Array(n);
  fn((start, freq, dur, amp, parts, decay, pan = 0, attack = .003) => {
    const s0 = Math.floor(start * SR), ns = Math.min(n - s0, Math.floor(dur * SR));
    const gl = amp * Math.cos((pan + 1) * Math.PI / 4), gr = amp * Math.sin((pan + 1) * Math.PI / 4);
    for (let i = 0; i < ns; i++) {
      const t = i / SR; let v = 0;
      for (const [mult, a, dk] of parts) v += a * Math.sin(2 * Math.PI * freq * mult * t) * Math.exp(-t * decay * dk);
      v *= Math.min(1, t / attack) * Math.min(1, (dur - t) / .03);
      L[s0 + i] += v * gl; R[s0 + i] += v * gr;
    }
  });
  return { kind: 'buffer', builtin: true, L, R, rate: SR, dur: n / SR, buffer: null };
}
const BELL = [[1, 1, 1], [2.76, .45, 1.6], [5.4, .25, 2.4], [8.93, .1, 3.2]];
const ORGAN = [[1, 1, 1], [2, .5, 1.3], [3, .25, 1.6], [4, .12, 2]];
const BRASS = [[1, 1, 1], [2, .6, 1], [3, .4, 1.1], [4, .25, 1.2], [5, .15, 1.3]];
const DAT_TRACKS = [
  Object.assign(synth(3.4, t => { [[0, 1318.5, -.5], [.36, 1046.5, .3], [.72, 1174.7, -.2], [1.08, 784, .5], [1.5, 1046.5, 0]].forEach(([s, f, p]) => t(s, f, 1.9, .3, BELL, 2.6, p)); }), { name: 'CHIMES.WAV' }),
  Object.assign(synth(2.2, t => { [261.6, 329.6, 392, 523.3].forEach((f, i) => t(0, f, 2.2, .2, ORGAN, 2, i / 1.5 - 1, .012)); }), { name: 'CHORD.WAV' }),
  Object.assign(synth(1.6, t => { t(0, 1568, 1.6, .45, BELL, 3.2, 0); }), { name: 'DING.WAV' }),
  Object.assign(synth(2.2, t => { [392, 493.9, 587.3].forEach(f => t(0, f, .16, .13, BRASS, 1, -.3, .01)); [523.3, 659.3, 784, 1046.5].forEach((f, i) => t(.2, f, 2, .13, BRASS, 1.5, i / 3 - .5, .012)); }), { name: 'TADA.WAV' }),
];

