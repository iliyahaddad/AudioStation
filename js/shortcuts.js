'use strict';
/* Global keyboard shortcuts (only when no control has focus and no dialog is open). */
document.addEventListener('keydown', e => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || app.hidden || !overlay.hidden) return;
  if (e.target.closest && e.target.closest('button,input,select,textarea,a,[role=slider],[role=option]')) return;
  const d = activeDeck || cd;
  if (!power[d.id] || d.recording || (d.id === 'cd' && tray.state !== 'closed')) { if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return; }
  switch (e.key) {
    case ' ': (d.state === 'play' || d.state === 'pause') ? d.pause() : d.play(); break;
    case 'ArrowLeft': d.seek(d.now() - 5); break;
    case 'ArrowRight': d.seek(d.now() + 5); break;
    case 'ArrowUp': case 'ArrowDown': if (!mix.power) return; setLevel(GBY.master, 0, mix.vals[mix.mode].master[0] + (e.key === 'ArrowUp' ? .05 : -.05)); break;
    case 'n': case 'N': d.step(1); break;
    case 'p': case 'P': d.step(-1); break;
    case 's': case 'S': d.stop(); break;
    default: return;
  }
  e.preventDefault();
});
