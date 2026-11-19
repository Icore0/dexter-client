/* extras2.js - the Library's profile posters, the banner picker, and the extra settings rows (interface prefs, folders,
   system check). Loaded after extras.js: same-named functions replace the earlier ones. */

/* ======================= Library: profile cards ======================= */
let libQuery = '', libSort = 'recent';
// each profile gets its own banner, chosen by the launcher from its id (see banners.js)
const libArt = id => profileBanner(id);
async function drawLibrary() {
  const r = await BE('GET', '/instances'); LIB = r.data.instances || [];
  let list = LIB.filter(p => p.name.toLowerCase().includes(libQuery));
  list.sort(libSort === 'name' ? (a, b) => a.name.localeCompare(b.name) : libSort === 'playtime' ? (a, b) => b.playMillis - a.playMillis : (a, b) => b.createdAt - a.createdAt);
  $('#libHero').innerHTML = `<div class="lb-bar"><label class="search"><i data-i="search"></i><input id="libQ" placeholder="Search profiles" value="${esc(libQuery)}"></label>
    <select class="sortsel" id="libSort"><option value="recent"${libSort === 'recent' ? ' selected' : ''}>Newest</option><option value="playtime"${libSort === 'playtime' ? ' selected' : ''}>Most played</option><option value="name"${libSort === 'name' ? ' selected' : ''}>Name</option></select>
    <span class="muted">${LIB.length} profile${LIB.length === 1 ? '' : 's'} · ${fmtPlay(LIB.reduce((a, p) => a + p.playMillis, 0))} played</span></div>`;
  $('#libGrid').innerHTML = list.length ? list.map(p => `<article class="lp ${p.running ? 'run' : ''}" data-pid="${esc(p.id)}">
      <div class="lp-art" style="background-image:url('${libArt(p.id)}')"><button class="lp-banner" data-lm-direct="banner" title="Change banner"><i data-i="image"></i>Banner</button><span class="lp-chip">${esc(p.version)}</span>${p.running ? '<span class="lp-chip live">Running</span>' : ''}</div>
      <div class="lp-body">
        <div class="lp-head"><div><h3 class="pn">${esc(p.name)}</h3><span class="lp-sub">${esc(p.loader)}</span></div>
          <button class="lp-dots" data-lib="menu" title="More"><i data-i="settings"></i></button></div>
        <div class="lp-stats"><span><b>${p.mods}</b> mods</span><span>${p.playMillis ? `<b>${fmtPlay(p.playMillis)}</b> played` : 'Not played yet'}</span><span><b>${p.sessions}</b> sessions</span></div>
        <div class="lp-act"><button class="lp-play" data-lib="play"><i data-i="play"></i>Play</button><button class="lp-btn" data-lib="mods">Open</button></div>
      </div></article>`).join('')
    : `<div class="lib-empty">${LIB.length ? 'No profile matches your search.' : 'No profiles yet. Press New profile to make one.'}</div>`;
  icons($('#libGrid')); icons($('#libHero'));
}
PAGE_LOAD.library = drawLibrary;
document.addEventListener('input', e => { if (e.target.id === 'libQ') { libQuery = e.target.value.trim().toLowerCase(); const p = e.target.selectionStart; drawLibrary().then(() => { const i = $('#libQ'); i.focus(); i.setSelectionRange(p, p); }); } });
document.addEventListener('change', e => { if (e.target.id === 'libSort') { libSort = e.target.value; drawLibrary(); } });

// the "New profile" form is a small popover under its button
const libForm = () => $('#libNew');
document.addEventListener('click', e => {
  if (e.target.closest('#libNewBtn')) { const f = libForm(); f.hidden = !f.hidden; if (!f.hidden) f.n.focus(); return; }
  if (e.target.closest('#libNewCancel')) { libForm().hidden = true; return; }
  if (!e.target.closest('.lp-new') && libForm() && !libForm().hidden) libForm().hidden = true;
});
document.addEventListener('submit', e => { if (e.target.id === 'libNew') setTimeout(() => { e.target.hidden = true; }, 0); });

// the card menu is one floating panel on <body>, so a card can never clip it
let lpMenu = null;
const lpClose = () => { if (lpMenu) { lpMenu.remove(); lpMenu = null; } };
function lpOpen(btn, p) {
  lpClose();
  const m = lpMenu = document.createElement('div'); m.className = 'lp-menu'; m.dataset.pid = p.id;
  const row = (k, ic, t, cls = '') => `<button data-lm="${k}" class="${cls}"><i data-i="${ic}"></i>${t}</button>`;
  m.innerHTML = row('banner', 'image', 'Change banner') + row('icon', 'star', 'Change icon') + row('cfg', 'settings', 'Memory &amp; Java') + row('rename', 'edit', 'Rename') + row('dup', 'copy', 'Duplicate') + row('folder', 'folder', 'Open folder') + '<hr>' + row('del', 'trash', 'Delete profile', 'warn');
  document.body.appendChild(m); icons(m);
  const b = btn.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(innerWidth - w - 8, b.right - w)) + 'px';
  m.style.top = (b.bottom + 6 + h > innerHeight - 8 ? Math.max(8, b.top - h - 6) : b.bottom + 6) + 'px';
}

