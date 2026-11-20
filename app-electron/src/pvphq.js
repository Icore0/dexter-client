/* pvphq.js - the PvPHQ style of the launcher. It rebuilds the layout out of the existing screens (nothing is re-implemented, so every
   feature works like the glass version): a left sidebar instead of a top bar, a play dock, Home as banner + two tables, Friends as a drawer. */
(function () {
  // ---------- icons: Lucide line icons everywhere ----------
  if (window.PX_ICONS) Object.assign(ICONS, window.PX_ICONS);
  const MARK = 'stroke-width="1.9"';
  const fix = el => { const s = window.PX_ICONS[el.dataset.i]; if (s && !el.innerHTML.includes(MARK)) el.innerHTML = s; };
  document.querySelectorAll('[data-i]').forEach(fix);
  new MutationObserver(m => { for (const r of m) for (const n of r.addedNodes) if (n.nodeType === 1) (n.matches?.('[data-i]') ? [n] : n.querySelectorAll?.('[data-i]') || []).forEach(fix); }).observe(document.body, { childList: true, subtree: true });

  const app = document.querySelector('.app'), bar = app.querySelector('.bar'), body = app.querySelector('.body');
  const $1 = s => document.querySelector(s);

  // ---------- 1) the left sidebar (the top bar is gone) ----------
  const side = document.createElement('aside'); side.className = 'sidebar';
  const brand = bar.querySelector('.brand'); brand.querySelector('.menu-wrap')?.remove();      // the Links drop-down becomes plain links below
  const tabs = document.getElementById('tabs');
  const byGo = id => tabs.querySelector(`[data-go="${id}"]`);
  // order and groups of the navigation
  const groups = [['Play', ['home', 'library']], ['Customise', ['cosmetics', 'textures']], ['Community', ['events', 'clips', 'news']]];
  const nav = document.createElement('nav'); nav.className = 'snav'; nav.id = 'snavInner';
  for (const [name, ids] of groups) { const h = document.createElement('div'); h.className = 'snav-h'; h.textContent = name; nav.appendChild(h); for (const id of ids) { const b = byGo(id); if (b) nav.appendChild(b); } }
  tabs.appendChild(nav);                                       // #tabs stays the element the app logic talks to
  const links = document.createElement('div'); links.className = 'slinks';
  links.innerHTML = '<button data-link="https://dextercopilot.ai">Website</button><button data-link="https://discord.gg/CUREmvuPgf">Discord</button><button data-link="mailto:team@dextercopilot.ai">Support</button>';
  const acct = document.createElement('div'); acct.className = 'sacct';
  const me = bar.querySelector('.menu-wrap');                    // the account button and its menu (already wired)
  const fr = document.getElementById('frToggle'), st = bar.querySelector('[data-settings]');
  const tools = document.createElement('div'); tools.className = 'stools'; fr.dataset.label = 'Friends'; st.dataset.label = 'Settings'; tools.append(fr, st);
  acct.append(me, tools);
  side.append(brand, tabs, links, acct);
  app.insertBefore(side, bar);
  // the friends button swaps its icon in the glass app (servers <-> friends); here Servers live on Home, so it stays a friends button
  fr.addEventListener('click', () => setTimeout(() => { fr.innerHTML = ICONS.friends; fr.title = 'Friends'; }, 0));
  fr.title = 'Friends'; st.title = 'Settings';

  // window buttons float in the top-right corner (no bar)
  const wctl = bar.querySelector('.wctl'); wctl.classList.add('wfloat'); app.appendChild(wctl);
  const strip = document.createElement('div'); strip.className = 'dragstrip'; app.appendChild(strip);
  bar.remove();

  // ---------- 2) the play dock: profile picker + Play, on every tab ----------
  const dock = document.createElement('footer'); dock.className = 'dock';
  const pick = $1('.hero-actions .menu-wrap.drop-up'), play = $1('.hero-actions .play');
  const label = document.createElement('div'); label.className = 'dock-label'; label.innerHTML = '<span id="dockSub">Pick a profile</span>';
  if (pick) dock.appendChild(pick); dock.appendChild(label); if (play) dock.appendChild(play);
  app.appendChild(dock);
  const sub = () => { try { const i0 = typeof INSTANCES !== 'undefined' && INSTANCES[inst], m = document.getElementById('heroMeta'); if (m) m.innerHTML = i0 ? `<i>Minecraft ${esc(i0.ver)}</i><i>${esc(i0.loader)}</i>` : ''; } catch { /* not ready */ } const i = typeof INSTANCES !== 'undefined' && INSTANCES[inst]; const e = document.getElementById('dockSub'); if (e) e.textContent = i ? `Minecraft ${i.ver}  ·  ${i.loader}` : 'Create a profile in the Library'; const c = document.getElementById('heroProf'); if (c) c.textContent = i ? i.name : 'No profile yet'; };
  setInterval(sub, 800);
  // the account button shows the name, not just the face
  const meBtn = document.getElementById('meBtn');
  const nm = document.createElement('span'); nm.className = 'me-name'; meBtn.insertBefore(nm, meBtn.querySelector('[data-i]'));
  const who = () => { const a = typeof AC !== 'undefined' && AC.list && AC.list[AC.active]; if (a) nm.innerHTML = `${esc(a.name)}<small>Dexter</small>`; };
  setInterval(who, 1500); who();

  // ---------- 3) Home: banner, a one-line stats strip, then Profiles and Servers as two tables ----------
  const home = document.getElementById('home'), hero = document.getElementById('hero'), sv = document.getElementById('serverView');
  home.querySelector('.home-below')?.remove();                 // home.js re-creates it: it is hidden by CSS instead (see below)
  const cap = document.createElement('div'); cap.className = 'hero-cap'; cap.innerHTML = '<div class="cap-l"><span>Selected profile</span><b id="heroProf">No profile yet</b><div class="hero-meta" id="heroMeta"></div></div>'; hero.appendChild(cap);
  const statRow = document.createElement('div'); statRow.className = 'stat-row'; statRow.id = 'statRow'; hero.after(statRow);
  const cols = document.createElement('div'); cols.className = 'hm-cols'; home.appendChild(cols);
  const pf = document.createElement('section'); pf.className = 'hm-sec'; pf.innerHTML = '<header><h3>Profiles</h3><button class="lnk" data-hm="library">All profiles</button></header><div class="tbl" id="hmTbl"></div>';
  const sr = document.createElement('section'); sr.className = 'hm-sec'; sr.innerHTML = '<header><h3>Servers</h3><button class="lnk" id="hsAdd">Add server</button></header>';
  sr.appendChild(sv); cols.append(pf, sr);
  document.getElementById('hsAdd').addEventListener('click', () => { const f = document.getElementById('srvForm'); f.hidden = !f.hidden; if (!f.hidden) f.n.focus(); });

  let L = [];
  const ico = p => typeof profileIconHtml === 'function' ? profileIconHtml(p) : '';
  async function table() {
    const r = await BE('GET', '/instances'); L = (r.data.instances || []).slice().sort((a, b) => (b.playMillis - a.playMillis) || (b.createdAt - a.createdAt));
    const tot = L.reduce((a, p) => a + p.playMillis, 0), ses = L.reduce((a, p) => a + p.sessions, 0);
    const top = L.filter(p => p.playMillis > 0)[0], dur = v => v >= 3600000 ? (v / 3600000).toFixed(1) + ' h' : Math.round(v / 60000) + ' min';
    document.getElementById('statRow').innerHTML = [['Time played', dur(tot), 'across all profiles'], ['Sessions', ses, ses === 1 ? 'game launched' : 'games launched'], ['Profiles', L.length, 'in your library'], ['Most played', top ? esc(top.name) : 'None yet', top ? dur(top.playMillis) : 'Press Play to start']].map(([k, v, h], i) => `<div class="stat${i === 3 ? ' txt' : ''}"><span>${k}</span><b>${v}</b><small>${h}</small></div>`).join('');
    const sel = (SET?.ui && SET.ui['home.sel']) || (L[0] && L[0].id);
    document.getElementById('hmTbl').innerHTML = L.length ? `<div class="tr th"><span>Profile</span><span>Version</span><span>Played</span><span></span></div>` + L.map(p => `<div class="tr${p.id === sel ? ' on' : ''}" data-id="${esc(p.id)}"><span class="c-name"><i class="c-ico">${ico(p)}</i><span><b>${esc(p.name)}</b><small>${esc(p.loader)} · ${p.mods} ${p.mods === 1 ? 'mod' : 'mods'}</small></span></span><span>${esc(p.version)}</span><span>${p.playMillis ? fmtPlay(p.playMillis) : 'Never'}</span><span class="c-act"><button class="go" data-pl="${esc(p.id)}">Play</button><button class="ib" data-po="${esc(p.id)}" title="Open profile" aria-label="Open profile"><i data-i="settings"></i></button></span></div>`).join('') : '<div class="empty-row">No profiles yet. <button class="lnk" data-hm="new">Create one</button></div>';
    document.querySelectorAll('#hmTbl [data-i]').forEach(fix);
  }
  async function choose(id) { await loadInstances(); inst = Math.max(0, INSTANCES.findIndex(x => x.id === id)); try { drawInstances(); } catch { /* not ready */ } }
  document.getElementById('hmTbl').addEventListener('click', async e => {
    const pl = e.target.closest('[data-pl]'); if (pl) { await choose(pl.dataset.pl); try { uiSet('home.sel', pl.dataset.pl); } catch { /* ignore */ } return launch(); }
    const po = e.target.closest('[data-po]'); if (po) return window.openProfile?.(po.dataset.po);
    const row = e.target.closest('.tr[data-id]'); if (row && !e.target.closest('button')) { await choose(row.dataset.id); try { uiSet('home.sel', row.dataset.id); } catch { /* ignore */ } table(); }
  });
  home.addEventListener('click', e => { const b = e.target.closest('[data-hm]'); if (!b) return; if (b.dataset.hm === 'new') { go('library'); setTimeout(() => document.getElementById('libNewBtn')?.click(), 350); } else go(b.dataset.hm); });
  const _hl = PAGE_LOAD.home; PAGE_LOAD.home = async () => { try { await _hl?.(); } catch { /* ignore */ } table(); sub(); };
  setTimeout(() => { table(); sub(); }, 1700); setInterval(() => { if (current === 'home') table(); }, 20000);

  // ---------- 4) sidebar extras: counts on the navigation, online friends, version ----------
  const badge = (go, id) => { const b = byGo(go); if (!b || b.querySelector('.nb')) return b?.querySelector('.nb'); const s = document.createElement('span'); s.className = 'nb'; s.id = id; b.appendChild(s); return s; };
  const nbLib = badge('library', 'nbLib'), nbEv = badge('events', 'nbEv');
  const frBadge = document.createElement('span'); frBadge.className = 'fr-badge'; frBadge.id = 'frBadge'; fr.appendChild(frBadge);
  const upd = () => {
    if (nbLib) nbLib.textContent = L.length ? String(L.length) : '';
    try { const live = typeof EVENTS !== 'undefined' && EVENTS.some(e => e.state === 'live'); if (nbEv) { nbEv.textContent = live ? 'Live' : ''; nbEv.classList.toggle('live', live); } } catch { /* no events */ }
    try { const n = Social.snapshot().friends.filter(f => f.online).length; frBadge.textContent = n ? String(n) : ''; } catch { /* no social data */ }
  };
  setInterval(upd, 2500); setTimeout(upd, 1800);
  const ver = document.createElement('div'); ver.className = 'sver'; ver.textContent = 'Dexter Client · Minecraft style'; links.appendChild(ver);
  window.dexter?.appVersion?.().then(v => { ver.textContent = 'Dexter Client v' + v + ' · Minecraft style'; }).catch(() => {});

  // ---------- 5) Clips becomes a Gallery: clips and screenshots together, grouped by day ----------
  const cl = document.getElementById('clips'), grid = document.getElementById('clipGrid'), seg = document.getElementById('clipKind');
  cl.querySelector('.pg-h').textContent = 'Gallery';
  const gb = byGo('clips'); if (gb) { const t = [...gb.childNodes].find(n => n.nodeType === 3); if (t) t.textContent = 'Gallery'; gb.title = 'Gallery'; const ic = gb.querySelector('[data-i]'); if (ic) { ic.dataset.i = 'image'; ic.innerHTML = ICONS.image; } }
  seg.innerHTML = '<button class="on" data-k="all">All</button><button data-k="clips"><i data-i="clips"></i>Clips</button><button data-k="screenshots"><i data-i="image"></i>Screenshots</button>';
  document.querySelectorAll('#clipKind [data-i]').forEach(fix);
  clipKind = 'all';
  seg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { gKind = b.dataset.k; seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); } });
  const pf2 = document.createElement('select'); pf2.className = 'sortsel'; pf2.id = 'gProf'; pf2.innerHTML = '<option value="">All profiles</option>'; seg.parentNode.insertBefore(pf2, seg);
  let GALL = [], gProf = '', gKind = 'all';
  pf2.addEventListener('change', () => { gProf = pf2.value; paintGallery(); });
  const dayKey = ms => { const d = new Date(ms), t = new Date(); const day = x => Math.floor((new Date(x).setHours(0, 0, 0, 0)) / 864e5); const diff = day(t) - day(d); return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff < 7 ? 'This week' : diff < 31 ? 'This month' : 'Earlier'; };
  function paintGallery() {
    const list = GALL.filter(m => (gKind === 'all' || m.kind === gKind) && (!gProf || m.profile === gProf));
    drawClips.items = list;
    const secs = new Map(); list.forEach((m, i) => { const k = dayKey(m.modified); if (!secs.has(k)) secs.set(k, []); secs.get(k).push([m, i]); });
    grid.innerHTML = list.length ? [...secs].map(([k, arr]) => `<section class="g-sec"><h4>${k}<span>${arr.length}</span></h4><div class="g-grid">${arr.map(([m, i]) => `<div class="gt" data-m="${i}" data-kind="${m.kind}"><div class="gt-img" data-th="${i}"></div>${m.kind === 'clips' ? '<span class="gt-play"><i data-i="play"></i></span>' : ''}<div class="gt-cap"><b>${esc(m.profileName || '')}</b><small>${m.kind === 'clips' ? 'Clip' : 'Screenshot'} · ${m.demo ? 'placeholder' : ago(m.modified)}</small></div></div>`).join('')}</div></section>`).join('')
      : `<div class="g-empty"><b>${gKind === 'clips' ? 'No clips yet' : gKind === 'screenshots' ? 'No screenshots yet' : 'Nothing here yet'}</b><span>Clips and screenshots you take in game show up here, newest first.</span></div>`;
    document.querySelectorAll('#clipGrid [data-i]').forEach(fix);
    list.forEach((m, i) => { if (m.demo) { const el = grid.querySelector(`[data-th="${i}"]`); if (el) { el.style.backgroundImage = `url(${m.img})`; el.classList.add('ld'); } } });
    list.slice(0, 80).forEach(async (m, i) => { if (m.demo) return; const t = await BE('GET', `/media/thumb?kind=${m.kind}&profile=${encodeURIComponent(m.profile)}&file=${encodeURIComponent(m.file)}`); const el = grid.querySelector(`[data-th="${i}"]`); if (el && t.data.image) { el.style.backgroundImage = `url(data:image/jpeg;base64,${t.data.image})`; el.classList.add('ld'); } });
  }
  window.drawClips = async function () {
    const [a, b] = await Promise.all([BE('GET', '/media?kind=clips'), BE('GET', '/media?kind=screenshots')]);
    GALL = [...(a.data.items || []).map(m => ({ ...m, kind: 'clips' })), ...(b.data.items || []).map(m => ({ ...m, kind: 'screenshots' }))].sort((x, y) => (y.modified || 0) - (x.modified || 0));
    if (!GALL.length) { const B = ['b001','b004','b005','b006','b009','b010','b014','b015','b016','b017','b018','b019'], D = 864e5, now = Date.now(), off = [0, 0, 1, 2, 3, 5, 9, 12, 16, 20, 40, 60];
      GALL = B.map((n, i) => ({ demo: true, img: `../assets/banners/${n}.jpg`, kind: i % 3 === 1 ? 'clips' : 'screenshots', profile: 'demo', profileName: 'Sample', modified: now - off[i] * D - i * 36e5 })); }
    const profs = new Map(GALL.map(m => [m.profile, m.profileName || m.profile])); pf2.innerHTML = '<option value="">All profiles</option>' + [...profs].map(([id, n]) => `<option value="${esc(id)}"${id === gProf ? ' selected' : ''}>${esc(n)}</option>`).join('');
    paintGallery();
  };
  drawClips.items = [];
  grid.addEventListener('click', e => { const c = e.target.closest('[data-m]'); if (!c) return; if (GALL[+c.dataset.m] && drawClips.items[+c.dataset.m] && drawClips.items[+c.dataset.m].demo) { e.stopPropagation(); return; } clipKind = c.dataset.kind; }, true);
  seg.addEventListener('click', () => setTimeout(paintGallery, 0));
  PAGE_LOAD.clips = () => window.drawClips();

  // the texture editor starts on amber
  setTimeout(() => { const h = document.getElementById('txHex'); if (h) { h.value = '#e8a13a'; h.dispatchEvent(new Event('input')); } }, 1200);
  document.title = 'Dexter Client';
})();
