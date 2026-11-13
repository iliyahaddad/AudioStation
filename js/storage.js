'use strict';
/* Persistence: settings in localStorage, playlists (files, MIDI data, DAT takes) in IndexedDB. */
const SKEY = 'audiostation.v1';
const BUILTIN = { cd: CD_SONGS, dat: DAT_TRACKS, midi: MIDI_SONGS };
let restoring = false, lastSettings = '', saveTimer = 0, db = null, quotaWarned = false;

function saveSettings() {
  const s = { v: 1, power: { ...power }, cdMode: cd.mode, hidden: Object.keys(M).filter(k => M[k].hidden),
    idx: Object.fromEntries(Object.entries(decks).map(([k, d]) => [k, d.index])),
    mix: { mode: mix.mode, lock: mix.lock, mono: mix.mono, vals: mix.vals, mute: mix.mute, sel: mix.sel } };
  const j = JSON.stringify(s); if (j === lastSettings) return;
  try { localStorage.setItem(SKEY, j); lastSettings = j; } catch (e) { /* storage unavailable */ }
}
function loadSettings() { try { const s = JSON.parse(localStorage.getItem(SKEY)); return s && s.v === 1 ? s : null; } catch (e) { return null; } }
function restoreSettings() {
  const s = loadSettings(); if (!s) return;
  try {
    if (s.power) for (const k in power) if (typeof s.power[k] === 'boolean') power[k] = s.power[k];
    const m = s.mix || {};
    if (m.mode === 'record' || m.mode === 'playback') { mix.mode = m.mode; $$('input[name="mixmode"]').forEach(r => { r.checked = r.value === m.mode; }); $('#m-mixer').classList.toggle('recmode', m.mode === 'record'); }
    if (typeof m.lock === 'boolean') { mix.lock = m.lock; $('#lock').checked = m.lock; }
    mix.mono = !!m.mono; $('[data-mono]').setAttribute('aria-pressed', String(mix.mono));
    for (const g of GROUPS) {
      for (const md of ['playback', 'record']) { const v = m.vals && m.vals[md] && m.vals[md][g.id]; if (Array.isArray(v) && v.length === g.n && v.every(x => typeof x === 'number')) mix.vals[md][g.id] = v.map(x => clamp(x, 0, 1)); }
      if (g.live) continue; /* mic / line-in stay off until the user enables them (permission prompt) */
      if (m.mute && typeof m.mute[g.id] === 'boolean') { mix.mute[g.id] = m.mute[g.id]; $(`[data-mute="${g.id}"]`).setAttribute('aria-pressed', String(mix.mute[g.id])); }
      if (!g.noRec && m.sel && typeof m.sel[g.id] === 'boolean') { mix.sel[g.id] = m.sel[g.id]; $(`[data-sel="${g.id}"]`).setAttribute('aria-pressed', String(mix.sel[g.id])); }
    }
    refreshFaders();
    if (CD_MODES.includes(s.cdMode)) { cd.mode = s.cdMode; if (cd.shuf) cd.shuf = []; }
    for (const k in M) if (s.hidden && s.hidden.includes(k)) { M[k].hidden = true; const b = $(`[data-act="head:show"][data-target="${k}"]`); if (b) b.setAttribute('aria-pressed', 'false'); }
  } catch (e) { console.warn('AudioStation: settings not restored', e); }
}

/* ---- IndexedDB library ---- */
function openDB() {
  return new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('no IndexedDB'));
    const r = indexedDB.open('audiostation', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('lists'); r.result.createObjectStore('items'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = tx => new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = tx.onabort = () => rej(tx.error); });
const newPid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

async function saveLibrary() {
  if (!db || restoring) return;
  try {
    const lists = {}, keep = new Set(), puts = [];
    for (const k in decks) {
      const d = decks[k];
      lists[k] = d.items.map(it => {
        if (BUILTIN[k].includes(it)) return { b: it.name };
        if (it.kind === 'media' && !it.blob) return null;
        it.pid = it.pid || newPid(); keep.add(it.pid);
        if (!it.saved) {
          const rec = { kind: it.kind, name: it.name, label: it.label, dur: it.dur };
          if (it.kind === 'media') rec.blob = it.blob; else if (it.kind === 'buffer') { rec.L = it.L; rec.R = it.R; rec.rate = it.rate; } else { rec.events = it.events; rec.chNames = it.chNames; }
          puts.push([it.pid, rec]); it.saved = true;
        }
        return { u: it.pid };
      }).filter(Boolean);
    }
    const tx = db.transaction(['lists', 'items'], 'readwrite');
    for (const [pid, rec] of puts) tx.objectStore('items').put(rec, pid);
    tx.objectStore('lists').put(lists, 'main');
    const keys = await req(tx.objectStore('items').getAllKeys());
    keys.filter(x => !keep.has(x)).forEach(x => tx.objectStore('items').delete(x));
    await done(tx);
  } catch (e) {
    for (const k in decks) decks[k].items.forEach(it => { if (it.pid) it.saved = false; });
    if (!quotaWarned) { quotaWarned = true; say('Playlists could not be saved (browser storage full or blocked)'); }
  }
}
function scheduleLibSave() { if (restoring) return; clearTimeout(saveTimer); saveTimer = setTimeout(saveLibrary, 600); }

async function restoreLibrary() {
  const lists = await req(db.transaction('lists').objectStore('lists').get('main')); if (!lists) return;
  restoring = true;
  try {
    const store = db.transaction('items').objectStore('items'), srcCache = new Map(), idx = (loadSettings() || {}).idx || {};
    for (const k in decks) {
      if (!Array.isArray(lists[k])) continue;
      const d = decks[k], items = [];
      for (const ref of lists[k]) {
        if (ref.b) { const it = BUILTIN[k].find(x => x.name === ref.b); if (it) items.push(it); continue; }
        const rec = await req(store.get(ref.u)); if (!rec) continue;
        const it = { kind: rec.kind, name: rec.name, label: rec.label, dur: rec.dur, pid: ref.u, saved: true };
        if (rec.kind === 'media') {
          let src = srcCache.get(ref.u); if (!src) { src = { url: URL.createObjectURL(rec.blob), refs: 0 }; srcCache.set(ref.u, src); }
          src.refs++; it.src = src; it.blob = rec.blob;
        } else if (rec.kind === 'buffer') { it.L = rec.L; it.R = rec.R; it.rate = rec.rate; it.buffer = null; } else { it.events = rec.events; it.chNames = rec.chNames; }
        items.push(it);
      }
      d.items = items; d.index = Math.min(Math.max(0, idx[k] | 0), Math.max(0, items.length - 1));
      if (d.trackChanged) d.trackChanged(); d.changed();
    }
  } finally { restoring = false; }
}
function initPersistence() {
  const base = Deck.prototype.changed;
  Deck.prototype.changed = function () { base.call(this); scheduleLibSave(); };
  openDB().then(d => { db = d; return restoreLibrary(); }).catch(() => { db = null; });
  setInterval(saveSettings, 1500);
  addEventListener('pagehide', () => { saveSettings(); clearTimeout(saveTimer); saveLibrary(); });
}