/* ======================= Banner picker: groups, Random, or your own picture ======================= */
let bpTab = 'skyblock';
function bannerPicker(id) {
  const p = LIB.find(x => x.id === id); if (!p) return;
  const cur = (SET?.ui && SET.ui['banner.' + id]) || '';
  const tabs = [...BANNER_GROUPS.map(g => [g.id, g.name]), ['upload', 'Upload']];
  if (!tabs.some(t => t[0] === bpTab)) bpTab = 'skyblock';
  const d = lpSheet(`<div class="bp"><header><div><small>Banner</small><h3>${esc(p.name)}</h3></div><button class="lp-btn" data-bp="random"><i data-i="refresh"></i>Random</button><button class="lp-btn" data-ls="close" aria-label="Close"><i data-i="check"></i>Done</button></header>
    <nav class="bp-tabs">${tabs.map(([k, n]) => `<button data-bp-tab="${k}" class="${k === bpTab ? 'on' : ''}">${n}</button>`).join('')}</nav><div class="bp-body"></div></div>`);
  d.dataset.pid = id; d.classList.add('wide');
  const body = $('.bp-body', d);
  const draw = () => {
    const now = (SET?.ui && SET.ui['banner.' + id]) || '';
    $$('.bp-tabs button', d).forEach(b => b.classList.toggle('on', b.dataset.bpTab === bpTab));
    if (bpTab === 'upload') {
      const up = now.startsWith('u:');
      body.innerHTML = `<div class="bp-up">${up ? `<div class="bp-cur" style="background-image:url('${profileBanner(id, true)}')"></div>` : '<div class="bp-cur empty"><i data-i="image"></i></div>'}
        <div><b>${up ? 'Your picture is on this profile' : 'Use your own picture'}</b><p>PNG, JPG or WebP, up to 12 MB. It is shrunk and stored on this Mac only.</p>
        <div class="bp-row"><button class="lp-btn solid" data-bp="pick"><i data-i="download"></i>Choose a picture</button>${up ? '<button class="lp-btn" data-bp="clear">Remove it</button>' : ''}</div><span class="bp-err" id="bpErr"></span></div></div>`;
    } else {
      const g = BANNER_GROUPS.find(x => x.id === bpTab);
      body.innerHTML = `<div class="bp-grid">${g.ids.map(i => `<button class="bp-th ${now === 'b' + String(i).padStart(3, '0') ? 'on' : ''}" data-bp-pick="b${String(i).padStart(3, '0')}" style="background-image:url('${bannerUrl(i)}')" aria-label="Banner ${i}"></button>`).join('')}</div>`;
    }
    icons(d);
  };
  const choose = async v => { await uiSet('banner.' + id, v); draw(); const card = $(`.lp[data-pid="${CSS.escape(id)}"] .lp-art`); if (card) card.style.backgroundImage = `url('${profileBanner(id)}')`; };
  d.addEventListener('click', async e => {
    const t = e.target.closest('[data-bp-tab]'); if (t) { bpTab = t.dataset.bpTab; return draw(); }
    const pk = e.target.closest('[data-bp-pick]'); if (pk) return choose(pk.dataset.bpPick);
    const b = e.target.closest('[data-bp]'); if (!b) return;
    if (b.dataset.bp === 'random') { const all = BANNER_POOL.filter(i => 'b' + String(i).padStart(3, '0') !== ((SET?.ui && SET.ui['banner.' + id]) || '')); const i = all[Math.floor(Math.random() * all.length)]; const g = BANNER_GROUPS.find(x => x.ids.includes(i)); bpTab = g.id; return choose('b' + String(i).padStart(3, '0')); }
    if (b.dataset.bp === 'clear') return choose('');
    if (b.dataset.bp === 'pick') { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/png,image/jpeg,image/webp';
      f.onchange = () => { const file = f.files[0]; if (!file) return; if (file.size > 12e6) { $('#bpErr').textContent = 'That picture is over 12 MB.'; return; }
        const r = new FileReader(); r.onload = async () => { const res = await window.dexter.bannerSave(id, r.result); if (!res.ok) { $('#bpErr').textContent = res.error; return; } BANNER_DIR = BANNER_DIR || await window.dexter.bannerDir(); choose('u:' + Date.now()); }; r.readAsDataURL(file); };
      f.click(); }
  });
  draw();
}
window.dexter?.bannerDir?.().then(u => { BANNER_DIR = u; });

