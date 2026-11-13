'use strict';
/* ---------- mixer ---------- */
const GROUPS = [
  { id: 'master', name: 'Master volume', n: 2, w: 54 },
  { id: 'wave', name: 'Wave (DAT)', n: 3, w: 66, noRec: true },
  { id: 'mic', name: 'Microphone', n: 1, w: 46, live: true },
  { id: 'pc', name: 'PC speaker', n: 1, w: 46 },
  { id: 'midi', name: 'MIDI synthesizer', n: 2, w: 54 },
  { id: 'line', name: 'Line in', n: 3, w: 66, live: true },
  { id: 'cd', name: 'CD audio', n: 2, w: 54 },
];
const GBY = Object.fromEntries(GROUPS.map(g => [g.id, g]));
const mix = { mode: 'playback', lock: true, power: true, mono: false, vals: { playback: {}, record: {} }, mute: {}, sel: {} };
const faderEls = {};
const gainOf = v => v * v * 1.6;
function lr(id, v) {
  const g = GBY[id]; let l = gainOf(v[0]), r = gainOf(g.n === 1 ? v[0] : v[1]);
  if (g.n === 3) { const b = v[2]; l *= Math.min(1, 2 * (1 - b)); r *= Math.min(1, 2 * b); }
  return [l, r];
}
function applyMixer() {
  if (!ctx) return;
  const t = ctx.currentTime, set = (node, v) => node.gain.setTargetAtTime(v, t, .02);
  const pb = mix.vals.playback, rc = mix.vals.record, on = mix.power ? 1 : 0;
  const [ml, mr] = mix.mute.master ? [0, 0] : lr('master', pb.master);
  set(G.master.l, on * ml); set(G.master.r, on * mr);
  set(G.stereoOut, mix.mono ? 0 : 1); set(G.monoOut, mix.mono ? 1 : 0);
  const [rl, rr] = lr('master', rc.master); set(G.recMaster.l, rl); set(G.recMaster.r, rr);
  for (const id of SOURCES) {
    const [pl, pr] = mix.mute[id] ? [0, 0] : lr(id, pb[id]); set(G.src[id].play.l, pl); set(G.src[id].play.r, pr);
    const s = mix.sel[id] && !GBY[id].noRec ? 1 : 0, [ql, qr] = lr(id, rc[id]); set(G.src[id].rec.l, s * ql); set(G.src[id].rec.r, s * qr);
  }
}
function refreshFaders() {
  for (const g of GROUPS) faderEls[g.id].forEach((f, i) => {
    const v = mix.vals[mix.mode][g.id][i]; f.style.setProperty('--v', v);
    f.setAttribute('aria-valuenow', Math.round(v * 100));
    if (i === 2) f.setAttribute('aria-valuetext', v === .5 ? 'center' : (v < .5 ? 'left ' : 'right ') + Math.round(Math.abs(v - .5) * 200) + '%');
  });
}
function setLevel(g, i, v) {
  const cur = mix.vals[mix.mode][g.id]; v = clamp(v, 0, 1);
  if (i === 2) { if (Math.abs(v - .5) < .04) v = .5; cur[2] = v; }
  else if (g.n === 1 || mix.lock) cur[0] = cur[1] = v; else cur[i] = v;
  refreshFaders(); applyMixer();
}
GROUPS.forEach(g => {
  const def = g.n === 3 ? [.75, .75, .5] : [.75, .75];
  mix.vals.playback[g.id] = def.slice(); mix.vals.record[g.id] = def.slice();
  mix.mute[g.id] = !!g.live; mix.sel[g.id] = g.id === 'cd' || g.id === 'midi';
  const el = document.createElement('div'); el.className = 'grp'; el.style.setProperty('--gw', g.w + 'px');
  const right = g.id === 'master'
    ? `<button type="button" class="mini mono" data-mono aria-pressed="false" aria-label="Mono output" title="Mono output"></button>`
    : g.noRec
      ? `<button type="button" class="mini sel" data-fixed disabled aria-pressed="false" aria-label="Wave output cannot be recorded onto the DAT itself" title="Wave cannot be a record source"></button>`
      : `<button type="button" class="mini sel" data-sel="${g.id}" aria-pressed="${mix.sel[g.id]}" aria-label="Record source: ${g.name}" title="Record source: ${g.name}"></button>`;
  el.innerHTML = `<div class="faders"></div><div class="grp-foot"><button type="button" class="mini" data-mute="${g.id}" aria-pressed="${mix.mute[g.id]}" aria-label="Mute ${g.name}" title="Mute ${g.name}"></button><span class="gi" title="${g.name}">${ICONS[g.id]}</span>${right}</div>`;
  faderEls[g.id] = [];
  const labels = g.n === 1 ? [''] : g.n === 2 ? [' left', ' right'] : [' left', ' right', ' balance'];
  labels.forEach((lab, i) => {
    const f = document.createElement('div'); f.className = 'fader' + (i === 2 ? ' bal' : ''); f.tabIndex = 0;
    f.setAttribute('role', 'slider'); f.setAttribute('aria-orientation', 'vertical'); f.setAttribute('aria-valuemin', '0'); f.setAttribute('aria-valuemax', '100');
    f.setAttribute('aria-label', g.name + lab + (i === 2 ? '' : ' level'));
    f.innerHTML = '<span class="slot"></span><span class="knob">' + KNOB + '</span>';
    const fromY = y => { const r = f.getBoundingClientRect(), kh = r.height * 22 / 58; setLevel(g, i, 1 - (y - r.top - kh / 2) / (r.height - kh)); };
    f.addEventListener('pointerdown', e => { if (!mix.power) return; e.preventDefault(); f.focus(); f.setPointerCapture(e.pointerId); f._drag = true; fromY(e.clientY); });
    f.addEventListener('pointermove', e => { if (f._drag) fromY(e.clientY); });
    const end = () => { f._drag = false; }; f.addEventListener('pointerup', end); f.addEventListener('pointercancel', end);
    f.addEventListener('dblclick', () => { if (mix.power && i === 2) setLevel(g, 2, .5); });
    f.addEventListener('keydown', e => {
      if (!mix.power) return; const v = mix.vals[mix.mode][g.id][i];
      const d = { ArrowUp: .05, ArrowRight: .05, ArrowDown: -.05, ArrowLeft: -.05, PageUp: .2, PageDown: -.2 }[e.key];
      if (d) setLevel(g, i, v + d); else if (e.key === 'Home') setLevel(g, i, 0); else if (e.key === 'End') setLevel(g, i, 1); else return;
      e.preventDefault();
    });
    el.firstChild.appendChild(f); faderEls[g.id].push(f);
  });
  $('#groups').appendChild(el);
});
refreshFaders();
$('#lock').addEventListener('change', e => { mix.lock = e.target.checked; });
$$('input[name="mixmode"]').forEach(r => r.addEventListener('change', () => {
  if (!r.checked) return; mix.mode = r.value; $('#m-mixer').classList.toggle('recmode', mix.mode === 'record'); refreshFaders();
  say('Faders show ' + mix.mode + ' levels');
}));

