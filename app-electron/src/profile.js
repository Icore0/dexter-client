/* profile.js - V2: no Mods tab. A profile in the Library opens its own page (installed list, description, basics, and the
   Modrinth browser for mods, texture packs, data packs and shaders). New profile is a centred card with icon, banner, name,
   version, and a Modrinth modpack popup. FRONT END: uses the backend calls that already exist (/instances, /modpacks).
   File import of a .mrpack has no backend call yet: ProfileAPI.importMrpack is the hand-off hook (API-CONTRACT.md). */
(function () {
  const sound = n => { try { typeof sfx === 'function' && sfx(n); } catch { /* optional */ } };
  const say = m => { try { toast(m); } catch { /* optional */ } };
  window.ProfileAPI = window.ProfileAPI || { importMrpack: null };
  const ICON_SET = ['gamepad', 'bolt', 'sword', 'pickaxe', 'gem', 'leaf', 'fire', 'shield', 'crown', 'star', 'heart', 'world'];
  const iconOf = id => (SET?.ui && SET.ui['icon.' + id]) || '';
  const iconHtml = (id, name) => `<i data-i="${profileIcon({ id, name })}"></i>`;

  /* ---------------- 1) the Mods tab is gone; its page becomes the profile page ---------------- */
  document.querySelector('#tabs [data-go="mods"]')?.remove();
  document.querySelector('#modType [data-t="modpack"]')?.remove();
  const rp = document.querySelector('#modType [data-t="resourcepack"]'); if (rp) rp.lastChild.textContent = 'Texture Packs';
  const mv = document.getElementById('modView'); mv.insertBefore(mv.querySelector('[data-v="installed"]'), mv.firstChild);
  mv.querySelector('[data-v="installed"]').classList.add('on'); mv.querySelector('[data-v="browse"]').classList.remove('on');
  const modsPage = document.getElementById('mods');
  const head = document.createElement('div'); head.id = 'pfHead'; head.className = 'pf-head'; modsPage.querySelector('.scroll').insertBefore(head, modsPage.querySelector('.scroll').firstChild);
  moveInd?.();

  // the profile page has no tab of its own: Library stays highlighted while it is open
  const _mi = moveInd; moveInd = () => { if (document.querySelector('#tabs button.on')) _mi(); };
  const _go = go; go = function (id) { const r = _go(id); if (id === 'mods') { document.querySelector('#tabs [data-go="library"]')?.classList.add('on'); } moveInd(); return r; };
  let pfId = '', pfQ = '', pfFilter = 'all';
  const TYPE_NAME = { mod: 'Mod', resourcepack: 'Texture pack', datapack: 'Data pack', shader: 'Shader' };
  // everything the old Mods page had (type tabs, search, sort, categories, grid) moves into the "Add content" popup; it waits here, hidden
  const holder = document.createElement('div'); holder.id = 'pfStore'; holder.hidden = true;
  const sc = modsPage.querySelector('.scroll');
  [...sc.children].filter(c => c.id !== 'pfHead').forEach(c => holder.appendChild(c)); sc.appendChild(holder);
  const bar = document.createElement('div'); bar.className = 'pf-bar'; bar.id = 'pfBar';
  bar.innerHTML = `<label class="search"><i data-i="search"></i><input id="pfQ" placeholder="Search installed" autocomplete="off" spellcheck="false" maxlength="60"></label><button class="btn green" data-pf="add"><i data-i="download"></i>Add content</button>`;
  const list = document.createElement('div'); list.className = 'pf-list'; list.id = 'pfList';
  const rib = document.createElement('nav'); rib.className = 'pf-rib'; rib.id = 'pfRib'; rib.setAttribute('aria-label', 'Filter by type');
  const RIB = [['all', 'All'], ['mod', 'Mods'], ['resourcepack', 'Texture packs'], ['shader', 'Shaders'], ['datapack', 'Data packs']];
  sc.insertBefore(bar, holder); sc.insertBefore(rib, holder); sc.insertBefore(list, holder); icons(bar);

  let pfDir = '', pfItems = [], pfSeq = 0;
  async function scan() {
    const i = INSTANCES[inst]; if (!i) { pfItems = []; return; }
    const r = await BE('GET', `/instances/${encodeURIComponent(i.id)}/path`); pfDir = r.status === 200 ? r.data.path : '';
    let disk = []; try { disk = pfDir ? await window.dexter.profileItems(pfDir) : []; } catch { disk = []; }
    const packs = [...installed().values()].filter(m => m.type === 'datapack').map(m => ({ type: 'datapack', file: m.file || '', enabled: true, title: m.title, author: m.author || '', version: '', icon: m.icon || '', key: m.key }));
    pfItems = [...disk, ...packs];
  }
  async function drawHead() {
    const seq = ++pfSeq; head.innerHTML = head.innerHTML || '';
    await scan(); if (seq !== pfSeq) return;
    const p = (LIB || []).find(x => x.id === pfId) || INSTANCES[inst] && { id: INSTANCES[inst].id, name: INSTANCES[inst].name, version: INSTANCES[inst].ver, loader: INSTANCES[inst].loader, playMillis: 0 };
    if (!p) { head.innerHTML = ''; return; }
    const desc = (SET?.ui && SET.ui['desc.' + p.id]) || `A ${p.loader} profile on Minecraft ${p.version}.`;
    const k = profileIcon(p);
    head.innerHTML = `<div class="pf-banner" style="background-image:url('${profileBanner(p.id, true)}')"></div>
      <div class="pf-in">
        <button class="pf-back" data-pf="back"><i data-i="left"></i>Library</button>
        <div class="pf-main">
          <button class="pf-ico" data-pf="icon" title="Change icon" aria-label="Change icon">${profileIconHtml(p)}<span class="pf-ico-edit"><i data-i="edit"></i></span></button>
          <div class="pf-t"><h2>${esc(p.name)}</h2>
            <div class="pf-chips"><span class="pill"><i data-i="world"></i>${esc(p.version)}</span><span class="pill purple"><i data-i="layers"></i>${esc(p.loader)}</span><span class="pill"><i data-i="mods"></i>${pfItems.length} installed</span><span class="pill"><i data-i="clock"></i>${p.playMillis ? fmtPlay(p.playMillis) + ' played' : 'Not played yet'}</span></div>
            <button class="pf-desc" data-pf="desc" title="Edit description">${esc(desc)}<i data-i="edit"></i></button></div>
          <div class="pf-act"><button class="btn solid" data-pf="play"><i data-i="play"></i>Play</button><button class="ib" data-pf="folder" title="Open profile folder" aria-label="Open profile folder"><i data-i="folder"></i></button></div>
        </div>
      </div>`;
    icons(head); drawList(); loadProfileIcons([p.id]);
  }
  document.addEventListener('dx-icons', () => { if (document.getElementById('mods')?.classList.contains('on') && pfId) drawHead(); });
  const FALLBACK_ICON = { mod: 'mods', resourcepack: 'image', datapack: 'code', shader: 'sun' };
  function drawList() {
    const q = pfQ.toLowerCase();
    rib.innerHTML = RIB.map(([k, n]) => `<button data-pff="${k}" class="${k === pfFilter ? 'on' : ''}">${n}<span>${k === 'all' ? pfItems.length : pfItems.filter(m => m.type === k).length}</span></button>`).join('');
    const rows = pfItems.map((m, n) => ({ m, n })).filter(({ m }) => (pfFilter === 'all' || m.type === pfFilter) && (!q || (m.title || '').toLowerCase().includes(q) || (m.author || '').toLowerCase().includes(q)));
    list.innerHTML = rows.length ? rows.map(({ m, n }) => `<div class="pf-row${m.enabled ? '' : ' off'}"><div class="pf-ri">${m.icon ? `<img src="${esc(m.icon)}" alt="" onerror="this.style.display='none'">` : ''}<i data-i="${FALLBACK_ICON[m.type] || 'mods'}"></i></div>
        <div class="t"><b>${esc(m.title || m.key)}</b><span>${[m.author ? 'by ' + esc(m.author) : '', m.version ? esc(m.version) : ''].filter(Boolean).join(' · ') || esc(m.file || '')}</span></div>
        <span class="pf-type t-${m.type}">${TYPE_NAME[m.type] || m.type}</span>
        ${m.type === 'datapack' ? '<span class="pf-tgsp"></span>' : `<label class="tg" title="${m.enabled ? 'On: turn off without removing' : 'Off: turn on'}"><input type="checkbox" data-pftg="${n}" ${m.enabled ? 'checked' : ''}><span></span></label>`}
        <button class="ib pf-rm" data-pfrm="${n}" title="Remove" aria-label="Remove"><i data-i="trash"></i></button></div>`).join('')
      : `<div class="pf-empty"><i data-i="${pfItems.length ? 'search' : 'mods'}"></i><b>${pfItems.length ? (pfFilter !== 'all' && !q ? `No ${RIB.find(r => r[0] === pfFilter)[1].toLowerCase()} yet` : 'Nothing matches') : 'Nothing installed yet'}</b><span>${pfItems.length ? (pfFilter !== 'all' && !q ? 'Press Add content.' : 'Try another word.') : 'Add mods, texture packs, data packs or shaders.'}</span>${pfItems.length && (pfFilter === 'all' || q) ? '' : '<button class="btn green" data-pf="add"><i data-i="download"></i>Add content</button>'}</div>`;
    icons(list);
  }
  rib.addEventListener('click', e => { const b = e.target.closest('[data-pff]'); if (b) { pfFilter = b.dataset.pff; sound('select'); drawList(); } });
  document.getElementById('pfQ').addEventListener('input', e => { pfQ = e.target.value.trim(); drawList(); });
  list.addEventListener('change', async e => {
    const t = e.target.closest('[data-pftg]'); if (!t) return; const m = pfItems[+t.dataset.pftg]; if (!m) return;
    const r = await window.dexter.itemToggle(pfDir, m.type, m.file, t.checked);
    if (r?.ok) { m.file = r.file; m.enabled = t.checked; t.closest('.pf-row').classList.toggle('off', !t.checked); } else { t.checked = !t.checked; sound('error'); say('Could not change that file'); }
  });
  list.addEventListener('click', async e => {
    const r = e.target.closest('[data-pfrm]'); if (!r) return; const m = pfItems[+r.dataset.pfrm]; if (!m) return;
    if (m.type === 'datapack') { const i = INSTANCES[inst], t = installed().get(m.key); if (i && t?.file) BE('DELETE', `/instances/${encodeURIComponent(i.id)}/items?type=${t.type}&file=${encodeURIComponent(t.file)}`); installed().delete(m.key); if (i) saveItems(i); }
    else { const res = await window.dexter.itemTrash(pfDir, m.type, m.file); if (!res?.ok) { sound('error'); say('Could not remove that file'); return; } }
    sound('close'); drawHead();
  });
  function prep(id) { pfId = id; pfQ = ''; pfFilter = 'all'; const q = document.getElementById('pfQ'); if (q) q.value = ''; view = 'installed'; type = 'mod'; cat = ''; query = ''; }
  PAGE_LOAD.mods = () => drawHead();
  window.openProfile = async id => { sound('click'); prep(id); await loadInstances(); inst = Math.max(0, INSTANCES.findIndex(x => x.id === id)); drawInstances(); go('mods'); drawHead(); };

  /* "Add content": the Modrinth browser in a floating window over a blurred background */
  function openAdd() {
    if (document.getElementById('addSheet')) return;
    sound('open'); view = 'browse'; type = 'mod'; cat = ''; query = '';
    const d = document.createElement('div'); d.className = 'v2-sheet'; d.id = 'addSheet';
    d.innerHTML = `<div class="v2-card add"><header><div><small>Add to</small><h3>${esc(INSTANCES[inst]?.name || 'profile')}</h3></div><button class="ib" data-pf="addclose" aria-label="Close"><span class="wi-x"></span></button></header><div class="add-body" id="addBody"></div></div>`;
    document.body.appendChild(d);
    const body = d.querySelector('#addBody'); [...holder.children].forEach(c => body.appendChild(c));
    $$('#modType button').forEach(b => b.classList.toggle('on', b.dataset.t === 'mod')); const q = document.getElementById('modQ'); if (q) q.value = '';
    drawCats(); loadMods();
    d.addEventListener('click', e => { if (e.target === d) closeAdd(); });
  }
  function closeAdd() {
    const d = document.getElementById('addSheet'); if (!d) return;
    [...d.querySelector('#addBody').children].forEach(c => holder.appendChild(c)); d.remove(); view = 'installed'; sound('close'); drawHead();
  }
  // the Library's own "Mods" button (handled in extras2) and a click on the card both open the profile
  document.addEventListener('click', e => { const b = e.target.closest('[data-lib="mods"]'); if (b) { const c = b.closest('[data-pid]'); if (c) prep(c.dataset.pid); } }, true);
  document.addEventListener('click', async e => {
    const card = e.target.closest('.lp'); if (!card || e.target.closest('button, .lp-menu, input, select')) return;
    sound('click'); prep(card.dataset.pid); await loadInstances(); inst = Math.max(0, INSTANCES.findIndex(x => x.id === card.dataset.pid)); drawInstances(); loadMods(); go('mods');
  });
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-pf]'); if (!b) return; const k = b.dataset.pf;
    if (k === 'back') return go('library');
    if (k === 'add') return openAdd();
    if (k === 'addclose') return closeAdd();
    if (k === 'play') { sound('launch'); return launch(); }
    if (k === 'banner') return bannerPicker(pfId);
    if (k === 'icon') return openIconPicker(pfId);
    if (k === 'folder') { const r = await BE('GET', `/instances/${encodeURIComponent(INSTANCES[inst]?.id || pfId)}/path`); const ok = r.status === 200 && await window.dexter?.openPath?.(r.data.path); if (!ok) { sound('error'); say('Could not open the folder'); } return; }
    if (k === 'desc') {
      const cur = (SET?.ui && SET.ui['desc.' + pfId]) || ''; const ta = document.createElement('textarea'); ta.className = 'pf-edit'; ta.maxLength = 160; ta.value = cur; ta.placeholder = 'Describe this profile'; b.replaceWith(ta); ta.focus();
      let done = false; const fin = async ok => { if (done) return; done = true; if (ok) await uiSet('desc.' + pfId, ta.value.trim().slice(0, 160)); drawHead(); };
      ta.onkeydown = ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); fin(true); } if (ev.key === 'Escape') fin(false); }; ta.onblur = () => fin(true);
    }
  });

  /* ---------------- 2) icons on the Library cards ---------------- */
  const decorate = () => $$('#libGrid .lp').forEach(c => { const h = c.querySelector('.lp-head'); if (!h || h.querySelector('.lp-ico')) return; const id = c.dataset.pid, p = LIB.find(x => x.id === id); if (!p) return; const d = document.createElement('div'); d.className = 'lp-ico'; d.innerHTML = iconHtml(id, p.name); h.insertBefore(d, h.firstChild); icons(d); });
  new MutationObserver(decorate).observe(document.getElementById('libGrid'), { childList: true });

  /* ---------------- 3) a tidy sort dropdown (the native one looked off) ---------------- */
  function ddify(sel) {
    if (!sel || sel.dataset.dd) return; sel.dataset.dd = '1'; sel.hidden = true;
    const dd = document.createElement('div'); dd.className = 'dd';
    dd.innerHTML = `<button type="button" class="dd-btn"><span></span><i data-i="down"></i></button><div class="dd-menu" hidden>${[...sel.options].map(o => `<button type="button" data-val="${o.value}">${o.textContent}</button>`).join('')}</div>`;
    sel.after(dd); icons(dd);
    const sync = () => { $('.dd-btn span', dd).textContent = sel.options[sel.selectedIndex].textContent; $$('.dd-menu button', dd).forEach(b => b.classList.toggle('on', b.dataset.val === sel.value)); }; sync();
    dd.addEventListener('click', e => { const b = e.target.closest('.dd-btn'), o = e.target.closest('.dd-menu button'); if (b) { $('.dd-menu', dd).hidden = !$('.dd-menu', dd).hidden; sound('click'); return; } if (o) { sel.value = o.dataset.val; sync(); $('.dd-menu', dd).hidden = true; sel.dispatchEvent(new Event('change', { bubbles: true })); } });
    document.addEventListener('click', e => { if (!dd.contains(e.target)) $('.dd-menu', dd).hidden = true; });
  }
  new MutationObserver(() => ddify(document.getElementById('libSort'))).observe(document.getElementById('libHero'), { childList: true });

  /* ---------------- 4) New profile: a centred floating card ---------------- */
  let np = null;
  function openNewProfile() {
    sound('open');
    const versions = (typeof VERSIONS !== 'undefined' && VERSIONS.length ? VERSIONS.map(v => v.id) : ['1.21.11']);
    const pad = i => 'b' + String(i).padStart(3, '0');
    let iconImg = '';
    let banner = pad(BANNER_POOL[Math.floor(Math.random() * BANNER_POOL.length)]), upload = '', icon = 'gamepad', tab = BANNER_GROUPS.find(g => g.ids.includes(+banner.slice(1)))?.id || BANNER_GROUPS[0].id;
    const d = document.createElement('div'); d.className = 'v2-sheet'; d.id = 'npSheet';
    d.innerHTML = `<form class="v2-card np" autocomplete="off">
      <div class="np-banner" id="npBanner"><div class="np-ico" id="npIco"></div><div class="np-bacts"><button type="button" class="lp-btn" data-np="random"><i data-i="refresh"></i>Random</button><button type="button" class="lp-btn" data-np="upload"><i data-i="image"></i>Upload</button></div></div>
      <nav class="np-tabs" id="npTabs">${BANNER_GROUPS.map(g => `<button type="button" data-npt="${g.id}">${g.name}</button>`).join('')}</nav>
      <div class="np-thumbs" id="npThumbs"></div>
      <div class="np-row"><label class="np-f">Name<input name="n" placeholder="e.g. Practice, Skyblock" maxlength="48" spellcheck="false" required></label>
        <label class="np-f narrow">Version<select name="v">${versions.map(v => `<option>${esc(v)}</option>`).join('')}</select></label></div>
      <div class="np-label">Icon</div><div class="np-icons" id="npIcons">${ICON_SET.map(k => `<button type="button" data-npi="${k}" title="${k}"><i data-i="${k}"></i></button>`).join('')}<button type="button" class="np-up" data-np="iconup"><i data-i="image"></i>Upload picture</button></div>
      <div class="np-mp"><button type="button" class="btn ghost sm" data-np="import"><i data-i="download"></i>Import modpack</button><button type="button" class="btn ghost sm" data-np="modrinth"><i data-i="modrinth"></i>Modrinth modpacks</button><button type="button" class="btn ghost sm" data-np="detect"><i data-i="folder"></i>Import from another launcher</button></div>
      <span class="fr-err" id="npErr"></span>
      <div class="v2-actions"><button type="button" class="btn ghost" data-np="cancel">Cancel</button><button type="submit" class="btn solid">Create profile</button></div></form>`;
    document.body.appendChild(d); np = d; icons(d);
    const paint = () => {
      const url = upload || bannerUrl(+banner.slice(1));
      $('#npBanner', d).style.backgroundImage = `url('${url}')`; $('#npIco', d).innerHTML = iconImg ? `<img src="${iconImg}" alt="">` : `<i data-i="${icon}"></i>`; icons($('#npIco', d));
      $$('#npTabs button', d).forEach(b => b.classList.toggle('on', b.dataset.npt === tab));
      const g = BANNER_GROUPS.find(x => x.id === tab); $('#npThumbs', d).innerHTML = g.ids.slice(0, 40).map(i => `<button type="button" data-npb="${pad(i)}" class="${!upload && banner === pad(i) ? 'on' : ''}" style="background-image:url('${bannerUrl(i)}')" aria-label="Banner ${i}"></button>`).join('');
      $$('#npIcons button', d).forEach(b => b.classList.toggle('on', b.dataset.npi === icon));
    };
    paint(); { const vs = d.querySelector('select[name=v]'); if (versions.includes('1.21.11')) vs.value = '1.21.11'; } d.querySelector('input[name=n]').focus();
    const close = () => { d.remove(); np = null; sound('close'); };
    d.addEventListener('click', async e => {
      if (e.target === d) return close();
      const t = e.target.closest('[data-npt]'); if (t) { tab = t.dataset.npt; return paint(); }
      const bb = e.target.closest('[data-npb]'); if (bb) { banner = bb.dataset.npb; upload = ''; return paint(); }
      const ic = e.target.closest('[data-npi]'); if (ic) { icon = ic.dataset.npi; iconImg = ''; return paint(); }
      const a = e.target.closest('[data-np]'); if (!a) return; const k = a.dataset.np;
      if (k === 'cancel') return close();
      if (k === 'random') { const i = BANNER_POOL[Math.floor(Math.random() * BANNER_POOL.length)]; banner = pad(i); upload = ''; tab = BANNER_GROUPS.find(g => g.ids.includes(i))?.id || tab; return paint(); }
      if (k === 'upload') {
        const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/png,image/jpeg,image/webp';
        f.onchange = () => { const file = f.files[0]; if (!file) return; if (file.size > 12e6) { $('#npErr', d).textContent = 'That picture is over 12 MB.'; return; } const r = new FileReader(); r.onload = () => { upload = r.result; $('#npErr', d).textContent = ''; paint(); }; r.readAsDataURL(file); };
        return f.click();
      }
      if (k === 'import') {
        const f = document.createElement('input'); f.type = 'file'; f.accept = '.mrpack,application/zip';
        f.onchange = async () => { const file = f.files[0]; if (!file) return; if (typeof window.ProfileAPI.importMrpack !== 'function') { sound('error'); $('#npErr', d).textContent = 'Modpack import is coming soon.'; return; } try { await window.ProfileAPI.importMrpack(file); sound('success'); close(); await loadInstances(); drawInstances(); drawLibrary(); } catch (err) { sound('error'); $('#npErr', d).textContent = 'Could not import that file.'; } };
        return f.click();
      }
      if (k === 'iconup') { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/png,image/jpeg,image/webp'; f.onchange = () => { const file = f.files[0]; if (!file) return; if (file.size > 4e6) { $('#npErr', d).textContent = 'That picture is over 4 MB.'; return; } const r = new FileReader(); r.onload = async () => { try { iconImg = await imgToPng(r.result); $('#npErr', d).textContent = ''; paint(); } catch { $('#npErr', d).textContent = 'Could not read that picture.'; } }; r.readAsDataURL(file); }; return f.click(); }
      if (k === 'modrinth') return openModpacks(d);
      if (k === 'detect') return openImport(d);
    });
    d.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target, name = f.n.value.trim(); if (!name) return;
      const btn = f.querySelector('[type=submit]'); btn.disabled = true;
      const r = await BE('POST', '/instances', { name, version: f.v.value.trim() });
      if (r.status !== 200) { btn.disabled = false; sound('error'); $('#npErr', d).textContent = r.data.error || 'Could not create the profile.'; return; }
      const id = r.data.created;
      await uiSet('icon.' + id, icon); if (iconImg) { await window.dexter.profileIconSet(id, iconImg); PROFILE_IMG.delete(id); }
      if (upload) { const s = await window.dexter?.bannerSave?.(id, upload); if (s?.ok) await uiSet('banner.' + id, 'u:' + Date.now()); else await uiSet('banner.' + id, banner); } else await uiSet('banner.' + id, banner);
      sound('success'); d.remove(); np = null;
      await loadInstances(); drawInstances(); drawLibrary();
    });
  }
  document.addEventListener('click', e => { if (e.target.closest('#libNewBtn')) { e.stopImmediatePropagation(); e.preventDefault(); if (!np) openNewProfile(); } }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (document.getElementById('impSheet') && !document.getElementById('impSheet').dataset.busy) document.getElementById('impSheet').remove(); else if (document.getElementById('mpSheet')) document.getElementById('mpSheet').remove(); else if (document.getElementById('addSheet')) closeAdd(); else if (np) { np.remove(); np = null; } } });

  /* ---------------- 4b) Import profiles from another launcher (Modrinth App, Prism, MultiMC) ---------------- */
  async function openImport(parent) {
    sound('open');
    const d = document.createElement('div'); d.className = 'v2-sheet top'; d.id = 'impSheet';
    d.innerHTML = `<div class="v2-card imp"><header><div><small>Import</small><h3>From another launcher</h3></div><button class="ib" data-imp="close" aria-label="Close"><span class="wi-x"></span></button></header>
      <div class="imp-body" id="impBody"><div class="imp-state"><span class="spin"></span>Looking for launchers on this computer…</div></div>
      <footer id="impFoot" hidden><label class="imp-w"><label class="tg"><input type="checkbox" id="impWorlds"><span></span></label>Include worlds (can be big)</label><button class="btn ghost sm" data-imp="all">Select all</button><button class="btn green" data-imp="go" id="impGo" disabled>Import</button></footer></div>`;
    document.body.appendChild(d);
    const versions = (typeof VERSIONS !== 'undefined' ? VERSIONS.map(v => v.id) : []);
    let found = []; try { found = await window.dexter.launchersDetect(); } catch { found = []; }
    const body = d.querySelector('#impBody'); const all = [];
    if (!found.length) { body.innerHTML = '<div class="imp-state"><i data-i="search"></i><b>No other launcher found</b><span>Looks for Modrinth App, Prism and MultiMC.</span></div>'; icons(body); return wire(); }
    body.innerHTML = found.map(l => `<div class="sp-label">${esc(l.name)} · ${l.instances.length}</div>` + l.instances.map(r => {
      const why = !['fabric', 'vanilla'].includes(r.loader) ? `Needs Fabric (this is ${r.loader})` : versions.length && !versions.includes(r.version) ? `Minecraft ${r.version} not supported` : '';
      all.push({ ...r, why, launcher: l.name });
      return `<label class="imp-row${why ? ' no' : ''}" data-ik="${esc(r.key)}"><input type="checkbox" ${why ? 'disabled' : 'checked'}><span class="imp-ck"></span><div class="t"><b>${esc(r.name)}</b><span>${esc(r.version)} · ${esc(r.loader)} · ${r.mods} ${r.mods === 1 ? 'mod' : 'mods'}${why ? ' · ' + esc(why) : ''}</span></div><i class="imp-st" data-st></i></label>`;
    }).join('')).join('');
    icons(body); d.querySelector('#impFoot').hidden = false; sync(); wire();
    function chosen() { return [...body.querySelectorAll('.imp-row input:checked')].map(c => all.find(r => r.key === c.closest('.imp-row').dataset.ik)); }
    function sync() { const n = chosen().length; const g = d.querySelector('#impGo'); g.disabled = !n; g.textContent = n ? `Import ${n} ${n === 1 ? 'profile' : 'profiles'}` : 'Import'; }
    function wire() {
      d.addEventListener('change', e => { if (e.target.closest('.imp-row')) sync(); });
      d.addEventListener('click', async e => {
        if (e.target === d || e.target.closest('[data-imp="close"]')) { if (!d.dataset.busy) { d.remove(); sound('close'); } return; }
        if (e.target.closest('[data-imp="all"]')) { body.querySelectorAll('.imp-row:not(.no) input').forEach(c => { c.checked = true; }); return sync(); }
        if (!e.target.closest('[data-imp="go"]')) return;
        const todo = chosen(); if (!todo.length) return; d.dataset.busy = '1'; const worlds = d.querySelector('#impWorlds').checked; d.querySelector('#impGo').disabled = true;
        const names = new Map(); let ok = 0;
        for (const r of todo) {
          const row = body.querySelector(`[data-ik="${CSS.escape(r.key)}"]`), st = row.querySelector('[data-st]'); st.className = 'imp-st spin';
          const dup = todo.filter(x => x.name === r.name).length > 1; const name = (dup ? `${r.name} (${r.version})` : r.name).slice(0, 48);
          try {
            const c = await BE('POST', '/instances', { name, version: r.version }); if (c.status !== 200) throw new Error(c.data.error || 'Could not create');
            const id = c.data.created, p = await BE('GET', `/instances/${encodeURIComponent(id)}/path`);
            const res = await window.dexter.instanceCopy(r.dir, p.data.path, worlds, r.icon); if (!res.ok) throw new Error(res.error);
            await uiSet('desc.' + id, `Imported from ${r.launcher}.`); st.className = 'imp-st done'; st.textContent = 'Done'; ok++;
          } catch (err) { st.className = 'imp-st fail'; st.textContent = 'Failed'; row.querySelector('.t span').textContent = String(err.message || err).slice(0, 80); }
        }
        delete d.dataset.busy; sound(ok ? 'success' : 'error'); say(ok ? `${ok} ${ok === 1 ? 'profile' : 'profiles'} imported` : 'Nothing was imported');
        await loadInstances(); drawInstances(); drawLibrary();
        d.querySelector('#impGo').textContent = 'Done'; d.querySelector('#impGo').onclick = () => { d.remove(); parent?.remove(); np = null; };
        d.querySelector('#impGo').disabled = false; d.querySelector('#impGo').dataset.imp = 'x';
      });
    }
  }

  /* ---------------- icon picker: a glyph, or your own picture ---------------- */
  window.openIconPicker = function (id) {
    if (document.getElementById('ipSheet')) return; sound('open');
    const prof = (LIB || []).find(x => x.id === id) || { id, name: '' };
    const d = document.createElement('div'); d.className = 'v2-sheet'; d.id = 'ipSheet';
    d.innerHTML = `<div class="v2-card ip"><header><div><small>Profile</small><h3>Icon</h3></div><button class="ib" data-ip="close" aria-label="Close"><span class="wi-x"></span></button></header>
      <div class="ip-now" id="ipNow"></div>
      <div class="np-icons" id="ipGrid">${ICON_SET.map(k => `<button type="button" data-ipk="${k}" title="${k}"><i data-i="${k}"></i></button>`).join('')}</div>
      <div class="v2-actions"><button class="btn ghost sm" data-ip="remove" id="ipRemove">Remove picture</button><button class="btn solid sm" data-ip="upload"><i data-i="image"></i>Upload picture</button></div><span class="fr-err" id="ipErr"></span></div>`;
    document.body.appendChild(d);
    const paint = () => { const has = !!PROFILE_IMG.get(id); $('#ipNow', d).innerHTML = `<div class="pf-ico sm">${profileIconHtml(prof)}</div><span class="muted">${has ? 'Your picture is used.' : 'Pick a symbol or upload a picture.'}</span>`; $('#ipRemove', d).hidden = !has; const cur = (SET?.ui && SET.ui['icon.' + id]) || ''; $$('#ipGrid button', d).forEach(b => b.classList.toggle('on', !has && b.dataset.ipk === cur)); icons(d); };
    paint();
    const refresh = async () => { PROFILE_IMG.delete(id); await loadProfileIcons([id]); document.dispatchEvent(new Event('dx-icons')); paint(); };
    const close = () => { d.remove(); sound('close'); };
    d.addEventListener('click', async e => {
      if (e.target === d || e.target.closest('[data-ip="close"]')) return close();
      const g = e.target.closest('[data-ipk]'); if (g) { await window.dexter.profileIconClear(id); PROFILE_IMG.set(id, ''); await uiSet('icon.' + id, g.dataset.ipk); sound('select'); document.dispatchEvent(new Event('dx-icons')); return paint(); }
      const a = e.target.closest('[data-ip]'); if (!a) return;
      if (a.dataset.ip === 'remove') { await window.dexter.profileIconClear(id); PROFILE_IMG.set(id, ''); sound('close'); document.dispatchEvent(new Event('dx-icons')); return paint(); }
      if (a.dataset.ip === 'upload') {
        const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/png,image/jpeg,image/webp';
        f.onchange = () => { const file = f.files[0]; if (!file) return; if (file.size > 4e6) { $('#ipErr', d).textContent = 'That picture is over 4 MB.'; return; } const r = new FileReader(); r.onload = async () => { let png; try { png = await imgToPng(r.result); } catch { sound('error'); $('#ipErr', d).textContent = 'Could not read that picture.'; return; } const res = await window.dexter.profileIconSet(id, png); if (!res.ok) { sound('error'); $('#ipErr', d).textContent = res.error || 'Could not use that picture.'; return; } sound('success'); $('#ipErr', d).textContent = ''; await refresh(); }; r.readAsDataURL(file); };
        f.click();
      }
    });
  };

  /* ---------------- 5) Modrinth modpacks popup (modpacks only) ---------------- */
  function openModpacks(parent) {
    sound('open');
    const d = document.createElement('div'); d.className = 'v2-sheet top'; d.id = 'mpSheet';
    d.innerHTML = `<div class="v2-card mp"><header><h3>Modrinth modpacks</h3><button class="ib" data-mp="close" aria-label="Close"><i data-i="x"></i></button></header>
      <div class="tx-search"><i data-i="search"></i><input id="mpQ" placeholder="Search modpacks" maxlength="60" spellcheck="false" autocomplete="off"></div>
      <div class="mp-list" id="mpList"></div></div>`;
    document.body.appendChild(d); $('#mpQ', d).focus();
    if (!ICONS.x) { $('[data-mp=close]', d).innerHTML = '<span class="wi-x"></span>'; } else icons(d);
    let ctl, t;
    const fmtN = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n);
    async function load() {
      ctl?.abort(); ctl = new AbortController(); $('#mpList', d).innerHTML = '<div class="skel"></div>'.repeat(5);
      const q = $('#mpQ', d).value.trim();
      try {
        const r = await fetch(`https://api.modrinth.com/v2/search?limit=24&index=${q ? 'relevance' : 'downloads'}&query=${encodeURIComponent(q)}&facets=${encodeURIComponent(JSON.stringify([['project_type:modpack']]))}`, { signal: ctl.signal });
        const { hits } = await r.json();
        $('#mpList', d).innerHTML = hits.length ? hits.map(h => `<div class="mp-row"><img src="${esc(h.icon_url || '')}" alt="" onerror="this.style.visibility='hidden'"><div class="t"><b>${esc(h.title)}</b><span>by ${esc(h.author)} · ${fmtN(h.downloads)} downloads</span><p>${esc(h.description)}</p></div><button class="btn solid sm" data-mpi="${esc(h.project_id)}" data-name="${esc(h.title)}" data-icon="${esc(h.icon_url || '')}">Add</button></div>`).join('') : '<div class="tx-empty">No modpacks found.</div>';
      } catch (err) { if (err.name !== 'AbortError') $('#mpList', d).innerHTML = '<div class="tx-empty">Could not reach Modrinth. <button class="btn ghost sm" data-mp="retry">Try again</button></div>'; }
    }
    load();
    d.addEventListener('input', e => { if (e.target.id === 'mpQ') { clearTimeout(t); t = setTimeout(load, 220); } });
    d.addEventListener('click', async e => {
      if (e.target === d || e.target.closest('[data-mp="close"]')) { d.remove(); sound('close'); return; }
      if (e.target.closest('[data-mp="retry"]')) return load();
      const b = e.target.closest('[data-mpi]'); if (!b) return;
      b.disabled = true; b.textContent = 'Adding…';
      const r = await BE('POST', '/modpacks', { projectId: b.dataset.mpi, name: b.dataset.name });
      if (r.status !== 200) { b.disabled = false; b.textContent = 'Add'; sound('error'); say(r.data.error || 'Could not add the modpack'); return; }
      if (b.dataset.icon && r.data.created) { try { await window.dexter.profileIconSet(r.data.created, await imgToPng(b.dataset.icon)); } catch { /* the pack keeps its symbol */ } PROFILE_IMG.delete(r.data.created); }
      sound('success'); b.textContent = 'Added'; say('Modpack added to your Library');
      await loadInstances(); drawInstances(); drawLibrary();
      setTimeout(() => { d.remove(); parent?.remove(); np = null; }, 600);
    });
  }
})();

