'use strict';
/* ---------- edit dialogs ---------- */
function datEdit(btn) {
  if (dat.recording) return;
  const tr = dat.item;
  if (!tr) { beep(); say('No wave file loaded'); return; }
  const wrap = document.createElement('div'), infoP = document.createElement('p'), cv = document.createElement('canvas');
  infoP.textContent = tr.name + ' \u2014 ' + clock(tr.dur) + ', ' + tr.rate + ' Hz stereo. Click the waveform to cue.';
  cv.width = 640; cv.height = 150; cv.className = 'wavecv'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Waveform of ' + tr.name);
  const draw = () => {
    const c = cv.getContext('2d'), n = tr.L.length, step = n / 640;
    c.fillStyle = '#000'; c.fillRect(0, 0, 640, 150); c.fillStyle = '#0b3d17'; c.fillRect(0, 74, 640, 1); c.fillStyle = '#19ff4a';
    for (let x = 0; x < 640; x++) {
      const a = Math.floor(x * step), b = Math.min(n, Math.floor((x + 1) * step) + 1), inc = Math.max(1, Math.floor((b - a) / 48));
      let mn = 1, mx = -1; for (let i = a; i < b; i += inc) { const v = tr.L[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
      const y1 = 75 - clamp(mx, -1, 1) * 72, y2 = 75 - clamp(mn, -1, 1) * 72; c.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }
  };
  cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(); dat.seek((e.clientX - r.left) / r.width * tr.dur); });
  const ramp = fadeIn => { const len = tr.L.length, n = Math.floor(len * .3); for (let i = 0; i < n; i++) { const g = i / n, j = fadeIn ? i : len - 1 - i; tr.L[j] *= g; tr.R[j] *= g; } };
  const ops = { 'Reverse': () => { tr.L.reverse(); tr.R.reverse(); }, 'Fade In': () => ramp(true), 'Fade Out': () => ramp(false) };
  const bar = document.createElement('div'); bar.className = 'ops';
  for (const name in ops) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = name;
    b.addEventListener('click', () => { dat.stop(); ops[name](); tr.buffer = null; draw(); say(name + ' applied to ' + tr.name); });
    bar.appendChild(b);
  }
  wrap.append(infoP, cv, bar); draw(); openDialog('DAT Edit', wrap, btn);
}
function midiEdit(btn) {
  const names = (midi.item && midi.item.chNames) || {};
  const wrap = html('<p>Channel mutes. Lit channels are audible.</p>'), grid = document.createElement('div'); grid.className = 'chgrid';
  for (let c = 0; c < 16; c++) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn chb';
    b.setAttribute('aria-pressed', String(!midi.mutes.has(c))); b.setAttribute('aria-label', 'Channel ' + (c + 1) + ' ' + (names[c] || 'unused'));
    b.innerHTML = `<i class="led2"></i><span>${c + 1}</span><em></em>`; b.querySelector('em').textContent = names[c] || '\u2014';
    b.addEventListener('click', () => { if (midi.mutes.has(c)) midi.mutes.delete(c); else midi.mutes.add(c); b.setAttribute('aria-pressed', String(!midi.mutes.has(c))); });
    grid.appendChild(b);
  }
  wrap.appendChild(grid); openDialog('MIDI Edit', wrap, btn);
}
const ABOUT = '<p><b>IBM AudioStation</b></p><p>A browser restoration of the AudioStation multimedia console: mixer, Compact Disc player, Digital Audio Transport and General MIDI player.</p><p>All playback runs locally with the Web Audio API; your files never leave this computer. General MIDI songs are rendered by a built-in oscillator synthesizer (no SoundFont is used). The preloaded CD tracks, wave files and MIDI songs are original stand-ins that only borrow the familiar file names.</p>';
const HELP = '<ul class="tips"><li><b>Loading files</b>: drop audio or MIDI files onto a module, use Playlist \u2192 Add Files, click the open CD tray, or click the floppy drive. M3U, M3U8 and PLS playlists are matched against files selected with them.</li><li><b>Mixer</b>: drag faders or use arrow keys. Three-fader channels are Left, Right and Balance. Lock gangs left and right. Playback/Record switch between output levels and the levels fed to the recorder. Left mini button = mute, right = record source (Master: mono).</li><li><b>CD</b>: Eject opens or closes the tray; playback is locked while it is open. Mode cycles Playlist, Shuffle, Loop and Single.</li><li><b>DAT</b>: Record captures the selected mixer sources as a new take. Edit shows the waveform.</li><li><b>MIDI</b>: Record captures a connected MIDI keyboard (Web MIDI). Edit mutes channels.</li><li>Hold rewind / fast forward to scan.</li><li><b>Keyboard</b> (when no control is focused): Space play/pause, \u2190 \u2192 seek 5 s, \u2191 \u2193 master volume, N / P next / previous, S stop.</li><li><b>Saved automatically</b>: mixer, power, play mode and playlists are kept in this browser.</li></ul>';

