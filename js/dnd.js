'use strict';
/* drag and drop */
let dragDepth = 0;
const dropTarget = e => { const m = e.target.closest && e.target.closest('[data-deck]'); return dlgDeck ? dlgDeck.id : m ? m.dataset.deck : null; };
app.addEventListener('dragenter', e => { if (![...(e.dataTransfer?.types || [])].includes('Files')) return; e.preventDefault(); dragDepth++; });
app.addEventListener('dragover', e => {
  if (![...(e.dataTransfer?.types || [])].includes('Files')) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
  const t = dropTarget(e); for (const k in decks) M[k].classList.toggle('drop', k === t);
});
const clearDrop = () => { for (const k in decks) M[k].classList.remove('drop'); };
app.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; clearDrop(); } });
app.addEventListener('drop', e => {
  if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); dragDepth = 0; clearDrop();
  const files = [...e.dataTransfer.files], t = dropTarget(e);
  if (t) { if (power[t]) importFiles(decks[t], files); else { beep(); say(NAMES[t] + ' is switched off'); } return; }
  const mids = files.filter(f => isMidiName(f.name)), rest = files.filter(f => !isMidiName(f.name));
  const restMedia = rest.filter(f => !EXT_LIST.test(f.name));
  if (mids.length) importFiles(midi, restMedia.length ? mids : mids.concat(rest));
  if (restMedia.length) importFiles(cd, rest);
});
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());

