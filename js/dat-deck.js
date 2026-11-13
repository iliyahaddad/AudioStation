'use strict';
/* Digital Audio Transport: buffer playback + recorder */
const REC_MAX = 120;
class DatDeck extends Deck {
  constructor() { super('dat', 'wave', DAT_TRACKS.slice()); this.recL = []; this.recR = []; this.recLen = 0; this.takes = 0; }
  now() { if (this.recording) return ctx ? this.recLen / ctx.sampleRate : 0; return super.now(); }
  play() { if (this.state === 'recpause') { this.state = 'rec'; return true; } if (this.state === 'rec') return true; return super.play(); }
  pause() { if (this.state === 'rec') { this.state = 'recpause'; return; } if (this.state === 'recpause') { this.state = 'rec'; return; } super.pause(); }
  stop() { if (this.recording) { this.finishRec(); return; } super.stop(); }
  record() {
    if (this.recording || !power.dat || !initAudio()) return;
    if (!G.canRec && G.recReady) { G.recReady.then(() => this.record()); return; }
    if (!G.canRec) { openDialog(NAMES.dat, textBody('Recording is not available in this browser.')); return; }
    this._halt(); this.recL = []; this.recR = []; this.recLen = 0; this.pos = 0; this.state = 'rec'; G.recGate.gain.value = 1;
    tape.dpos = 0; tape.v = 0;
  }
  finishRec() {
    G.recGate.gain.value = 0;
    if (this.recLen > 0) {
      const L = new Float32Array(this.recLen), R = new Float32Array(this.recLen); let o = 0;
      this.recL.forEach((c, i) => { L.set(c, o); R.set(this.recR[i], o); o += c.length; });
      this.takes++;
      this.items.push({ kind: 'buffer', name: 'TAKE' + this.takes + '.WAV', L, R, rate: ctx.sampleRate, dur: this.recLen / ctx.sampleRate, buffer: null });
      this.index = this.items.length - 1;
    }
    this.recL = []; this.recR = []; this.recLen = 0; this.pos = 0; this.state = 'stop'; this.trackChanged(); this.changed();
  }
  trackChanged() { tape.dpos = 0; tape.v = 0; }
  tick() { super.tick(); if (this.state === 'rec' && this.recLen / ctx.sampleRate >= REC_MAX) this.stop(); }
}
const dat = new DatDeck();

