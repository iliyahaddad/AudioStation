'use strict';
/* ---------- decks ---------- */
let activeDeck = null, plRender = null;
const NAMES = { mixer: 'Mixer', cd: 'Compact Disc', dat: 'Digital Audio Transport', midi: 'General MIDI' };
const power = { mixer: true, cd: true, dat: true, midi: true };

function releaseItem(it) { if (it && it.src && --it.src.refs <= 0) URL.revokeObjectURL(it.src.url); }
function shareItem(it) { if (it.src) it.src.refs++; return Object.assign({}, it); }

class Deck {
  constructor(id, bus, items) { this.id = id; this.bus = bus; this.items = items; this.index = 0; this.state = 'stop'; this.pos = 0; this.eng = null; this.mutes = new Set(); this.loading = 0; }
  get item() { return this.items[this.index] || null; }
  get count() { return this.items.length; }
  get duration() { const it = this.item; return it && it.dur > 0 ? it.dur : 0; }
  get recording() { return this.state === 'rec' || this.state === 'recpause'; }
  canPlay() { return power[this.id]; }
  now() {
    if (this.state === 'play' && this.eng) { const t = this.eng.time(); return this.duration ? clamp(t, 0, this.duration) : Math.max(0, t); }
    return this.pos;
  }
  play() {
    if (this.state === 'play') return true;
    if (!this.item || !this.canPlay()) { beep(); say(this.item ? NAMES[this.id] + ' is not ready' : 'No track loaded in ' + NAMES[this.id]); return false; }
    if (!initAudio()) return false;
    if (this.duration && this.pos >= this.duration - .05) this.pos = 0;
    this._start(); return true;
  }
  _start() { this.state = 'play'; this.eng = makeEngine(this, this.item, this.pos); activeDeck = this; updateSession(); }
  _halt() { if (this.eng) { const e = this.eng; this.eng = null; e.stop(); } }
  pause() {
    if (this.state === 'play') { this.pos = this.now(); this._halt(); this.state = 'pause'; }
    else if (this.state === 'pause') this.play();
    updateSession();
  }
  stop() { this._halt(); this.pos = 0; this.state = 'stop'; updateSession(); }
  seek(p) {
    if (!this.item || this.recording) return;
    p = clamp(p, 0, Math.max(0, (this.duration || p) - .05));
    if (this.state === 'play') { this._halt(); this.pos = p; this._start(); }
    else { this.pos = p; if (p > 0 && this.state === 'stop') this.state = 'pause'; }
  }
  select(i, autoplay) {
    if (this.recording) return;
    const was = this.state === 'play'; this._halt();
    this.pos = 0; this.state = 'stop';
    if (!this.items.length) { this.index = 0; this.trackChanged(); updateSession(); return; }
    this.index = clamp(i, 0, this.items.length - 1); this.trackChanged();
    if (was || autoplay) this.play();
    updateSession(); if (plRender) plRender();
  }
  order() { return this.items.map((_, i) => i); }
  step(d) { const o = this.order(); if (!o.length) { beep(); return; } const n = o.indexOf(this.index); this.select(o[(n + d + o.length) % o.length]); }
  advance() {
    const o = this.order(), n = o.indexOf(this.index) + 1;
    if (n < o.length) this.select(o[n], true);
    else { this.index = o[0] || 0; this.pos = 0; this.state = 'stop'; this.trackChanged(); }
  }
  ended(eng) { if (eng !== this.eng) return; this.eng = null; this.pos = 0; this.state = 'stop'; this.advance(); updateSession(); if (plRender) plRender(); }
  failed(eng, err) {
    if (eng !== this.eng) return; this._halt(); this.pos = 0; this.state = 'stop'; beep(330, .25);
    say('Cannot play ' + (this.item ? this.item.name : 'track'));
    openDialog(NAMES[this.id], textBody(`AudioStation could not play “${this.item ? this.item.name : ''}”. ${err && err.message ? err.message : 'The browser rejected the audio data.'}`));
  }
  trackChanged() {}
  changed() { if (plRender) plRender(); }
  add(items) {
    if (!items.length) return;
    const wasEmpty = !this.items.length; this.items.push(...items);
    if (wasEmpty) { this.index = 0; this.pos = 0; this.state = 'stop'; this.trackChanged(); }
    this.changed();
  }
  remove(i) {
    if (this.recording || i < 0 || i >= this.items.length) return;
    const cur = i === this.index;
    if (cur) { this._halt(); this.pos = 0; this.state = 'stop'; }
    releaseItem(this.items[i]); this.items.splice(i, 1);
    if (i < this.index) this.index--;
    else if (cur) { this.index = Math.min(this.index, Math.max(0, this.items.length - 1)); this.trackChanged(); }
    this.changed(); updateSession();
  }
  move(i, d) {
    const j = i + d; if (j < 0 || j >= this.items.length) return;
    [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
    if (this.index === i) this.index = j; else if (this.index === j) this.index = i;
    this.changed();
  }
  clear() { if (this.recording) return; this.stop(); this.items.forEach(releaseItem); this.items = []; this.index = 0; this.trackChanged(); this.changed(); }
  tick() { if (this.eng && this.eng.tick) this.eng.tick(); }
}

function makeEngine(deck, item, pos) {
  if (item.kind === 'seq') return seqEngine(deck, item, pos);
  if (item.kind === 'buffer') return bufferEngine(deck, item, pos);
  return mediaEngine(deck, item, pos);
}
function seqEngine(deck, item, pos) {
  const voice = ctx.createGain(); voice.connect(G.src[deck.bus].bus);
  const t0 = ctx.currentTime + .06 - pos, ev = item.events;
  let ptr = 0; while (ptr < ev.length && ev[ptr].t < pos - 1e-4) ptr++;
  const eng = {
    time: () => ctx.currentTime - t0,
    tick() {
      const el = ctx.currentTime - t0;
      while (ptr < ev.length && ev[ptr].t < el + LOOKAHEAD) {
        const e = ev[ptr++]; if (deck.mutes.has(e.ch)) continue;
        const t = t0 + e.t; playVoice(voice, e, t); if (deck.onNote) deck.onNote(e, t);
      }
      if (el >= item.dur) deck.ended(eng);
    },
    stop() { voice.gain.setTargetAtTime(0, ctx.currentTime, .012); setTimeout(() => voice.disconnect(), 300); if (deck.onSilence) deck.onSilence(); },
  };
  return eng;
}
function bufferEngine(deck, item, pos) {
  if (!item.buffer) {
    item.buffer = ctx.createBuffer(2, item.L.length, item.rate);
    item.buffer.getChannelData(0).set(item.L); item.buffer.getChannelData(1).set(item.R);
  }
  const s = ctx.createBufferSource(); s.buffer = item.buffer; s.connect(G.src[deck.bus].bus); s.start(0, pos);
  const t0 = ctx.currentTime - pos;
  const eng = { time: () => ctx.currentTime - t0, stop() { s.onended = null; try { s.stop(); } catch (e) {} s.disconnect(); } };
  s.onended = () => deck.ended(eng);
  return eng;
}
function mediaEngine(deck, item, pos) {
  const el = deck.el; let alive = true, started = false;
  if (el.dataset.url !== item.src.url) { el.src = item.src.url; el.dataset.url = item.src.url; }
  const start = () => {
    if (!alive) return;
    try { el.currentTime = pos; } catch (e) {}
    const p = el.play(); started = true;
    if (p) p.catch(err => { if (alive && err.name !== 'AbortError') deck.failed(eng, err); });
  };
  const onEnd = () => { if (alive) deck.ended(eng); };
  const onErr = () => { if (alive) deck.failed(eng, new Error('The file is damaged or uses a format this browser cannot decode.')); };
  const onDur = () => { if (isFinite(el.duration) && el.duration > 0) item.dur = el.duration; };
  el.addEventListener('ended', onEnd); el.addEventListener('error', onErr); el.addEventListener('durationchange', onDur);
  if (el.readyState >= 1) start(); else el.addEventListener('loadedmetadata', start, { once: true });
  const eng = {
    time: () => started && el.readyState >= 1 ? el.currentTime : pos,
    stop() { alive = false; el.removeEventListener('ended', onEnd); el.removeEventListener('error', onErr); el.removeEventListener('durationchange', onDur); el.removeEventListener('loadedmetadata', start); el.pause(); },
  };
  return eng;
}

