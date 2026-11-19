/* library.js - V2 Library without the flash: the cards you saw last time are painted at once when you open the tab, the engine is
   asked in the background, and the page is only touched when something really changed. The search bar is built once. */
(function () {
  const grid = document.getElementById('libGrid'), hero = document.getElementById('libHero');
  let lastHtml = '', loaded = false;
  const card = p => `<article class="lp ${p.running ? 'run' : ''}" data-pid="${esc(p.id)}">
      <div class="lp-art" style="background-image:url('${profileBanner(p.id)}')"><button class="lp-banner" data-lm-direct="banner" title="Change banner"><i data-i="image"></i>Banner</button><span class="lp-chip">${esc(p.version)}</span>${p.running ? '<span class="lp-chip live">Running</span>' : ''}</div>
      <div class="lp-body">
        <div class="lp-head"><div class="lp-ico">${profileIconHtml(p)}</div><div><h3 class="pn">${esc(p.name)}</h3><span class="lp-sub">${esc(p.loader)}</span></div>
          <button class="lp-dots" data-lib="menu" title="More"><i data-i="settings"></i></button></div>
        <div class="lp-stats"><span><b>${p.mods}</b> mods</span><span>${p.playMillis ? `<b>${fmtPlay(p.playMillis)}</b> played` : 'Not played yet'}</span><span><b>${p.sessions}</b> sessions</span></div>
        <div class="lp-act"><button class="lp-play" data-lib="play"><i data-i="play"></i>Play</button><button class="lp-btn" data-lib="mods">Open</button></div>
      </div></article>`;

  function paint() {
    if (!document.getElementById('libQ')) {
      hero.innerHTML = `<div class="lb-bar"><label class="search"><i data-i="search"></i><input id="libQ" placeholder="Search profiles" value="${esc(libQuery)}"></label>
        <select class="sortsel" id="libSort"><option value="recent">Newest</option><option value="playtime">Most played</option><option value="name">Name</option></select>
        <span class="muted" id="libCount"></span></div>`;
      document.getElementById('libSort').value = libSort; icons(hero);
    }
    document.getElementById('libCount').textContent = `${LIB.length} profile${LIB.length === 1 ? '' : 's'} · ${fmtPlay(LIB.reduce((a, p) => a + p.playMillis, 0))} played`;
    const list = LIB.filter(p => p.name.toLowerCase().includes(libQuery));
    list.sort(libSort === 'name' ? (a, b) => a.name.localeCompare(b.name) : libSort === 'playtime' ? (a, b) => b.playMillis - a.playMillis : (a, b) => b.createdAt - a.createdAt);
    const html = list.length ? list.map(card).join('') : `<div class="lib-empty">${LIB.length ? 'No profile matches your search.' : 'No profiles yet. Press New profile to make one.'}</div>`;
    if (html === lastHtml) return;                         // nothing changed: leave the page alone
    lastHtml = html; grid.innerHTML = html; icons(grid);
    list.forEach(p => { const i = new Image(); i.src = profileBanner(p.id); });   // warm the pictures so they do not pop in later
    loadProfileIcons(LIB.map(p => p.id));
  }

  window.drawLibrary = async function () {
    if (loaded) paint();                                    // show what we know straight away
    const r = await BE('GET', '/instances'); const next = r.data.instances || [];
    if (!loaded || JSON.stringify(next) !== JSON.stringify(LIB)) LIB = next;
    loaded = true; paint();
  };
  PAGE_LOAD.library = window.drawLibrary;
  document.addEventListener('dx-icons', () => { lastHtml = ''; paint(); });
  setTimeout(() => window.drawLibrary(), 1200);             // warm start: the cards are ready before you open the tab
})();
