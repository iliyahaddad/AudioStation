'use strict';
/* ---------- audio graph ---------- */
let ctx = null, noiseBuf = null;
const G = { canRec: false, src: {} };
const SOURCES = ['wave', 'midi', 'cd', 'mic', 'line', 'pc'];
function stereoGain() {
  const input = ctx.createGain(); input.channelCount = 2; input.channelCountMode = 'explicit'; input.channelInterpretation = 'speakers';
  const sp = ctx.createChannelSplitter(2), mg = ctx.createChannelMerger(2), l = ctx.createGain(), r = ctx.createGain();
  input.connect(sp); sp.connect(l, 0); sp.connect(r, 1); l.connect(mg, 0, 0); r.connect(mg, 0, 1);
  return { input, output: mg, l, r };
}
function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { openDialog('AudioStation', html('<p>This browser does not support the Web Audio API, so AudioStation cannot produce sound.</p>')); return false; }
  ctx = new AC();
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  G.master = stereoGain();
  const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -8; lim.ratio.value = 12; lim.attack.value = .003;
  G.master.output.connect(lim);
  G.stereoOut = ctx.createGain(); G.monoOut = ctx.createGain();
  G.monoOut.channelCount = 1; G.monoOut.channelCountMode = 'explicit'; G.monoOut.channelInterpretation = 'speakers';
  lim.connect(G.stereoOut); lim.connect(G.monoOut); G.stereoOut.connect(ctx.destination); G.monoOut.connect(ctx.destination);
  G.recMaster = stereoGain();
  for (const id of SOURCES) {
    const bus = ctx.createGain(), play = stereoGain(), rec = stereoGain();
    bus.connect(play.input); play.output.connect(G.master.input);
    bus.connect(rec.input); rec.output.connect(G.recMaster.input);
    G.src[id] = { bus, play, rec };
  }
  G.recGate = ctx.createGain(); G.recGate.gain.value = 0; G.recMaster.output.connect(G.recGate);
  const vuIn = ctx.createGain(); vuIn.channelCount = 2; vuIn.channelCountMode = 'explicit';
  const sp = ctx.createChannelSplitter(2); vuIn.connect(sp);
  G.an = [0, 1].map(i => { const a = ctx.createAnalyser(); a.fftSize = 1024; sp.connect(a, i); return a; });
  G.src.wave.bus.connect(vuIn); G.recGate.connect(vuIn);
  setupRecorder();
  ctx.createMediaElementSource(cd.el).connect(G.src.cd.bus);
  applyMixer();
  return true;
}

/* PC speaker: square-wave beeper routed through its own mixer channel */
function beep(freq = 880, dur = .14) {
  if (!initAudio()) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + .01;
  o.type = 'square'; o.frequency.value = freq;
  g.gain.setValueAtTime(.12, t); g.gain.setValueAtTime(0, t + dur);
  o.connect(g); g.connect(G.src.pc.bus); o.start(t); o.stop(t + dur + .02);
}

