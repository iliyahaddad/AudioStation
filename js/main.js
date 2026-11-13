'use strict';
/* ---------- render loop ---------- */
const D = {
  cdTrack: $('#cd-track'), cdTime: $('#cd-time'),
  datTrack: $('#dat-track'), datTime: $('#dat-time'), datName: $('#dat-name'), vu: [$('#vu-l'), $('#vu-r')],
  midiSong: $('#midi-song'), midiTime: $('#midi-time'), midiName: $('#midi-name'), cols: [...mbars.children], floppy: $('#midi-floppy'),
};
const tbuf = new Uint8Array(1024), vuLvl = [0, 0];
let lastFrame = performance.now();
let idleN = 0, wakeUntil = 0;
['pointerdown', 'pointermove', 'keydown', 'change', 'drop', 'dragover'].forEach(t => addEventListener(t, () => { wakeUntil = performance.now() + 2000; }, true));
function isIdle(now) {
  if (now < wakeUntil || Object.values(decks).some(d => d.state !== 'stop' || d.loading) || /ing$/.test(tray.state)) return false;
  return !(vuLvl[0] > 0 || vuLvl[1] > 0 || tape.v > 1e-3 || meterLvl.some(v => v > 0));
}
function frame(nowMs) {
  requestAnimationFrame(frame);
  if (isIdle(nowMs) && (idleN++ % 8)) return; /* idle: ~7 fps instead of 60 */
  const dt = Math.min(.1, (nowMs - lastFrame) / 1000); lastFrame = nowMs;
  updateTray(dt);

  M.cd.dataset.state = cd.state;
  if (tray.state !== 'closed' || !cd.items.length) { setDigits(D.cdTrack, '--'); setDigits(D.cdTime, '----'); }
  else { setDigits(D.cdTrack, pad2((cd.index + 1) % 100)); setDigits(D.cdTime, mmss(cd.now())); }
  $('#cd-drive').title = cd.item && tray.state === 'closed' ? (cd.item.label || cd.item.name) : '';

  M.dat.dataset.state = dat.state;
  const recng = dat.recording;
  if (!dat.items.length && !recng) { setDigits(D.datTrack, '--'); setDigits(D.datTime, '----'); setText(D.datName, ''); }
  else {
    setDigits(D.datTrack, pad2((recng ? dat.count + 1 : dat.index + 1) % 100)); setDigits(D.datTime, mmss(dat.now()));
    setText(D.datName, recng ? 'TAKE' + (dat.takes + 1) + '.WAV' : dat.item.name);
  }
  updateTape(dt);
  for (let i = 0; i < 2; i++) {
    let n = 0;
    if (ctx && power.dat) {
      G.an[i].getByteTimeDomainData(tbuf); let s = 0;
      for (let j = 0; j < tbuf.length; j++) { const v = (tbuf[j] - 128) / 128; s += v * v; }
      const rms = Math.sqrt(s / tbuf.length), db = rms > 1e-5 ? 20 * Math.log10(rms) + 12 : -100;
      n = clamp((db + 30) / 40 * 32, 0, 32);
    }
    vuLvl[i] = Math.max(n, vuLvl[i] - dt * 50); setBar(D.vu[i], Math.round(vuLvl[i]));
  }

  M.midi.dataset.state = midi.state;
  if (!midi.items.length && !midi.recording) { setDigits(D.midiSong, '--'); setDigits(D.midiTime, '----'); setText(D.midiName, ''); }
  else {
    setDigits(D.midiSong, pad2((midi.recording ? midi.count + 1 : midi.index + 1) % 100)); setDigits(D.midiTime, mmss(midi.now()));
    setText(D.midiName, midi.recording ? 'REC' + (midi.takes + 1) + '.MID' : midi.item.name);
  }
  if (ctx) while (meterQ.length && meterQ[0].t <= ctx.currentTime) { const q = meterQ.shift(); if (q.v > meterLvl[q.ch]) meterLvl[q.ch] = Math.min(1, q.v + .15); }
  for (let c = 0; c < 16; c++) { meterLvl[c] = Math.max(0, meterLvl[c] - dt * 2.2); setBar(D.cols[c], Math.round(meterLvl[c] * 8)); }
  D.floppy.classList.toggle('read', midi.loading > 0);
  D.floppy.classList.toggle('lit', power.midi && (midi.state === 'play' || midi.state === 'rec'));
}
startTicker(() => { if (!ctx) return; cd.tick(); midi.tick(); dat.tick(); }, 25);

/* ---------- fit to container ---------- */
const fitEl = $('#fit');
function fit() {
  if (app.hidden) { fitEl.style.width = ''; fitEl.style.height = ''; return; }
  const s = zoom1 ? 1 : Math.min(1.6, (document.documentElement.clientWidth - 32) / 560);
  app.style.transform = 'scale(' + s + ')'; fitEl.style.width = 560 * s + 'px'; fitEl.style.height = app.offsetHeight * s + 'px';
  sizeTape(s);
}
window.addEventListener('resize', fit);
if (window.ResizeObserver) new ResizeObserver(() => fit()).observe(app);

window.AudioStation = { Store: { saveSettings, saveLibrary, SKEY }, get LOOKAHEAD() { return LOOKAHEAD; }, decks, mix, tray, tape, importFiles, parseMidi, get ctx() { return ctx; } };
restoreSettings(); updateCdModes(); sync(); fit(); requestAnimationFrame(frame); initPersistence();