/* live inputs (microphone + line in share the browser's default input device) */
const live = { stream: null, src: null, pending: false };
const needLive = () => !mix.mute.mic || !mix.mute.line || mix.sel.mic || mix.sel.line;
async function updateLive() {
  if (needLive()) {
    if (live.stream || live.pending) return;
    if (!initAudio()) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { liveFailed('This browser cannot capture audio input.'); return; }
    live.pending = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      live.pending = false;
      if (!needLive()) { stream.getTracks().forEach(t => t.stop()); return; }
      live.stream = stream; live.src = ctx.createMediaStreamSource(stream);
      const mono = ctx.createGain(); mono.channelCount = 1; mono.channelCountMode = 'explicit'; mono.channelInterpretation = 'speakers';
      live.src.connect(mono); mono.connect(G.src.mic.bus); live.src.connect(G.src.line.bus); live.mono = mono;
      say('Audio input connected');
    } catch (err) { live.pending = false; liveFailed('Access to the microphone / line input was denied or no input device is available.'); }
  } else if (live.stream) {
    live.stream.getTracks().forEach(t => t.stop()); live.src.disconnect(); live.mono.disconnect(); live.stream = null; live.src = null;
  }
}
function liveFailed(msg) {
  mix.mute.mic = mix.mute.line = true; mix.sel.mic = mix.sel.line = false;
  $$('[data-mute="mic"],[data-mute="line"]').forEach(b => b.setAttribute('aria-pressed', 'true'));
  $$('[data-sel="mic"],[data-sel="line"]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  applyMixer(); beep(330, .25); openDialog('Mixer', textBody(msg));
}

