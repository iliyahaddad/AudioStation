'use strict';
/* ---------- CD tray mechanism ---------- */
const drawer = $('#cd-drawer'), bed = $('#cd-bed'), discEl = $('#cd-disc');
const TRAY_EXT = 40, TRAY_GROW = 6, TRAY_TIME = .95;
function trayProfile(u) {
  const a = .18, b = .28, vm = 1 / (1 - a / 2 - b / 2);
  if (u < a) return vm * u * u / (2 * a);
  if (u < 1 - b) return vm * (a / 2 + (u - a));
  return 1 - vm * (1 - u) * (1 - u) / (2 * b);
}
function updateTray(dt) {
  if (tray.state === 'opening' || tray.state === 'closing') {
    if (tray.delay > 0) tray.delay -= dt;
    else {
      const dir = tray.state === 'opening' ? 1 : -1;
      tray.u = clamp(tray.u + dir * dt / (REDUCED.matches ? .05 : TRAY_TIME), 0, 1);
      if (tray.u >= 1) { tray.state = 'open'; sync(); say('CD tray open'); }
      else if (tray.u <= 0) { tray.state = 'closed'; sync(); say('CD tray closed'); }
    }
  }
  const s = trayProfile(tray.u), key = s.toFixed(4) + (cd.items.length ? 1 : 0);
  if (drawer._k === key) return; drawer._k = key;
  drawer.style.setProperty('--ext', (s * TRAY_EXT).toFixed(2) + 'px');
  drawer.style.setProperty('--grow', (s * TRAY_GROW).toFixed(2) + 'px');
  bed.hidden = tray.u <= 0; discEl.hidden = !cd.items.length;
}

