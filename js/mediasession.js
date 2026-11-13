'use strict';
/* ---------- MediaSession ---------- */
function updateSession() {
  const ms = navigator.mediaSession; if (!ms || !activeDeck) return;
  const it = activeDeck.item;
  try {
    ms.metadata = it && window.MediaMetadata ? new MediaMetadata({ title: it.label || it.name, artist: 'AudioStation', album: NAMES[activeDeck.id] }) : null;
    ms.playbackState = activeDeck.state === 'play' ? 'playing' : activeDeck.state === 'pause' ? 'paused' : 'none';
  } catch (e) {}
}
if (navigator.mediaSession) {
  const h = (n, f) => { try { navigator.mediaSession.setActionHandler(n, f); } catch (e) {} };
  h('play', () => activeDeck && activeDeck.play()); h('pause', () => activeDeck && activeDeck.pause());
  h('stop', () => activeDeck && activeDeck.stop()); h('previoustrack', () => activeDeck && activeDeck.step(-1)); h('nexttrack', () => activeDeck && activeDeck.step(1));
}

