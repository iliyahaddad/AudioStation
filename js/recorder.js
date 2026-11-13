'use strict';
/* DAT recorder tap: AudioWorklet (ScriptProcessorNode only as a fallback). */
const WORKLET_SRC = `class RecTap extends AudioWorkletProcessor {
  constructor() { super(); this.l = []; this.r = []; this.n = 0; }
  process(inputs) {
    const c = inputs[0];
    if (c && c[0]) {
      this.l.push(c[0].slice()); this.r.push((c[1] || c[0]).slice()); this.n += c[0].length;
      if (this.n >= 4096) {
        const L = new Float32Array(this.n), R = new Float32Array(this.n); let p = 0;
        for (let k = 0; k < this.l.length; k++) { L.set(this.l[k], p); R.set(this.r[k], p); p += this.l[k].length; }
        this.port.postMessage([L, R], [L.buffer, R.buffer]); this.l = []; this.r = []; this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor('rec-tap', RecTap);`;
function recTap(l, r) { if (dat.state !== 'rec') return; dat.recL.push(l); dat.recR.push(r); dat.recLen += l.length; }
function setupRecorder() {
  const z = ctx.createGain(); z.gain.value = 0; z.connect(ctx.destination);
  const legacy = () => {
    try {
      const proc = ctx.createScriptProcessor(4096, 2, 2);
      proc.onaudioprocess = e => recTap(new Float32Array(e.inputBuffer.getChannelData(0)), new Float32Array(e.inputBuffer.getChannelData(1)));
      G.recGate.connect(proc); proc.connect(z); G.canRec = true;
    } catch (err) { G.canRec = false; }
  };
  if (!(ctx.audioWorklet && window.AudioWorkletNode)) { legacy(); return; }
  G.recReady = ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'text/javascript' }))).then(() => {
    const n = new AudioWorkletNode(ctx, 'rec-tap', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit', outputChannelCount: [2] });
    n.port.onmessage = e => recTap(e.data[0], e.data[1]);
    G.recGate.connect(n); n.connect(z); G.canRec = true;
  }).catch(legacy).finally(() => { G.recReady = null; });
}
