/* home.js - V2 Home: the background picture and the buttons take the top part; under it sits one card, "Jump back in":
   your profiles, pick one (Play above launches it) or press its own Play. The profile picker next to Join event is gone. */
(function () {
  const page = document.getElementById('home');
  const below = document.createElement('div'); below.className = 'home-below'; below.id = 'homeBelow'; page.appendChild(below);
  const sound = n => { try { typeof sfx === 'function' && sfx(n); } catch { /* optional */ } };
  let L = [], sel = '';

  async function draw() {
    const r = await BE('GET', '/instances'); L = (r.data.instances || []).slice().sort((a, b) => (b.playMillis - a.playMillis) || (b.createdAt - a.createdAt));
    await loadInstances(); drawInstances?.();
    const want = (SET?.ui && SET.ui['home.sel']) || ''; sel = L.some(p => p.id === want) ? want : (L[0]?.id || '');
    pick(sel, false); render();
  }
  function pick(id, save = true) {
    sel = id; const i = INSTANCES.findIndex(x => x.id === id); if (i >= 0) { inst = i; try { drawInstances(); } catch { /* not ready */ } }
    if (save && id) uiSet('home.sel', id);
  }
  const fmtT = ms => ms >= 3600000 ? [(ms / 3600000).toFixed(ms >= 36000000 ? 0 : 1), 'hours played'] : [String(Math.round(ms / 60000)), 'minutes played'];
  function render() {
    const total = L.reduce((a, p) => a + p.playMillis, 0), sessions = L.reduce((a, p) => a + p.sessions, 0);
    const avgMs = sessions ? total / sessions : 0, [av, al] = avgMs >= 3600000 ? [(avgMs / 3600000).toFixed(1), 'hours per session'] : [String(Math.round(avgMs / 60000)), 'min per session'];
    const first = Math.min(...L.map(p => p.createdAt).filter(Boolean)), days = Number.isFinite(first) ? Math.max(1, Math.ceil((Date.now() - first) / 86400000)) : 0;
    const top = L.filter(p => p.playMillis > 0).slice(0, 4), max = top[0]?.playMillis || 1, [tv, tl] = fmtT(total);
    below.innerHTML = `<section class="hb-card hb-jump"><header><h3>Jump back in</h3><button class="hb-link" data-hb="library">All profiles<i data-i="right"></i></button></header>
      ${L.length ? `<div class="hb-list">${L.map(p => `<div class="hb-row${p.id === sel ? ' on' : ''}" data-hb-sel="${esc(p.id)}"><div class="hb-ico">${profileIconHtml(p)}</div><div class="t"><b>${esc(p.name)}</b><span>${esc(p.version)} · ${esc(p.loader)} · ${p.mods} ${p.mods === 1 ? 'mod' : 'mods'}</span></div>
          <button class="ib hb-open" data-hb-open="${esc(p.id)}" title="Open profile" aria-label="Open profile"><i data-i="settings"></i></button><button class="join" data-hb-play="${esc(p.id)}"><i data-i="play"></i>Play</button></div>`).join('')}</div>`
        : `<div class="hb-empty"><span>No profiles yet.</span><button class="btn solid sm" data-hb="new"><i data-i="plus"></i>Create one</button></div>`}
    </section>
    <section class="hb-card hb-stats"><header><h3>Your stats</h3></header>
      <div class="hs-two"><div><b>${tv}</b><span>${tl}</span></div><div><b>${sessions}</b><span>${sessions === 1 ? 'session' : 'sessions'}</span></div></div>
    </section>`;
    icons(below); loadProfileIcons(L.map(p => p.id));
  }
  below.addEventListener('click', async e => {
    const pl = e.target.closest('[data-hb-play]');
    if (pl) { e.stopPropagation(); pick(pl.dataset.hbPlay); render(); sound('launch'); return launch(); }
    const op = e.target.closest('[data-hb-open]'); if (op) return window.openProfile?.(op.dataset.hbOpen);
    const row = e.target.closest('[data-hb-sel]'); if (row) { pick(row.dataset.hbSel); sound('tab'); return render(); }
    const q = e.target.closest('[data-hq]');
    if (q) {
      sound('click'); const k = q.dataset.hq;
      if (k === 'textures' || k === 'clips') return go(k);
      go('library'); return setTimeout(() => { document.getElementById('libNewBtn')?.click(); if (k === 'import') setTimeout(() => document.querySelector('[data-np="detect"]')?.click(), 250); }, 350);
    }
    const b = e.target.closest('[data-hb]'); if (!b) return; sound('click');
    if (b.dataset.hb === 'new') { go('library'); setTimeout(() => document.getElementById('libNewBtn')?.click(), 350); } else go(b.dataset.hb);
  });
  document.addEventListener('dx-icons', () => { if (L.length) render(); });
  PAGE_LOAD.home = draw;
  setTimeout(draw, 1500);
})();
