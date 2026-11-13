'use strict';
/* ---------- static UI pieces ---------- */
$$('.tp').forEach(tp => {
  const k = tp.dataset.tp, rec = tp.hasAttribute('data-rec');
  const mk = (a, label) => `<button type="button" class="btn tb" data-act="${k}:${a}" aria-label="${label}" title="${label}">${ICONS[a]}</button>`;
  const recLabel = k === 'midi' ? 'Record from MIDI input device' : 'Record selected mixer sources';
  tp.innerHTML = `<div class="tpg">${mk('prev', 'Previous track')}${mk('next', 'Next track')}</div><div class="tpg">${mk('rew', 'Rewind (hold to scan)')}${mk('stop', 'Stop')}${mk('play', 'Play')}${rec ? mk('rec', recLabel) : ''}${mk('pause', 'Pause')}${mk('ff', 'Fast forward (hold to scan)')}</div>`;
});
for (const id of ['vu-l', 'vu-r']) { const b = $('#' + id); for (let i = 0; i < 32; i++) { const s = document.createElement('i'); if (i >= 27) s.className = 'r'; else if (i >= 24) s.className = 'y'; b.appendChild(s); } }
const mbars = $('#midi-bars'), mnums = $('#midi-nums');
for (let c = 0; c < 16; c++) {
  const col = document.createElement('span'); for (let i = 0; i < 8; i++) col.appendChild(document.createElement('i')); mbars.appendChild(col);
  const t = document.createElementNS(NS, 'text'); t.setAttribute('x', c * 9 + 4.5); t.setAttribute('y', 7); t.setAttribute('font-size', 7); t.setAttribute('text-anchor', 'middle'); t.textContent = c + 1; mnums.appendChild(t);
}

/* ---------- power / enabled state ---------- */
const M = { mixer: $('#m-mixer'), cd: $('#m-cd'), dat: $('#m-dat'), midi: $('#m-midi') };
const TRAY_LOCKED = new Set(['cd:prev', 'cd:next', 'cd:rew', 'cd:stop', 'cd:play', 'cd:pause', 'cd:ff']);
function sync() {
  for (const k in power) {
    const on = power[k], m = M[k]; m.classList.toggle('off', !on);
    $$('button,input', m).forEach(b => {
      const a = b.dataset.act; if (a === k + ':power') { b.setAttribute('aria-pressed', String(on)); return; }
      b.disabled = !on || b.hasAttribute('data-fixed') || (k === 'cd' && tray.state !== 'closed' && TRAY_LOCKED.has(a)) || (a === 'cd:load' && tray.state !== 'open');
    });
  }
  mix.power = power.mixer;
  $$('.fader').forEach(f => { f.tabIndex = mix.power ? 0 : -1; f.setAttribute('aria-disabled', String(!mix.power)); });
  $('#cd-eject').setAttribute('aria-pressed', String(tray.state === 'open' || tray.state === 'opening'));
  applyMixer();
}
function togglePower(k, on) { power[k] = on; if (!on && decks[k]) decks[k].stop(); }

