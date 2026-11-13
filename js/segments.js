'use strict';
/* ---------- seven segment digits ---------- */
const SEGS = {
  a: '2.3,1 9.7,1 8,2.9 4,2.9', b: '11,1.8 9.1,3.7 9.1,8.6 10.1,9.6 11,8.9', c: '11,18.2 9.1,16.3 9.1,11.4 10.1,10.4 11,11.1',
  d: '2.3,19 9.7,19 8,17.1 4,17.1', e: '1,18.2 2.9,16.3 2.9,11.4 1.9,10.4 1,11.1', f: '1,1.8 2.9,3.7 2.9,8.6 1.9,9.6 1,8.9',
  g: '2.6,10 3.8,9.05 8.2,9.05 9.4,10 8.2,10.95 3.8,10.95',
};
const DMAP = { '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '' };
$$('.d7').forEach(el => {
  el._cells = [];
  for (const ch of el.dataset.fmt) {
    if (ch === ':') { const c = document.createElement('span'); c.className = 'colon'; el.appendChild(c); continue; }
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 12 20'); s.setAttribute('class', 'dg');
    for (const k in SEGS) { const p = document.createElementNS(NS, 'polygon'); p.setAttribute('points', SEGS[k]); p.dataset.s = k; s.appendChild(p); }
    el.appendChild(s); el._cells.push(s);
  }
});
function setDigits(el, str) {
  if (el._v === str) return; el._v = str;
  el._cells.forEach((s, i) => { const on = DMAP[str[i]] ?? ''; for (const p of s.children) p.classList.toggle('on', on.includes(p.dataset.s)); });
}
function setText(el, s) { if (el._t !== s) { el._t = s; el.textContent = s; } }
function setBar(el, n) { if (el._n === n) return; el._n = n; const k = el.children; for (let i = 0; i < k.length; i++) k[i].classList.toggle('on', i < n); }

