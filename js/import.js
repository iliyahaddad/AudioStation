'use strict';
const baseName = p => { let b = p.split(/[\\/]/).pop().split('?')[0]; try { b = decodeURIComponent(b); } catch (e) {} return b.toLowerCase(); };
const isMidiName = n => EXT_MIDI.test(n);

async function loadItem(deck, f) {
  if (deck.id === 'midi') {
    const res = parseMidi(await f.arrayBuffer());
    return { kind: 'seq', name: f.name, events: res.events, dur: res.dur, chNames: res.chNames };
  }
  if (isMidiName(f.name)) throw new Error('MIDI files belong in the General MIDI player');
  if (f.type && !/^(audio|video)\//.test(f.type) && !EXT_AUDIO.test(f.name)) throw new Error('not an audio file');
  if (deck.id === 'dat') {
    if (f.size > 25e6) throw new Error('too large for the DAT, which decodes into memory (load it into the CD player, which streams from disk)');
    if (!initAudio()) throw new Error('Web Audio unavailable');
    const data = await f.arrayBuffer();
    const buf = await new Promise((res, rej) => { const p = ctx.decodeAudioData(data, res, () => rej(new Error('unsupported or damaged audio data'))); if (p && p.catch) p.catch(() => rej(new Error('unsupported or damaged audio data'))); });
    const L = new Float32Array(buf.getChannelData(0)), R = buf.numberOfChannels > 1 ? new Float32Array(buf.getChannelData(1)) : new Float32Array(L);
    return { kind: 'buffer', name: f.name, label: tagLabel(await readTags(f)), L, R, rate: buf.sampleRate, dur: buf.duration, buffer: null };
  }
  const probe = new Audio();
  if (f.type && probe.canPlayType(f.type) === '') throw new Error('this browser cannot play ' + f.type + ' files');
  const { url, dur } = await probeMedia(f);
  return { kind: 'media', name: f.name, label: tagLabel(await readTags(f)), blob: f, dur, src: { url, refs: 1 } };
}
function probeMedia(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), a = new Audio(); let done = false, to;
    const fin = (ok, v) => { if (done) return; done = true; clearTimeout(to); a.removeAttribute('src'); a.load(); if (ok) res({ url, dur: v }); else { URL.revokeObjectURL(url); rej(v); } };
    a.preload = 'metadata';
    a.onloadedmetadata = () => {
      if (isFinite(a.duration) && a.duration > 0) fin(true, a.duration);
      else { a.ondurationchange = () => { if (isFinite(a.duration) && a.duration > 0) fin(true, a.duration); }; try { a.currentTime = 1e9; } catch (e) { fin(true, 0); } setTimeout(() => fin(true, 0), 3000); }
    };
    a.onerror = () => fin(false, new Error('unsupported or damaged audio data'));
    to = setTimeout(() => fin(false, new Error('timed out reading the file')), 15000);
    a.src = url;
  });
}
async function importFiles(deck, fileList) {
  const files = [...fileList]; if (!files.length) return { added: 0, bad: [], missing: [] };
  const lists = files.filter(f => EXT_LIST.test(f.name)), media = files.filter(f => !EXT_LIST.test(f.name));
  const byName = new Map(media.map(f => [f.name.toLowerCase(), f]));
  let order = media; const missing = [];
  if (lists.length) {
    const used = new Set(); order = [];
    for (const l of lists) {
      for (const entry of parsePlaylist(await l.text(), l.name)) {
        const b = baseName(entry), f = byName.get(b);
        if (f) { order.push(f); used.add(f); continue; }
        const known = Object.values(decks).flatMap(d => d.items).find(it => it.name.toLowerCase() === b && (deck.id === 'midi' ? it.kind === 'seq' : it.kind !== 'seq'));
        if (known) order.push({ known }); else missing.push(entry);
      }
    }
    media.forEach(f => { if (!used.has(f)) order.push(f); });
  }
  deck.loading++; deck.changed();
  const added = [], bad = [];
  for (const f of order) {
    if (f.known) { added.push(shareItem(f.known)); continue; }
    try { added.push(await loadItem(deck, f)); } catch (err) { bad.push(f.name + ' \u2014 ' + (err && err.message || 'unsupported')); }
  }
  deck.loading--; deck.add(added); if (!added.length) deck.changed();
  say(`${added.length} file${added.length === 1 ? '' : 's'} added to ${NAMES[deck.id]}`);
  if (bad.length || missing.length) {
    beep(330, .25);
    const body = document.createElement('div');
    const add = (title, arr) => { if (!arr.length) return; const p = document.createElement('p'); p.textContent = title; const ul = document.createElement('ul'); ul.className = 'tips'; arr.slice(0, 12).forEach(s => { const li = document.createElement('li'); li.textContent = s; ul.appendChild(li); }); if (arr.length > 12) { const li = document.createElement('li'); li.textContent = `\u2026and ${arr.length - 12} more`; ul.appendChild(li); } body.append(p, ul); };
    add('These files could not be loaded:', bad);
    add('These playlist entries were not found. Select the audio files together with the playlist so the browser can read them:', missing);
    if (!plRender) openDialog(NAMES[deck.id], body);
    else { const i = $('.pl-info', overlay); if (i) i.textContent = `${bad.length + missing.length} item(s) could not be added: ` + bad.concat(missing).slice(0, 3).join('; '); }
  }
  return { added: added.length, bad, missing };
}
const pickers = {};
for (const [id, accept] of [['cd', 'audio/*,.mp3,.wav,.ogg,.oga,.opus,.flac,.m4a,.aac,.webm,.m3u,.m3u8,.pls'], ['dat', 'audio/*,.wav,.mp3,.ogg,.flac,.m4a,.aac,.m3u,.m3u8,.pls'], ['midi', '.mid,.midi,.kar,.rmi,.smf,audio/midi,audio/x-midi,.m3u,.m3u8,.pls']]) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = accept; inp.hidden = true;
  inp.addEventListener('change', () => { const fl = [...inp.files]; inp.value = ''; if (fl.length) importFiles(decks[id], fl); });
  document.body.appendChild(inp); pickers[id] = inp;
}
function openPicker(deck) { if (!power[deck.id]) return; pickers[deck.id].click(); }