/* ---------------- 6) launcher settings Dexter did not have yet (colours/theme editor excluded on purpose) ---------------- */
(function () {
  const sound = n => { try { typeof sfx === 'function' && sfx(n); } catch { /* optional */ } };
  const say = m => { try { toast(m); } catch { /* optional */ } };
  window.UpdateAPI = window.UpdateAPI || { check: null, repair: null };   // dev hooks: see API-CONTRACT.md
  const grp = document.querySelector('.sec[data-sec="launcher"] .set-group'); if (!grp) return;
  const row = (id, ic, t, note, btns) => `<div class="set" id="${id}"><span class="si"><i data-i="${ic}"></i></span><b>${t}<small data-note>${note}</small></b><div class="set-btns">${btns}</div></div>`;
  const wrap = document.createElement('div'); wrap.id = 'vUpdates';
  wrap.innerHTML = row('rowUpd', 'download', 'Dexter Client', 'Installed: …', '<button class="btn ghost sm" data-up="check">Check for updates</button>')
    + row('rowRepair', 'refresh', 'Repair', 'Put the Dexter mod back in every profile.', '<button class="btn ghost sm" data-up="repair">Repair</button>');
  grp.insertBefore(wrap, grp.firstChild); icons(wrap);
  window.dexter?.appVersion?.().then(v => { wrap.querySelector('#rowUpd [data-note]').textContent = 'Installed: v' + v; }).catch(() => {});
  wrap.addEventListener('click', async e => {
    const b = e.target.closest('[data-up]'); if (!b) return; const k = b.dataset.up, note = b.closest('.set').querySelector('[data-note]');
    const fn = window.UpdateAPI[k];
    if (typeof fn !== 'function') { sound('error'); say(k === 'check' ? 'Update checks are not connected yet (preview)' : 'Repair is not connected yet (preview)'); return; }
    b.disabled = true; try { const r = await fn(); note.textContent = r?.message || 'Done'; sound('success'); } catch { note.textContent = 'Something went wrong'; sound('error'); } b.disabled = false;
  });
})();