// a small centred sheet for per-profile memory and Java arguments, and for the delete confirmation
function lpSheet(html) {
  $('#lpSheet')?.remove();
  const d = document.createElement('div'); d.id = 'lpSheet'; d.className = 'lp-sheet'; d.innerHTML = `<div class="lp-card">${html}</div>`; document.body.appendChild(d); icons(d); return d;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { lpClose(); $('#lpSheet')?.remove(); } });
document.addEventListener('click', async e => {
  const sheet = $('#lpSheet'); if (sheet && e.target === sheet) return sheet.remove();
  const dots = e.target.closest('[data-lib="menu"]');
  if (dots) { const id = dots.closest('.lp').dataset.pid; const was = lpMenu && lpMenu.dataset.pid === id; lpClose(); if (!was) lpOpen(dots, LIB.find(x => x.id === id)); return; }
  const direct = e.target.closest('[data-lm-direct]');
  if (direct) { return bannerPicker(direct.closest('.lp').dataset.pid); }
  const lm = e.target.closest('[data-lm]');
  if (lm && lpMenu) {
    const id = lpMenu.dataset.pid, p = LIB.find(x => x.id === id), k = lm.dataset.lm; lpClose();
    if (k === 'banner') return bannerPicker(id);
    if (k === 'icon') return window.openIconPicker(id);
    if (k === 'dup') { await BE('POST', `/instances/${encodeURIComponent(id)}/duplicate`, { name: p.name + ' copy' }); await loadInstances(); drawInstances(); return drawLibrary(); }
    if (k === 'folder') { const r = await BE('GET', `/instances/${encodeURIComponent(id)}/path`); return window.dexter?.openPath?.(r.data.path); }
    if (k === 'rename') {
      const card = $(`.lp[data-pid="${CSS.escape(id)}"]`), h = card && $('.pn', card); if (!h) return;
      const input = document.createElement('input'); input.className = 'lp-rename'; input.value = p.name; input.maxLength = 48; h.replaceWith(input); input.focus(); input.select();
      let done = false; const fin = async ok => { if (done) return; done = true; const v = input.value.trim(); if (ok && v && v !== p.name) await BE('POST', `/instances/${encodeURIComponent(id)}/rename`, { name: v }); await loadInstances(); drawInstances(); drawLibrary(); };
      input.onkeydown = ev => { if (ev.key === 'Enter') fin(true); if (ev.key === 'Escape') fin(false); }; input.onblur = () => fin(true); return;
    }
    if (k === 'cfg') {
      const d = lpSheet(`<h3>${esc(p.name)}</h3><p>Memory and Java arguments for this profile only.</p>
        <label>Memory<select name="ram"><option value="0">Automatic</option>${[2, 3, 4, 6, 8, 12, 16].map(g => `<option value="${g * 1024}"${p.ramMaxMb === g * 1024 ? ' selected' : ''}>${g} GB</option>`).join('')}</select></label>
        <label>Extra Java arguments<input name="args" value="${esc(p.jvmArgs)}" placeholder="-XX:+UseZGC" spellcheck="false"></label>
        <div class="lp-form-act"><button class="lp-btn" data-ls="close">Cancel</button><button class="lp-btn solid" data-ls="save">Save</button></div>`);
      d.dataset.pid = id; return;
    }
    if (k === 'del') {
      const d = lpSheet(`<h3>Delete ${esc(p.name)}?</h3><p>Its mods, worlds, resource packs and settings are removed from this Mac. This cannot be undone.</p>
        <div class="lp-form-act"><button class="lp-btn" data-ls="close">Keep it</button><button class="lp-btn danger" data-ls="del">Delete</button></div>`);
      d.dataset.pid = id; return;
    }
  }
  if (!e.target.closest('.lp-menu')) lpClose();
  const ls = e.target.closest('[data-ls]');
  if (ls) {
    const d = $('#lpSheet'), id = d.dataset.pid, k = ls.dataset.ls;
    if (k === 'close') return d.remove();
    if (k === 'save') { await BE('POST', `/instances/${encodeURIComponent(id)}/settings`, { ramMaxMb: +$('[name=ram]', d).value || 0, jvmArgs: $('[name=args]', d).value }); d.remove(); return drawLibrary(); }
    if (k === 'del') { ls.disabled = true; const r = await BE('DELETE', '/instances/' + encodeURIComponent(id)); d.remove(); if (r.status >= 300) toast(r.data?.error || 'Could not delete the profile'); await loadInstances(); inst = Math.min(inst, Math.max(0, INSTANCES.length - 1)); drawInstances(); return drawLibrary(); }
  }
  const b = e.target.closest('#libGrid [data-lib]'); if (!b) return;
  const id = b.closest('.lp').dataset.pid, k = b.dataset.lib;
  if (k === 'play' || k === 'mods') { await loadInstances(); inst = Math.max(0, INSTANCES.findIndex(x => x.id === id)); drawInstances(); loadMods(); if (k === 'mods') return go('mods'); return launch(); }
});

