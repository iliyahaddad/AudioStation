'use strict';
/* ---------- playlists: dialog, import, export ---------- */
function playlistDialog(deck, opener) {
  let sel = deck.index;
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="pl"><ul class="list" role="listbox" tabindex="0" aria-label="Tracks" data-autofocus></ul><div class="pl-btns">
    <button type="button" class="btn" data-pl="play">Play</button>
    <button type="button" class="btn" data-pl="add">Add Files...</button>
    <button type="button" class="btn" data-pl="up">Move Up</button>
    <button type="button" class="btn" data-pl="down">Move Down</button>
    <button type="button" class="btn" data-pl="remove">Remove</button>
    <button type="button" class="btn" data-pl="clear">Clear</button>
    <button type="button" class="btn" data-pl="m3u">Save M3U...</button>
    <button type="button" class="btn" data-pl="pls">Save PLS...</button>
  </div></div><p class="pl-info"></p>`;
  const ul = $('.list', wrap), info = $('.pl-info', wrap), btn = n => $(`[data-pl="${n}"]`, wrap);
  const render = () => {
    sel = clamp(sel, 0, Math.max(0, deck.items.length - 1));
    ul.innerHTML = '';
    deck.items.forEach((it, i) => {
      const li = document.createElement('li'); li.setAttribute('role', 'option'); li.id = 'pl-' + i; li.setAttribute('aria-selected', String(i === sel));
      if (i === deck.index) li.classList.add('cur');
      const n = document.createElement('span'), g = document.createElement('span'), d = document.createElement('span');
      n.textContent = pad2(i + 1); g.className = 'grow'; g.textContent = (i === deck.index && deck.state === 'play' ? '\u25B6 ' : '') + it.name; d.textContent = clock(it.dur);
      li.append(n, g, d);
      li.addEventListener('click', () => { sel = i; render(); ul.focus(); });
      li.addEventListener('dblclick', () => { sel = i; deck.select(i, true); });
      ul.appendChild(li);
    });
    if (!deck.items.length) ul.innerHTML = '<li class="empty">(empty \u2014 Add Files or drop files here)</li>';
    if (deck.items.length) ul.setAttribute('aria-activedescendant', 'pl-' + sel); else ul.removeAttribute('aria-activedescendant');
    const total = deck.items.reduce((s, it) => s + (it.dur || 0), 0), n = deck.items.length;
    info.textContent = deck.loading ? 'Reading files\u2026' : `${n} track${n === 1 ? '' : 's'}, total ${clock(total)}`;
    const empty = !n, busy = deck.recording;
    btn('play').disabled = empty || busy; btn('remove').disabled = empty || busy; btn('clear').disabled = empty || busy;
    btn('up').disabled = empty || sel === 0; btn('down').disabled = empty || sel >= n - 1;
    btn('m3u').disabled = btn('pls').disabled = empty;
    const cur = ul.children[sel]; if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  };
  ul.addEventListener('keydown', e => {
    const n = deck.items.length; if (!n) return;
    if (e.key === 'ArrowDown') sel = Math.min(n - 1, sel + 1);
    else if (e.key === 'ArrowUp') sel = Math.max(0, sel - 1);
    else if (e.key === 'Home') sel = 0; else if (e.key === 'End') sel = n - 1;
    else if (e.key === 'Enter') { deck.select(sel, true); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { deck.remove(sel); }
    else return;
    e.preventDefault(); render();
  });
  wrap.addEventListener('click', e => {
    const b = e.target.closest('[data-pl]'); if (!b || b.disabled) return;
    const a = b.dataset.pl;
    if (a === 'play') deck.select(sel, true);
    else if (a === 'add') openPicker(deck);
    else if (a === 'up') { deck.move(sel, -1); sel--; }
    else if (a === 'down') { deck.move(sel, 1); sel++; }
    else if (a === 'remove') deck.remove(sel);
    else if (a === 'clear') deck.clear();
    else exportPlaylist(deck, a, wrap);
    render();
  });
  openDialog(NAMES[deck.id] + ' Playlist', wrap, opener, true);
  dlgDeck = deck; plRender = render; render();
}
function exportPlaylist(deck, fmt, wrap) {
  let text, ext;
  if (fmt === 'm3u') {
    ext = 'm3u8'; text = '#EXTM3U\n' + deck.items.map(it => `#EXTINF:${Math.round(it.dur || -1)},${it.name}\n${it.name}`).join('\n') + '\n';
  } else {
    ext = 'pls'; text = '[playlist]\n' + deck.items.map((it, i) => `File${i + 1}=${it.name}\nTitle${i + 1}=${it.name}\nLength${i + 1}=${Math.round(it.dur || -1)}`).join('\n') + `\nNumberOfEntries=${deck.items.length}\nVersion=2\n`;
  }
  const name = deck.id.toUpperCase() + '.' + ext.toUpperCase();
  try {
    const url = URL.createObjectURL(new Blob([text], { type: fmt === 'm3u' ? 'audio/x-mpegurl' : 'audio/x-scpls' }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch (e) {}
  let ta = $('.pl-out', wrap);
  if (!ta) { ta = document.createElement('textarea'); ta.className = 'pl-out'; ta.readOnly = true; ta.setAttribute('aria-label', 'Playlist file contents'); wrap.appendChild(ta); }
  ta.value = text; say('Saved ' + name);
  setTimeout(() => { const i = $('.pl-info', wrap); if (i) i.textContent = `Saved ${name}. If the download was blocked, copy the text below into a file.`; }, 0);
}
function parsePlaylist(text, name) {
  const out = [];
  if (/\.pls$/i.test(name) || /^\s*\[playlist\]/i.test(text)) {
    const files = {};
    text.split(/\r?\n/).forEach(l => { const m = l.match(/^\s*File(\d+)\s*=\s*(.+)$/i); if (m) files[m[1]] = m[2].trim(); });
    Object.keys(files).sort((a, b) => a - b).forEach(k => out.push(files[k]));
  } else text.split(/\r?\n/).forEach(l => { l = l.trim().replace(/^\uFEFF/, ''); if (l && !l.startsWith('#')) out.push(l); });
  return out;
}
