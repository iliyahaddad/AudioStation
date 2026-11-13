'use strict';
/* ---------- actions ---------- */
function act(k, a, btn) {
  if (k === 'head') {
    if (a === 'about') openDialog('About AudioStation', html(ABOUT), btn);
    else if (a === 'help') openDialog('AudioStation Help', html(HELP), btn);
    else if (a === 'show') { const m = M[btn.dataset.target]; m.hidden = !m.hidden; btn.setAttribute('aria-pressed', String(!m.hidden)); fit(); }
    else if (a === 'power') { const on = !Object.values(power).some(Boolean); for (const p in power) togglePower(p, on); sync(); say('All modules ' + (on ? 'on' : 'off')); }
    return;
  }
  if (a === 'power') { togglePower(k, !power[k]); sync(); say(NAMES[k] + (power[k] ? ' on' : ' off')); return; }
  if (!power[k]) return;
  const p = decks[k];
  switch (a) {
    case 'play': p.play(); break;
    case 'pause': p.pause(); break;
    case 'stop': p.stop(); break;
    case 'rec': p.record(); break;
    case 'rew': p.seek(p.now() - 5); break;
    case 'ff': p.seek(p.now() + 5); break;
    case 'prev': if (p.now() > 2) p.seek(0); else p.step(-1); break;
    case 'next': p.step(1); break;
    case 'eject': eject(); return;
    case 'load': openPicker(p); return;
    case 'mode': setCdMode(CD_MODES[(CD_MODES.indexOf(cd.mode) + 1) % CD_MODES.length]); return;
    case 'playlist': playlistDialog(p, btn); return;
    case 'edit': if (k === 'dat') datEdit(btn); else midiEdit(btn); return;
  }
  const st = { play: 'playing', pause: 'paused', stop: 'stopped', rec: 'recording', recpause: 'recording paused' }[p.state];
  say(NAMES[k] + ' ' + st + (p.item ? ', track ' + (p.index + 1) : ''));
}
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.act) {
    const [k, a] = b.dataset.act.split(':');
    if ((a === 'rew' || a === 'ff') && e.detail !== 0) return;
    act(k, a, b);
  }
  else if (b.dataset.mute) {
    const id = b.dataset.mute; mix.mute[id] = !mix.mute[id]; b.setAttribute('aria-pressed', String(mix.mute[id])); applyMixer();
    if (GBY[id].live) updateLive();
  }
  else if (b.dataset.sel) {
    const id = b.dataset.sel; mix.sel[id] = !mix.sel[id]; b.setAttribute('aria-pressed', String(mix.sel[id])); applyMixer();
    if (GBY[id].live) updateLive();
  }
  else if (b.hasAttribute('data-mono')) { mix.mono = !mix.mono; b.setAttribute('aria-pressed', String(mix.mono)); initAudio(); applyMixer(); say(mix.mono ? 'Mono output' : 'Stereo output'); }
  else if (b.dataset.win) winAction(b.dataset.win);
});
/* hold-to-scan for rewind / fast forward */
let scan = null;
const endScan = () => { if (!scan) return; clearTimeout(scan.t); clearInterval(scan.i); scan.b.classList.remove('held'); scan = null; };
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('button[data-act$=":rew"],button[data-act$=":ff"]'); if (!b || b.disabled || e.button !== 0) return;
  const [k, a] = b.dataset.act.split(':'); endScan();
  act(k, a, b); b.classList.add('held');
  scan = { b, t: setTimeout(() => { scan.i = setInterval(() => act(k, a, b), 160); }, 420) };
});
['pointerup', 'pointercancel', 'blur'].forEach(ev => window.addEventListener(ev, endScan));
document.addEventListener('pointerleave', endScan);

/* window chrome */
const desk = $('#desk');
let zoom1 = false;
function winAction(a) {
  if (a === 'min') { app.classList.toggle('min'); fit(); }
  else if (a === 'max') { zoom1 = !zoom1; fit(); }
  else if (a === 'close') { for (const k in decks) decks[k].stop(); closeDialog(); app.hidden = true; desk.classList.add('show'); desk.focus(); fit(); }
}
desk.addEventListener('click', () => { app.hidden = false; app.classList.remove('min'); desk.classList.remove('show'); fit(); });