/* ======================= more Dexter settings: in-game interface prefs, folders, system check ======================= */
const _drawVSettings = drawVSettings;
drawVSettings = function () { _drawVSettings(); drawVExtra(); };
async function drawVExtra() {
  const host = $('#vsLauncher'); if (!host) return;
  const r = await BE('GET', '/interface'); const ip = r.status === 200 ? r.data : { sounds: true, titleMusic: true, guides: true };
  const tg = (k, ic, t, note, on) => `<div class="set"><span class="si"><i data-i="${ic}"></i></span><b>${t}<small>${note}</small></b><label class="tg"><input type="checkbox" data-if="${k}" ${on ? 'checked' : ''}><span></span></label></div>`;
  const act = (id, ic, t, note, label) => `<div class="set"><span class="si"><i data-i="${ic}"></i></span><b>${t}<small id="${id}Note">${note}</small></b><button class="lp-btn" data-act="${id}">${label}</button></div>`;
  host.querySelectorAll('.vx').forEach(n => n.remove());
  const x = document.createElement('div'); x.className = 'vx';
  x.innerHTML = tg('titleMusic', 'play', 'Title screen music', 'A calm Dexter track on the game’s title screen instead of the menu music.', ip.titleMusic)
    + tg('guides', 'star', 'First-start guide', 'New profiles walk you through the main settings once.', ip.guides)
    + tg('sounds', 'play', 'In-game interface sounds', 'The quiet clicks in the game’s Dexter menus.', ip.sounds)
    + act('sysCheck', 'shield', 'System check', 'Memory, swap and disk space.', 'Run')
    + act('openData', 'folder', 'Launcher data', 'Where profiles, accounts and settings live.', 'Open')
    + act('openLogs', 'folder', 'Launcher logs', 'Send these if something breaks.', 'Open');
  host.appendChild(x); icons(x);
}
document.addEventListener('change', e => { const c = e.target.closest('[data-if]'); if (c) BE('PUT', '/interface', { [c.dataset.if]: c.checked }); if (e.target.closest('[data-vk="ui:sounds"]')) BE('PUT', '/interface', { sounds: e.target.checked }); });
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'sysCheck') { b.disabled = true; const r = await BE('GET', '/systemcheck'); b.disabled = false; const n = $('#sysCheckNote'); if (r.status === 200) n.innerHTML = r.data.checks.map(c => `<span style="display:block;color:${c.ok ? '#9be3a8' : '#ff9a9e'}">${c.ok ? '✓' : '!'} ${esc(c.name)}: ${esc(c.value)}</span>`).join(''); return; }
  const f = await BE('GET', '/folders'); if (f.status === 200) window.dexter?.openPath?.(b.dataset.act === 'openLogs' ? f.data.logs : f.data.data);
});


/* ======================= a clean sort dropdown for Mods (the native <select> popup was glitchy) ======================= */
(function () {
  const sel = $('#modSort'); if (!sel) return;
  sel.hidden = true;
  const dd = document.createElement('div'); dd.className = 'dd'; dd.id = 'modSortDd';
  dd.innerHTML = `<button type="button" class="dd-btn"><span></span><i data-i="down"></i></button><div class="dd-menu" hidden>${[...sel.options].map(o => `<button type="button" data-val="${o.value}">${o.textContent}</button>`).join('')}</div>`;
  sel.after(dd); icons(dd);
  const sync = () => { $('.dd-btn span', dd).textContent = sel.options[sel.selectedIndex].textContent; $$('.dd-menu button', dd).forEach(b => b.classList.toggle('on', b.dataset.val === sel.value)); };
  sync();
  dd.addEventListener('click', e => {
    const b = e.target.closest('.dd-btn'), o = e.target.closest('.dd-menu button');
    if (b) { $('.dd-menu', dd).hidden = !$('.dd-menu', dd).hidden; return; }
    if (o) { sel.value = o.dataset.val; sync(); $('.dd-menu', dd).hidden = true; sel.dispatchEvent(new Event('change')); }
  });
  document.addEventListener('click', e => { if (!dd.contains(e.target)) $('.dd-menu', dd).hidden = true; });
})();
