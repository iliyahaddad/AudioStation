# AudioStation

A browser recreation of the IBM **AudioStation** multimedia console (Windows 3.x era): mixer, CD player, Digital Audio Transport (DAT) recorder and General MIDI player, built with plain HTML, CSS and JavaScript and the Web Audio API. No build step, no dependencies.

## Run

Open `index.html` directly, or serve the folder (`python3 -m http.server`) or enable **GitHub Pages** (Settings → Pages → GitHub Actions; the workflow in `.github/workflows/pages.yml` deploys `main`).

## Features

- **Mixer**: 7 channel groups, playback/record fader sets, lock, mute, record-source select, mono output, VU and limiter.
- **Compact Disc**: animated tray, loads audio files (streams from disk), play modes, ID3 title/artist.
- **DAT**: tape transport with reel animation, plays decoded audio, records the selected mixer sources (AudioWorklet).
- **General MIDI**: Standard MIDI File parser and built-in synthesizer, floppy-drive UI, 16-channel meters, Web MIDI input recording.
- Playlists (M3U/PLS import and export), drag and drop, MediaSession (media keys), keyboard accessible.
- **Saved automatically**: mixer, power, play mode and playlists (files, MIDI data and DAT takes) survive reloads (localStorage + IndexedDB).
- **Shortcuts** (when no control is focused): Space play/pause, ← → seek 5 s, ↑ ↓ master volume, N / P next / previous, S stop.

## Layout

```
index.html      markup only
css/            base, mixer, lcd, cd, dat, midi, dialogs
js/             plain scripts sharing one global scope, loaded in the order listed in index.html
tests/smoke.py  Playwright smoke test
docs/ARCHITECTURE.md
```

Scripts are classic (not ES modules) on purpose, so the app also works from `file://`. Order matters; see `docs/ARCHITECTURE.md`.

## Test

```
pip install playwright && playwright install chromium
python3 -m http.server 8000 &
python3 tests/smoke.py
```

## Known limits / roadmap

- MIDI uses an oscillator synthesizer. A SoundFont (SF2) backend for real General MIDI sounds is the next planned step.
- Files loaded into the DAT are decoded into memory, so they are limited to 25 MB; use the CD player for long files.
- Microphone and line-in are never restored as "on" after a reload (the browser must ask permission again).

## License

See **LICENSE** file.
