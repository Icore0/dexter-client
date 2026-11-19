/* boot.js - drives the loading screen: the bar fills as the real steps finish (page ready, engine connected, profiles loaded),
   the screen stays at least ~2 s so it never flashes, then fades out and is removed. */
(function () {
  const el = document.getElementById('boot'); if (!el) return;
  const ring = el.querySelector('.boot-ring .fill'), msg = el.querySelector('.boot-msg');
  const started = performance.now(), MIN = 2200; let done = 0;
  const set = (n, text) => { done = Math.max(done, n); ring.style.strokeDasharray = done + ' 100'; if (text && msg) msg.textContent = text; };
  requestAnimationFrame(() => set(14, 'Starting Dexter'));
  const steps = [
    document.fonts.ready.then(() => set(46, 'Getting ready')),
    (async () => { try { await BE('GET', '/instances'); } catch { /* no engine: still open the app */ } set(80, 'Loading your profiles'); })(),
  ];
  Promise.race([Promise.all(steps), new Promise(r => setTimeout(r, 7000))]).then(() => new Promise(r => setTimeout(r, Math.max(0, MIN - (performance.now() - started))))).then(() => {
    set(100, 'Ready'); setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 650); }, 380);
  });
})();
