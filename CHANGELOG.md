# Changelog

## Unreleased
- Split the single file into `css/` and `js/` modules.
- MIDI/DAT scheduling now runs from a Worker timer with a safe look-ahead fallback, so background tabs no longer stutter.
- DAT recording uses an AudioWorklet (ScriptProcessor kept only as a fallback).
- Auto-save: settings in localStorage, playlists and takes in IndexedDB.
- Global keyboard shortcuts; render loop slows down when idle.
- ID3v1/v2 title and artist for loaded files; DAT file size limit with a clear message.
- Module spacing and heights matched to the reference screenshot (7 px black gaps, 94 px panels).
- Feet (pegs) are also drawn under the last visible module, whichever one it is.
- MIDI floppy drive box and door are now drawn recessed (sunken) like the reference.
