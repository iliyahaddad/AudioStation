# Architecture

All scripts are classic `<script>` files sharing the global lexical scope (top-level `const`/`let`/`class` are visible across files). Load order, as in `index.html`:

| File | Purpose |
|---|---|
| util, ticker | helpers; scheduler clock (Worker timer, `LOOKAHEAD`) |
| segments, content | seven-segment LCD drawing; built-in songs and DAT tracks |
| audio-graph, recorder, voices | Web Audio graph, PC speaker; AudioWorklet DAT recorder; synth voices |
| midi-parser, id3 | Standard MIDI File parser; ID3 tag reader |
| deck, cd-deck, dat-deck, midi-deck | `Deck` base class, engines (seq / buffer / media), the three decks |
| mixer, ui-static | mixer groups and faders, live inputs; static UI and power state |
| dialogs, playlist, import, dnd, edit | dialogs, playlists, file import, drag and drop, edit dialogs |
| actions, mediasession, shortcuts | button actions, window chrome, media keys, keyboard shortcuts |
| tape, tray | DAT reel physics, CD tray mechanism |
| storage | localStorage settings + IndexedDB library |
| main | render loop, fit-to-window, startup (`window.AudioStation` for tests) |

Moving to ES modules later: give each file explicit imports/exports and serve over HTTP (browsers block modules on `file://`).
