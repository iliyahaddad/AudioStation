"""Smoke test: python3 -m http.server 8000 (or open file://), then: python3 tests/smoke.py [url]
Requires: pip install playwright && playwright install chromium"""
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8000/index.html'
ok = True
def check(name, cond, extra=''):
    global ok; ok &= bool(cond); print(('PASS ' if cond else 'FAIL ') + name, extra)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': 592, 'height': 620}); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(400)
    g = pg.evaluate("""()=>{const y=s=>document.querySelector(s).getBoundingClientRect();
      const m=['#m-head','#m-mixer','#m-cd','#m-dat','#m-midi'].map(y);
      return {gaps:m.slice(1).map((r,i)=>Math.round(r.top-m[i].bottom)),h:m.slice(1).map(r=>Math.round(r.height))}}""")
    check('7px gaps between modules', g['gaps'] == [7, 7, 7, 7], g['gaps']); check('module heights 94', g['h'] == [94] * 4, g['h'])
    pg.click('[data-act="midi:play"]'); pg.wait_for_timeout(800)
    check('MIDI plays', pg.evaluate('AudioStation.decks.midi.state') == 'play')
    check('worker ticker (short look-ahead)', pg.evaluate('AudioStation.LOOKAHEAD') < 1)
    pg.click('[data-act="midi:stop"]')
    pg.click('[data-act="dat:rec"]'); pg.wait_for_timeout(1500); pg.click('[data-act="dat:stop"]'); pg.wait_for_timeout(300)
    n = pg.evaluate('AudioStation.decks.dat.items.length'); last = pg.evaluate('AudioStation.decks.dat.items.at(-1)')
    check('AudioWorklet recording creates a take', last['name'] == 'TAKE1.WAV' and last['dur'] > 0.5, (n, last['name'], round(last['dur'], 2)))
    pg.click('body', position={'x': 5, 'y': 5}); pg.keyboard.press('Space'); pg.wait_for_timeout(300)
    check('Space shortcut plays the active deck', pg.evaluate("Object.values(AudioStation.decks).some(d=>d.state==='play')")); pg.keyboard.press('s')
    pg.focus('.grp .fader'); [pg.keyboard.press('ArrowDown') for _ in range(4)]
    v = pg.evaluate('AudioStation.mix.vals.playback.master[0]'); pg.wait_for_timeout(2200)
    pg.reload(); pg.wait_for_timeout(1200)
    check('fader level restored', abs(pg.evaluate('AudioStation.mix.vals.playback.master[0]') - v) < 1e-9, round(v, 2))
    check('DAT take restored from IndexedDB', pg.evaluate("AudioStation.decks.dat.items.some(i=>i.name==='TAKE1.WAV' && i.L.length>1000)"))
    check('no page errors', not errs, errs); b.close()
sys.exit(0 if ok else 1)
