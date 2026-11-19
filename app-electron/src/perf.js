/* perf.js - the render governor. Loaded last. Goals: ~0% CPU/GPU while idle, nothing drawn while the game runs, small memory.
   1. Every requestAnimationFrame loop (the 3D player and its cloak) goes through one scheduler that
      - runs at 30 fps at most (enough for a calm preview),
      - stops completely when the window is hidden, minimised or not focused, or while Minecraft is running,
      - stops by itself when no loop is asking for a frame.
   2. The 3D player only renders on the Cosmetics page.
   3. The first screens are cheap: Modrinth is fetched only when Mods is opened, the cosmetics are put on the model only when Cosmetics is opened. */
(function () {
  const raf = window.requestAnimationFrame.bind(window), caf = window.cancelAnimationFrame.bind(window);
  let nid = 1, queue = new Map(), scheduled = 0, last = 0, focused = document.hasFocus(), gameRunning = false;
  const GAP = 1000 / 30 - 2;
  const awake = () => focused && !document.hidden && !gameRunning;
  function frame(t) {
    scheduled = 0;
    if (!awake()) return;                                  // paused: nothing is rescheduled, nothing runs
    if (t - last < GAP) return schedule();
    last = t; const run = [...queue]; queue.clear();
    for (const [, cb] of run) { try { cb(t); } catch (e) { console.error(e); } }
    if (queue.size) schedule();
  }
  function schedule() { if (!scheduled && queue.size && awake()) scheduled = raf(frame); }
  window.requestAnimationFrame = cb => { const id = nid++; queue.set(id, cb); schedule(); return id; };
  window.cancelAnimationFrame = id => { queue.delete(id); };
  const wake = () => { focused = document.hasFocus(); schedule(); };
  addEventListener('focus', wake); addEventListener('blur', () => { focused = false; });
  document.addEventListener('visibilitychange', wake);
  window.PERF = { setGame(on) { gameRunning = !!on; if (!on) wake(); }, awake };

  // the game running: stop drawing (the launcher is usually behind the game anyway)
  window.dexter?.onBackend?.(ev => { if (ev.type === 'started') PERF.setGame(true); if (ev.type === 'exit' || ev.type === 'error') PERF.setGame(false); });

  // pages: the 3D player renders only on Cosmetics
  const sync3d = () => { try { if (typeof sv !== 'undefined' && sv) sv.renderPaused = current !== 'cosmetics'; } catch { /* viewer not ready */ } };
  let lockerDirty = true, modsDirty = true;
  const _go = go; go = function (id) { const r = _go(id); sync3d(); if (id === 'cosmetics' && lockerDirty) { lockerDirty = false; _dressLocker(); } if (id === 'mods' && modsDirty) { modsDirty = false; _loadMods(); } return r; };
  const _dressLocker = dressLocker; dressLocker = function (...a) { if (typeof current !== 'undefined' && current === 'cosmetics') { lockerDirty = false; return _dressLocker(...a); } lockerDirty = true; };
  const _loadMods = loadMods; loadMods = function (...a) { if (typeof current !== 'undefined' && current !== 'mods') { modsDirty = true; try { $('#instCount').textContent = countInstalled(); } catch { /* not ready */ } return; } modsDirty = false; return _loadMods(...a); };
  if (typeof sv !== 'undefined' && sv) { sv.renderPaused = true; try { sv.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); } catch { /* ignore */ } }
})();
