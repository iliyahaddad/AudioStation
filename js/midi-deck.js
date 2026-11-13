'use strict';
/* General MIDI: sequencer + Web MIDI input recorder */
class MidiDeck extends Deck {
  constructor() { super('midi', 'midi', MIDI_SONGS.slice()); this.takes = 0; this.recEv = []; this.recOpen = new Map(); this.recBase = 0; this.recStart = 0; this.inputs = []; }
  now() { if (this.recording) return this.recBase + (this.state === 'rec' ? ctx.currentTime - this.recStart : 0); return super.now(); }
  play() { if (this.state === 'recpause') { this.recStart = ctx.currentTime; this.state = 'rec'; return true; } if (this.state === 'rec') return true; return super.play(); }
  pause() {
    if (this.state === 'rec') { this.recBase = this.now(); this.state = 'recpause'; return; }
    if (this.state === 'recpause') { this.play(); return; }
    super.pause();
  }
  stop() { if (this.recording) { this.finishRec(); return; } super.stop(); }
  async record() {
    if (this.recording || !power.midi || !initAudio()) return;
    if (!navigator.requestMIDIAccess) { beep(); openDialog(NAMES.midi, textBody('This browser does not provide Web MIDI, so there is no MIDI input device to record from.')); return; }
    let acc;
    try { acc = await navigator.requestMIDIAccess(); } catch (e) { beep(); openDialog(NAMES.midi, textBody('Access to MIDI devices was denied.')); return; }
    const ins = [...acc.inputs.values()];
    if (!ins.length) { beep(); openDialog(NAMES.midi, textBody('No MIDI input device is connected. Connect a MIDI keyboard and press Record again.')); return; }
    super.stop(); this.recEv = []; this.recOpen.clear(); this.recBase = 0; this.recStart = ctx.currentTime; this.state = 'rec'; this.inputs = ins;
    ins.forEach(i => { i.onmidimessage = m => this.midiIn(m.data); });
    say('Recording from ' + ins.map(i => i.name).join(', '));
  }
  midiIn(data) {
    if (this.state !== 'rec' || data.length < 2) return;
    const hi = data[0] & 0xF0, ch = data[0] & 15, a = data[1], b = data[2] || 0, t = this.now(), key = ch * 128 + a;
    if (hi === 0x90 && b > 0) {
      const ev = { t, ch, m: a, v: b / 127, d: 0, inst: ch === 9 ? drumInst(a) : 'keys' };
      playVoice(G.src.midi.bus, Object.assign({}, ev, { d: .4 }), ctx.currentTime); meterQ.push({ t: ctx.currentTime, ch, v: ev.v });
      if (ch === 9) this.recEv.push(ev); else this.recOpen.set(key, ev);
    } else if (hi === 0x80 || hi === 0x90) {
      const ev = this.recOpen.get(key); if (ev) { ev.d = Math.max(.02, t - ev.t); this.recEv.push(ev); this.recOpen.delete(key); }
    }
  }
  finishRec() {
    const t = this.now(); this.inputs.forEach(i => { i.onmidimessage = null; }); this.inputs = [];
    for (const ev of this.recOpen.values()) { ev.d = Math.max(.02, t - ev.t); this.recEv.push(ev); }
    this.recOpen.clear(); this.state = 'stop'; this.pos = 0;
    if (this.recEv.length) {
      this.takes++; this.recEv.sort((x, y) => x.t - y.t);
      this.items.push({ kind: 'seq', name: 'REC' + this.takes + '.MID', events: this.recEv, dur: t + .5, chNames: {} });
      this.index = this.items.length - 1; this.changed();
    }
    this.recEv = [];
  }
}
const midi = new MidiDeck();
const meterQ = [], meterLvl = new Float32Array(16);
midi.onNote = (e, t) => meterQ.push({ t, ch: e.ch, v: e.v });
midi.onSilence = () => { meterQ.length = 0; };
const decks = { cd, dat, midi };

