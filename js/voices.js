'use strict';
/* ---------- synthesizer voices ---------- */
const INST = {
  lead: { w: 'square', a: .01, s: .55, r: .08, cut: 2400, g: .15, pan: .1 },
  pad: { w: 'sawtooth', a: .2, s: .9, r: .35, cut: 1000, g: .05, det: 8, pan: -.2 },
  bass: { w: 'sawtooth', a: .005, s: .7, r: .05, cut: 520, g: .26, pan: 0 },
  arp: { w: 'triangle', a: .004, s: 0, dec: .12, cut: 4000, g: .13, pan: .45 },
  bell: { w: 'sine', a: .002, s: 0, dec: .5, cut: 8000, g: .12, pan: -.45, fm: 3.01 },
  soft: { w: 'triangle', a: .08, s: .8, r: .2, cut: 1800, g: .1, pan: .3 },
  stab: { w: 'sawtooth', a: .004, s: 0, dec: .09, cut: 1900, g: .07, pan: -.35 },
  keys: { w: 'triangle', a: .003, s: 0, dec: .55, cut: 3600, g: .16, pan: 0, fm: 2 },
  organ: { w: 'square', a: .01, s: .85, r: .06, cut: 1600, g: .06, pan: 0 },
  pluck: { w: 'sawtooth', a: .002, s: 0, dec: .28, cut: 2600, g: .09, pan: 0 },
  brass: { w: 'sawtooth', a: .04, s: .8, r: .1, cut: 1700, g: .08, pan: 0 },
};
function playVoice(out, e, t) {
  t = Math.max(t, ctx.currentTime + .005);
  if (e.inst === 'kick' || e.inst === 'tom') {
    const tom = e.inst === 'tom', f0 = tom ? 90 + (e.m - 41) * 14 : 150;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(tom ? f0 * .55 : 45, t + .12);
    g.gain.setValueAtTime((tom ? .5 : .9) * e.v, t); g.gain.exponentialRampToValueAtTime(.001, t + .28);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + .3); return;
  }
  if (e.inst === 'snare' || e.inst === 'hat' || e.inst === 'open') {
    const sn = e.inst === 'snare', len = sn ? .18 : e.inst === 'open' ? .28 : .05;
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = noiseBuf; f.type = sn ? 'bandpass' : 'highpass'; f.frequency.value = sn ? 1900 : 7500;
    g.gain.setValueAtTime((sn ? .55 : .2) * e.v, t); g.gain.exponentialRampToValueAtTime(.001, t + len);
    n.connect(f); f.connect(g); g.connect(out); n.start(t, Math.random() * .5); n.stop(t + len + .02);
    if (sn) {
      const o = ctx.createOscillator(), g2 = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 190;
      g2.gain.setValueAtTime(.3 * e.v, t); g2.gain.exponentialRampToValueAtTime(.001, t + .09);
      o.connect(g2); g2.connect(out); o.start(t); o.stop(t + .1);
    }
    return;
  }
  const n = INST[e.inst] || INST.keys, f0 = 440 * Math.pow(2, (e.m - 69) / 12), peak = n.g * e.v;
  const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = n.cut; lp.Q.value = .7;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + n.a);
  let end;
  if (n.s === 0) { g.gain.setTargetAtTime(0, t + n.a, n.dec); end = t + n.a + n.dec * 6; }
  else { const d = Math.max(e.d || .2, n.a + .01); g.gain.setTargetAtTime(peak * n.s, t + n.a, .12); g.gain.setTargetAtTime(0, t + d, n.r / 3); end = t + d + n.r * 2; }
  const osc = (type, f, det) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; o.start(t); o.stop(end); return o; };
  if (n.det) { osc(n.w, f0, n.det).connect(lp); osc(n.w, f0, -n.det).connect(lp); } else osc(n.w, f0).connect(lp);
  if (n.fm) { const g2 = ctx.createGain(); g2.gain.value = .35; osc('sine', f0 * n.fm).connect(g2); g2.connect(lp); }
  lp.connect(g);
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = e.pan ?? n.pan; g.connect(p); p.connect(out); } else g.connect(out);
}

