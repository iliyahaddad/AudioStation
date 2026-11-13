'use strict';
/* Minimal ID3v2 / ID3v1 reader: title + artist only. */
function id3Text(b) {
  const enc = b[0]; let d = b.slice(1), label = 'windows-1252';
  if (enc === 1) { if (d[0] === 0xFE && d[1] === 0xFF) label = 'utf-16be'; else label = 'utf-16le'; if ((d[0] === 0xFF && d[1] === 0xFE) || (d[0] === 0xFE && d[1] === 0xFF)) d = d.slice(2); }
  else if (enc === 2) label = 'utf-16be'; else if (enc === 3) label = 'utf-8';
  return new TextDecoder(label).decode(d).replace(/\0.*$/s, '').trim();
}
async function readTags(file) {
  try {
    const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
      const ver = head[3], size = (head[6] << 21) | (head[7] << 14) | (head[8] << 7) | head[9];
      const buf = new Uint8Array(await file.slice(10, 10 + Math.min(size, 1 << 20)).arrayBuffer());
      const idLen = ver === 2 ? 3 : 4, hdr = ver === 2 ? 6 : 10, out = {}; let p = 0;
      while (p + hdr <= buf.length) {
        const id = String.fromCharCode(...buf.slice(p, p + idLen)); if (!/^[A-Z0-9]+$/.test(id)) break;
        const fs = ver === 2 ? (buf[p + 3] << 16) | (buf[p + 4] << 8) | buf[p + 5]
          : ver === 4 ? (buf[p + 4] << 21) | (buf[p + 5] << 14) | (buf[p + 6] << 7) | buf[p + 7]
          : ((buf[p + 4] << 24) | (buf[p + 5] << 16) | (buf[p + 6] << 8) | buf[p + 7]) >>> 0;
        if (!fs) break;
        const body = buf.slice(p + hdr, p + hdr + fs);
        if (id === 'TIT2' || id === 'TT2') out.title = id3Text(body); else if (id === 'TPE1' || id === 'TP1') out.artist = id3Text(body);
        p += hdr + fs;
      }
      return out;
    }
    if (file.size > 128) {
      const t = new Uint8Array(await file.slice(-128).arrayBuffer());
      if (t[0] === 0x54 && t[1] === 0x41 && t[2] === 0x47) { const s = (a, b) => new TextDecoder('windows-1252').decode(t.slice(a, b)).replace(/\0.*$/s, '').trim(); return { title: s(3, 33), artist: s(33, 63) }; }
    }
  } catch (e) { /* no tags */ }
  return {};
}
const tagLabel = t => (t && t.title) ? (t.artist ? t.artist + ' \u2013 ' : '') + t.title : '';
