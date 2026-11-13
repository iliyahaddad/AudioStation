'use strict';
/* ---------- dialogs ---------- */
const overlay = $('#overlay'), app = $('#app');
let dlgOpener = null, dlgDeck = null;
function html(s) { const d = document.createElement('div'); d.innerHTML = s; return d; }
function textBody(s) { const d = document.createElement('div'); const p = document.createElement('p'); p.textContent = s; d.appendChild(p); return d; }
function closeDialog() {
  if (overlay.hidden) return; overlay.hidden = true; overlay.innerHTML = ''; app.classList.remove('has-dlg'); plRender = null; dlgDeck = null;
  if (dlgOpener && document.contains(dlgOpener)) dlgOpener.focus(); dlgOpener = null;
}
function openDialog(title, body, opener, wide) {
  closeDialog();
  const d = document.createElement('div'); d.className = 'win dlg' + (wide ? ' wide' : ''); d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', title);
  d.innerHTML = '<div class="titlebar"><span class="tb-title"></span><button type="button" class="tb-btn cls" data-close aria-label="Close"><svg viewBox="0 0 8 7" aria-hidden="true"><path d="M0 0h2l2 2 2-2h2L5 3.5 8 7H6L4 5 2 7H0l3-3.5z"/></svg></button></div>';
  d.querySelector('.tb-title').textContent = title;
  const b = document.createElement('div'); b.className = 'dlg-body'; b.appendChild(body); d.appendChild(b);
  const f = document.createElement('div'); f.className = 'dlg-foot'; f.innerHTML = '<button type="button" class="btn" data-close>OK</button>'; d.appendChild(f);
  overlay.appendChild(d); overlay.hidden = false; app.classList.add('has-dlg'); dlgOpener = opener || null;
  (d.querySelector('[data-autofocus]') || f.firstChild).focus();
  fit();
}
overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('[data-close]')) closeDialog(); });
document.addEventListener('keydown', e => {
  if (overlay.hidden) return;
  if (e.key === 'Escape') { closeDialog(); return; }
  if (e.key === 'Tab') {
    const f = $$('button:not(:disabled),[tabindex="0"],textarea', overlay); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

