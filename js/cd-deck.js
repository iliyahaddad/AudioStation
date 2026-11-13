'use strict';
/* Compact Disc: tray mechanism + play modes */
const cd = new Deck('cd', 'cd', CD_SONGS.slice());
cd.el = new Audio(); cd.el.preload = 'auto';
cd.mode = 'playlist'; cd.shuf = [];
const tray = { state: 'closed', u: 0, delay: 0 };
cd.canPlay = function () { return power.cd && tray.state === 'closed'; };
cd.order = function () {
  const n = this.items.length;
  if (this.mode !== 'shuffle') return this.items.map((_, i) => i);
  if (this.shuf.length !== n) {
    const o = this.items.map((_, i) => i);
    if (n > 1) do { for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } } while (o.every((v, i) => v === i));
    this.shuf = o;
  }
  return this.shuf;
};
cd.advance = function () {
  if (this.mode === 'single') { this.pos = 0; this.state = 'stop'; return; }
  const o = this.order(); let n = o.indexOf(this.index) + 1;
  if (n >= o.length) { if (this.mode !== 'loop' || !o.length) { this.index = o[0] || 0; this.pos = 0; this.state = 'stop'; return; } n = 0; }
  this.select(o[n], true);
};
cd.changed = function () { this.shuf = []; updateCdModes(); Deck.prototype.changed.call(this); };
const CD_MODES = ['playlist', 'shuffle', 'loop', 'single'];
function updateCdModes() {
  const n = Math.min(4, cd.items.length) || 4;
  $('#cd-ord').textContent = Array.from({ length: n }, (_, i) => i + 1).join('');
  $('#cd-shuf').textContent = cd.mode === 'shuffle' && cd.items.length ? cd.order().slice(0, 4).map(i => (i + 1) % 10).join('') : '2143'.slice(0, n);
  $$('#cd-modes li').forEach(li => li.classList.toggle('on', li.dataset.m === cd.mode));
}
function setCdMode(m) { cd.mode = m; cd.shuf = []; updateCdModes(); say('CD mode: ' + m); }
function eject() {
  if (tray.state === 'closed' || tray.state === 'closing') {
    cd.stop(); tray.delay = tray.state === 'closed' ? .15 : 0; tray.state = 'opening'; say('CD tray opening');
  } else { tray.delay = tray.state === 'open' ? .1 : 0; tray.state = 'closing'; say('CD tray closing'); }
  sync();
}

