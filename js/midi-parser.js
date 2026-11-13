'use strict';
/* ---------- Standard MIDI File parser ---------- */
const GM_FAM = ['Piano', 'Chrom Perc', 'Organ', 'Guitar', 'Bass', 'Strings', 'Ensemble', 'Brass', 'Reed', 'Pipe', 'Synth Lead', 'Synth Pad', 'Synth FX', 'Ethnic', 'Percussive', 'Sound FX'];
const FAM_INST = ['keys', 'bell', 'organ', 'pluck', 'bass', 'pad', 'pad', 'brass', 'lead', 'soft', 'lead', 'pad', 'pad', 'pluck', 'bell', 'stab'];
function drumInst(n) {
  if (n === 35 || n === 36) return 'kick';
  if (n >= 37 && n <= 40) return 'snare';
  if ([41, 43, 45, 47, 48, 50].includes(n)) return 'tom';
  if ([46, 49, 51, 52, 53, 55, 57, 59].includes(n)) return 'open';
  return 'hat';
}
function parseMidi(buf) {
  let u8 = new Uint8Array(buf);
  const str = (o, n) => String.fromCharCode(...u8.subarray(o, o + n));
  const u32 = o => ((u8[o] << 24) | (u8[o + 1] << 16) | (u8[o + 2] << 8) | u8[o + 3]) >>> 0;
  const u16 = o => (u8[o] << 8) | u8[o + 1];
  if (u8.length > 12 && str(0, 4) === 'RIFF' && str(8, 4) === 'RMID') {
    let p = 12, found = null;
    while (p + 8 <= u8.length) {
      const id = str(p, 4), sz = u8[p + 4] | (u8[p + 5] << 8) | (u8[p + 6] << 16) | (u8[p + 7] << 24);
      if (id === 'data') { found = u8.subarray(p + 8, p + 8 + sz); break; }
      p += 8 + sz + (sz & 1);
    }
    if (!found) throw new Error('RMI file has no MIDI data');
    u8 = found;
  }
  if (u8.length < 14 || str(0, 4) !== 'MThd') throw new Error('not a Standard MIDI File');
  const hlen = u32(4), ntr = u16(10), div = u16(12);
  let tickSec = null;
  if (div & 0x8000) { const fps = 256 - (div >> 8), tpf = div & 255; tickSec = 1 / (fps * tpf); }
  if (!tickSec && !div) throw new Error('invalid MIDI time division');
  const raw = []; let p = 8 + hlen, seq = 0;
  for (let tr = 0; tr < ntr && p + 8 <= u8.length; tr++) {
    if (str(p, 4) !== 'MTrk') { p += 8 + u32(p + 4); continue; }
    const end = Math.min(u8.length, p + 8 + u32(p + 4)); let q = p + 8, tick = 0, run = 0;
    const vlq = () => { let v = 0, b; do { b = u8[q++]; v = (v << 7) | (b & 127); } while (b & 128 && q < end); return v; };
    while (q < end) {
      tick += vlq(); let st = u8[q];
      if (st < 0x80) { if (!run) throw new Error('corrupt MIDI track data'); st = run; } else { q++; if (st < 0xF0) run = st; }
      if (st === 0xFF) {
        const type = u8[q++], len = vlq();
        if (type === 0x51 && len === 3) raw.push({ tick, seq: seq++, k: 'tempo', v: (u8[q] << 16) | (u8[q + 1] << 8) | u8[q + 2] });
        q += len; if (type === 0x2F) break;
      } else if (st === 0xF0 || st === 0xF7) { q += vlq(); run = 0; }
      else {
        const hi = st & 0xF0, ch = st & 15, a = u8[q++], b = (hi === 0xC0 || hi === 0xD0) ? 0 : u8[q++];
        raw.push({ tick, seq: seq++, k: hi, ch, a, b });
      }
    }
    p = end;
  }
  raw.sort((x, y) => x.tick - y.tick || x.seq - y.seq);
  const prog = new Array(16).fill(0), vol = new Array(16).fill(100 / 127), expr = new Array(16).fill(1), pan = new Array(16).fill(0), sus = new Array(16).fill(false);
  const held = new Map(), sustained = [...Array(16)].map(() => []), out = [], used = {};
  let tempo = 500000, lastTick = 0, lastSec = 0;
  const secAt = tick => tickSec ? tick * tickSec : lastSec + (tick - lastTick) * tempo / 1e6 / div;
  const close = (ev, t) => { ev.d = Math.max(.02, t - ev.t); out.push(ev); };
  for (const r of raw) {
    const t = secAt(r.tick);
    if (!tickSec) { lastSec = t; lastTick = r.tick; }
    if (r.k === 'tempo') { if (r.v > 0) tempo = r.v; continue; }
    const ch = r.ch, key = ch * 128 + r.a;
    if (r.k === 0x90 && r.b > 0) {
      const ev = { t, ch, m: r.a, v: (r.b / 127) * vol[ch] * expr[ch], pan: pan[ch], d: 0, inst: ch === 9 ? drumInst(r.a) : FAM_INST[prog[ch] >> 3] };
      if (!(ch in used)) used[ch] = ch === 9 ? 'Drums' : GM_FAM[prog[ch] >> 3];
      if (ch === 9) { out.push(ev); continue; }
      if (!held.has(key)) held.set(key, []); held.get(key).push(ev);
    } else if (r.k === 0x80 || r.k === 0x90) {
      const list = held.get(key); if (!list || !list.length) continue;
      const ev = list.shift(); if (sus[ch]) sustained[ch].push(ev); else close(ev, t);
    } else if (r.k === 0xC0) prog[ch] = r.a & 127;
    else if (r.k === 0xB0) {
      if (r.a === 7) vol[ch] = r.b / 127;
      else if (r.a === 11) expr[ch] = r.b / 127;
      else if (r.a === 10) pan[ch] = clamp((r.b - 64) / 63, -1, 1);
      else if (r.a === 64) { const on = r.b >= 64; if (sus[ch] && !on) { sustained[ch].forEach(ev => close(ev, t)); sustained[ch] = []; } sus[ch] = on; }
      else if (r.a === 120 || r.a === 123) { for (const [k, list] of held) if ((k >> 7) === ch) { list.forEach(ev => close(ev, t)); held.delete(k); } }
    }
  }
  const tEnd = raw.length ? secAt(raw[raw.length - 1].tick) : 0;
  for (const list of held.values()) list.forEach(ev => close(ev, Math.max(tEnd, ev.t + .5)));
  sustained.forEach(l => l.forEach(ev => close(ev, Math.max(tEnd, ev.t + .5))));
  if (!out.length) throw new Error('the file contains no notes');
  out.sort((a, b) => a.t - b.t);
  const dur = out.reduce((m, e) => Math.max(m, e.t + (e.d || .3)), 0) + .5;
  return { events: out, dur, chNames: used };
}

