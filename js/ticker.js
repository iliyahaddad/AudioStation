'use strict';
/* Scheduler clock. Browsers slow setInterval to ~1 Hz in background tabs, which starves the
   look-ahead sequencer. A Worker timer is not throttled that way, so it drives the ticks; if a
   Worker cannot be created we fall back to setInterval and a look-ahead that survives 1 s ticks. */
let LOOKAHEAD = 1.25;
function startTicker(fn, ms) {
  const fallback = () => { LOOKAHEAD = 1.25; setInterval(fn, ms); };
  try {
    const src = 'setInterval(function(){postMessage(0)},' + ms + ');';
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    w.onmessage = fn; w.onerror = fallback; LOOKAHEAD = .3;
  } catch (e) { fallback(); }
}
