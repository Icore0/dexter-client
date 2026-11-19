// The Dexter Client launcher's sound effects (assets/sounds/*.wav, copied from the Dexter launcher), played the way its UiSounds does:
// a click for buttons and cards, a tab sound when switching pages, an on/off tick for switches, the launch sound for Play / Join,
// and the start-up chime when the launcher opens. Off with Settings > Launcher > Launcher sounds.
const SND = {}; ['click', 'launch', 'launcher_start', 'tab', 'toggle_on', 'toggle_off', 'open', 'close', 'success', 'error', 'notify', 'pixel', 'join', 'leave', 'select'].forEach(n => { const a = new Audio('../assets/sounds/' + n + '.wav'); a.preload = 'auto'; SND[n] = a; });
let soundsOn = true, lastSnd = 0;
const sfx = n => { if (!soundsOn || !SND[n]) return; const c = SND[n].cloneNode(); c.volume = Math.max(0, Math.min(1, (+(window.SET?.ui?.sndvol ?? 70)) / 100)); c.play().catch(() => {}); };
document.addEventListener('click', e => {
  const now = performance.now(); if (now - lastSnd < 40) return; lastSnd = now;
  const t = e.target;
  if (t.closest('.tg, input[type=checkbox]')) { const box = t.closest('.tg')?.querySelector('input') || t; return setTimeout(() => sfx(box.checked ? 'toggle_on' : 'toggle_off'), 0); }
  if (t.closest('[data-launch], [data-join], #mCancel')) return sfx('launch');
  if (t.closest('#tabs button')) return sfx('tab');
  if (t.closest('button, [role=button], .w-item, .evi, .srv, .lib-card, .mod, .chip, a')) sfx('click');
}, true);
setTimeout(() => sfx('launcher_start'), 400);
