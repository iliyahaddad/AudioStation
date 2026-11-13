'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad2 = n => String(n).padStart(2, '0');
const mmss = t => { t = Math.max(0, Math.floor(t || 0)); return pad2(Math.floor(t / 60) % 100) + pad2(t % 60); };
const clock = t => { if (!(t > 0) || !isFinite(t)) return '--:--'; t = Math.round(t); return Math.floor(t / 60) + ':' + pad2(t % 60); };
const NS = 'http://www.w3.org/2000/svg';
const say = msg => { $('#status').textContent = msg; };
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
const EXT_AUDIO = /\.(wav|wave|mp3|ogg|oga|opus|flac|m4a|aac|mp4|webm|aif|aiff|caf)$/i;
const EXT_MIDI = /\.(mid|midi|kar|rmi|smf)$/i;
const EXT_LIST = /\.(m3u8?|pls)$/i;

/* ---------- icons ---------- */
const I = (vb, inner) => `<svg viewBox="0 0 ${vb}" aria-hidden="true">${inner}</svg>`;
const ICONS = {
  prev: I('16 10', '<rect x="3" y="1" width="2" height="8"/><path d="M13 1v8L6 5z"/>'),
  next: I('16 10', '<rect x="11" y="1" width="2" height="8"/><path d="M3 1v8l7-4z"/>'),
  rew: I('16 10', '<path d="M8 1v8L1 5zM15 1v8L8 5z"/>'),
  ff: I('16 10', '<path d="M1 1v8l7-4zM8 1v8l7-4z"/>'),
  stop: I('16 10', '<rect x="4" y="1" width="8" height="8"/>'),
  play: I('16 10', '<path d="M4 0v10l9-5z"/>'),
  pause: I('16 10', '<rect x="4" y="1" width="3" height="8"/><rect x="9" y="1" width="3" height="8"/>'),
  rec: I('16 10', '<circle class="recdot" cx="8" cy="5" r="4"/>'),
  master: I('12 12', '<path d="M1 4h3l3-3v10L4 8H1z"/><path d="M9 3.5a3.5 3.5 0 0 1 0 5" fill="none" stroke="currentColor"/>'),
  wave: I('12 12', '<path d="M0 6h2l1-4 2 8 2-8 2 8 1-4h2" fill="none" stroke="currentColor"/>'),
  mic: I('12 12', '<rect x="4" y="0" width="4" height="7" rx="2"/><path d="M2 5a4 4 0 0 0 8 0M6 9v2M3.5 11.5h5" fill="none" stroke="currentColor"/>'),
  pc: I('12 12', '<rect x="1.5" y="1.5" width="9" height="6" fill="none" stroke="currentColor"/><rect x="5" y="8" width="2" height="2"/><rect x="3" y="10" width="6" height="1.5"/>'),
  midi: I('12 12', '<ellipse cx="3.5" cy="9.5" rx="2.5" ry="1.8"/><path d="M5.5 9.5V1.5l5 1.5v3" fill="none" stroke="currentColor"/>'),
  line: I('12 12', '<path d="M0 6h4M11 6h1" stroke="currentColor"/><path d="M4 2.5h3.5a3.5 3.5 0 0 1 0 7H4z"/>'),
  cd: I('12 12', '<circle cx="6" cy="6" r="5" fill="none" stroke="currentColor"/><circle cx="6" cy="6" r="1.5"/>'),
  hmix: I('24 14', '<path d="M5 1v12M12 1v12M19 1v12" stroke="currentColor" fill="none"/><rect x="3" y="3" width="4" height="3"/><rect x="10" y="8" width="4" height="3"/><rect x="17" y="5" width="4" height="3"/>'),
  hcd: I('24 14', '<ellipse cx="12" cy="7" rx="10" ry="5.5" fill="url(#rb)" stroke="#000" stroke-width=".8"/><ellipse cx="12" cy="7" rx="2.6" ry="1.4" fill="#c0c0c0" stroke="#000" stroke-width=".8"/>'),
  hdat: I('24 14', '<rect x="2" y="2" width="20" height="10" rx="1"/><rect x="5" y="4.5" width="14" height="4" fill="#c0c0c0"/><circle cx="8.5" cy="6.5" r="1.3"/><circle cx="15.5" cy="6.5" r="1.3"/>'),
  hkbd: I('24 14', '<rect x="1.5" y="2.5" width="21" height="9" fill="#fff" stroke="#000"/><path d="M4.5 3v8M7.5 3v8M10.5 3v8M13.5 3v8M16.5 3v8M19.5 3v8" stroke="#000" stroke-width=".7" fill="none"/><path d="M4.5 3v5M7.5 3v5M13.5 3v5M16.5 3v5M19.5 3v5" stroke="#000" stroke-width="2" fill="none"/>'),
  ip: I('8 8', '<path d="M1 0v8l6-4z"/>'),
  ipa: I('8 8', '<rect x="1" y="0" width="2" height="8"/><rect x="5" y="0" width="2" height="8"/>'),
};
const KNOB = '<svg viewBox="0 0 16 22" aria-hidden="true"><polygon points="0.5,0.5 15.5,0.5 15.5,6 11.5,11 15.5,16 15.5,21.5 0.5,21.5 0.5,16 4.5,11 0.5,6" fill="#c0c0c0" stroke="#000"/><path d="M1.5 6V1.5H14.5M5.5 11.5L1.5 16.5V20.5" stroke="#fff" fill="none"/><path d="M14.5 2V6L10.8 10.5M14.5 16.5V20.5H2" stroke="#808080" fill="none"/><path d="M4.5 11H11.5" stroke="#000"/></svg>';
$$('[data-icon]').forEach(el => { el.innerHTML = ICONS[el.dataset.icon]; });

