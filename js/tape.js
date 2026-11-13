'use strict';
/* ---------- DAT tape transport model ---------- */
/* Tape is conserved: r_supply^2 + r_takeup^2 = 2*HUB^2 + A, and each reel turns by ds / r. */
const tapeCv = $('#dat-tape'), tapeCx = tapeCv.getContext('2d');
const tape = { dpos: 0, v: 0, aL: 0, aR: 0, wL: 0, wR: 0, HUB: 6, RMAX: 11.5, VT: 24, w: 0, h: 0, k: 1, key: '' };
function sizeTape(scale) {
  tape.w = tapeCv.offsetWidth; tape.h = tapeCv.offsetHeight; tape.k = (window.devicePixelRatio || 1) * scale;
  tapeCv.width = Math.round(tape.w * tape.k); tapeCv.height = Math.round(tape.h * tape.k); tape.key = '';
}
function updateTape(dt) {
  const dur = dat.recording ? REC_MAX : Math.max(dat.duration, .001);
  const target = clamp(dat.now(), 0, dur), err = target - tape.dpos;
  const rolling = power.dat && (dat.state === 'play' || dat.state === 'rec');
  if (REDUCED.matches) { tape.v = rolling ? 1 : 0; tape.dpos = target; }
  else {
    const vmax = Math.max(6, dur / 1.4), ACC = vmax / .35;
    let vdes, acc;
    if (rolling && Math.abs(err) < .5) { vdes = 1 + err * 6; acc = 8; }
    else if (!rolling && Math.abs(err) < .25) { vdes = 0; acc = 5; }
    else { vdes = Math.sign(err) * Math.min(vmax, Math.sqrt(2 * ACC * Math.abs(err))); acc = ACC; }
    tape.v += clamp(vdes - tape.v, -acc * dt, acc * dt);
    tape.dpos = clamp(tape.dpos + tape.v * dt, 0, dur);
    if (tape.dpos <= 0 || tape.dpos >= dur) { if ((tape.dpos <= 0 && tape.v < 0) || (tape.dpos >= dur && tape.v > 0)) tape.v = 0; }
  }
  const A = tape.RMAX * tape.RMAX - tape.HUB * tape.HUB, p = tape.dpos / dur;
  const rL = Math.sqrt(tape.HUB * tape.HUB + (1 - p) * A), rR = Math.sqrt(tape.HUB * tape.HUB + p * A);
  const ds = tape.v * dt * tape.VT;
  tape.wL = ds / rL; tape.wR = ds / rR;
  tape.aL += tape.wL; tape.aR += tape.wR;
  const key = rL.toFixed(2) + (tape.aL % 6.2832).toFixed(3) + (tape.aR % 6.2832).toFixed(3) + (power.dat ? 1 : 0);
  if (key !== tape.key) { tape.key = key; drawTape(rL, rR); }
}
function drawTape(rL, rR) {
  const c = tapeCx, W = tape.w, H = tape.h, cy = H / 2, xL = W * .23, xR = W * .77;
  c.setTransform(tape.k, 0, 0, tape.k, 0, 0);
  c.fillStyle = '#c0c0c0'; c.fillRect(0, 0, W, H);
  c.strokeStyle = '#2a1a0c'; c.lineWidth = 1; c.beginPath();
  c.moveTo(xL - rL * .55, cy + rL * .84); c.lineTo(4, H - 1.5); c.lineTo(W - 4, H - 1.5); c.lineTo(xR + rR * .55, cy + rR * .84); c.stroke();
  for (const [x, r] of [[xL, rL], [xR, rR]]) {
    c.beginPath(); c.arc(x, cy, r, 0, Math.PI * 2); c.fillStyle = '#4b3220'; c.fill();
    c.lineWidth = .8; c.strokeStyle = '#1e130a'; c.stroke();
    if (r > tape.HUB + 2) { c.beginPath(); c.arc(x, cy, (r + tape.HUB) / 2, 0, Math.PI * 2); c.strokeStyle = 'rgba(120,90,60,.5)'; c.lineWidth = .6; c.stroke(); }
  }
  hub(xL, cy, tape.aL, Math.abs(tape.wL)); hub(xR, cy, tape.aR, Math.abs(tape.wR));
}
function hub(x, y, a, w) {
  const c = tapeCx, R = tape.HUB;
  c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1; c.strokeStyle = '#000'; c.stroke();
  if (w > .45) { c.beginPath(); c.arc(x, y, R * .7, 0, Math.PI * 2); c.lineWidth = 2.2; c.strokeStyle = 'rgba(0,0,0,.45)'; c.stroke(); }
  else {
    c.fillStyle = '#000';
    for (let i = 0; i < 6; i++) {
      const t = a + i * Math.PI / 3; c.save(); c.translate(x, y); c.rotate(t); c.fillRect(2.2, -.8, R - 2.6, 1.6); c.restore();
    }
  }
  c.beginPath(); c.arc(x, y, 1.8, 0, Math.PI * 2); c.fillStyle = '#c0c0c0'; c.fill(); c.lineWidth = .8; c.strokeStyle = '#000'; c.stroke();
}

