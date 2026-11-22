/* homebg.js - V2 Home background. The events are not live all the time, so Home shows pictures you like:
   - Favourite backgrounds: the pictures you hearted (our banners and your own, GIFs too) change slowly while you are on Home
   - One picture: a single banner or one of your own
   - Events: the Dexter events hero
   Your own pictures live on this computer (IndexedDB, up to 5 MB each). Hover the Home picture and press "Background",
   or use Settings > Launcher > Home background. */
(function () {
  const hero = document.getElementById('hero'); hero.classList.add('banners');   // no event text until we know the mode
  const sound = n => { try { typeof sfx === 'function' && sfx(n); } catch { /* optional */ } };
  const ui = (k, d) => (SET?.ui && SET.ui[k]) || d;
  const MAX = 5 * 1024 * 1024, MAX_PICS = 40;

  /* ---------- storage for your own pictures ---------- */
  const idb = () => new Promise((res, rej) => { const r = indexedDB.open('dexter-v2', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const kvGet = async k => { try { const db = await idb(); return await new Promise(res => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); } catch { return null; } };
  const kvSet = async (k, v) => { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); v == null ? t.objectStore('kv').delete(k) : t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); };
  const sniff = b => { const s = String.fromCharCode(...b.slice(0, 12)); if (s.startsWith('GIF87a') || s.startsWith('GIF89a')) return 'gif'; if (b[0] === 0x89 && s.slice(1, 4) === 'PNG') return 'png'; if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'; if (s.startsWith('RIFF') && s.slice(8, 12) === 'WEBP') return 'webp'; return ''; };
  let OWN = new Map(), ownReady;                 // key 'u:<id>' -> { name, type, blob, url }
  async function loadOwn() {
    const list = (await kvGet('homePics')) || [];
    const legacy = await kvGet('homeBg');                                      // the single picture of the first version becomes one of yours
    if (legacy && legacy.blob && !list.some(p => p.id === 'legacy')) list.push({ id: 'legacy', name: legacy.name || 'My picture', type: legacy.type, blob: legacy.blob });
    OWN = new Map(list.map(p => ['u:' + p.id, { name: p.name, type: p.type, blob: p.blob, url: URL.createObjectURL(p.blob) }]));
    if (legacy && legacy.blob) { await kvSet('homePics', list); await kvSet('homeBg', null); if (ui('home.mode', '') === 'custom') { await uiSet('home.one', 'u:legacy'); await uiSet('home.mode', 'one'); } }
  }
  const saveOwn = () => kvSet('homePics', [...OWN].map(([k, v]) => ({ id: k.slice(2), name: v.name, type: v.type, blob: v.blob })));

  /* ---------- what to show ---------- */
  window.homeMode = () => { const m = ui('home.mode', 'rotate'); return m === 'one' || m === 'custom' ? 'one' : 'rotate'; };   // (the events mode is gone)
  const favs = () => ui('home.favs', '').split(',').filter(Boolean);
  const bannerId = k => /^b\d{3}$/.test(k) ? +k.slice(1) : 0;
  const srcOf = k => k.startsWith('u:') ? OWN.get(k)?.url || '' : (bannerId(k) && BANNER_POOL.includes(bannerId(k)) ? bannerUrl(bannerId(k), true) : '');
  const rotation = () => { const f = favs().map(srcOf).filter(Boolean); return f.length ? f : BANNER_POOL.map(i => bannerUrl(i, true)); };

  /* ---------- the hero (same two crossfading layers the events use) ---------- */
  const _events = showHero; let bi = 0, shown = '';
  function setPicture(src) {
    if (!src || src === shown) return; shown = src;
    const im = new Image();
    im.onload = () => {
      window.setAmbient?.(src);
      back.style.setProperty('--img', `url('${src}')`); back.style.zIndex = 2; back.style.opacity = 1; front.style.zIndex = 1;
      const old = front; [front, back] = [back, front];
      setTimeout(() => { old.style.transition = 'none'; old.style.opacity = 0; void old.offsetWidth; old.style.transition = ''; }, 1000);
      setTimeout(() => { front.style.opacity = 1; }, 1300);      // an earlier fade (the events' own) must never leave the picture hidden
    };
    im.src = src;
  }
  window.showHero = function (i) {
    const mode = window.homeMode(); clearTimeout(htimer);
    if (mode === 'events') { hero.classList.remove('banners'); shown = ''; const r = _events(typeof i === 'number' ? i % heroEvents.length : 0); window.setAmbient?.('../assets/' + heroEvents[hi]?.img); return r; }
    hero.classList.add('banners');
    if (mode === 'one') { const k = ui('home.one', ''); return setPicture(srcOf(k) || rotation()[0]); }
    const list = rotation(); bi = typeof i === 'number' ? i : bi + 1; setPicture(list[((bi % list.length) + list.length) % list.length]);
    if (list.length < 2) return;
    // a slow rhythm (the picture also lights every other tab), only while the window is in use
    const tick = () => { if (document.hasFocus() && !document.hidden && !(window.PERF && !PERF.awake())) window.showHero(bi + 1); else htimer = setTimeout(tick, 4000); };
    htimer = setTimeout(tick, 12000);
  };
  const MODE_NAME = { rotate: 'Favourite backgrounds', one: 'One picture' };
  function applyMode() {
    window.bgLayer?.show(false);                  // (the first version's single-picture layer is not used any more)
    hero.classList.toggle('banners', window.homeMode() !== 'events');
    shown = ''; window.showHero(0);
    const n = document.getElementById('hbNote'); if (n) n.textContent = MODE_NAME[window.homeMode()];
  }
  window.applyHomeMode = applyMode;
  ownReady = loadOwn().catch(() => {});
  const wait = setInterval(() => { if (typeof SET !== 'undefined' && SET && SET.ui) { clearInterval(wait); ownReady.then(applyMode); } }, 120);

  /* ---------- the picker ---------- */
  function openPicker() {
    if (document.getElementById('hbSheet')) return; sound('open');
    const d = document.createElement('div'); d.className = 'v2-sheet'; d.id = 'hbSheet';
    d.innerHTML = '<div class="v2-card hbp"><header><div><small>Home</small><h3>Background</h3></div><button class="ib" data-hb2="close" aria-label="Close"><span class="wi-x"></span></button></header><div class="seg hbp-seg" id="hbpSeg"></div><div class="hbp-body" id="hbpBody"></div></div>';
    document.body.appendChild(d);
    const body = d.querySelector('#hbpBody'), seg = d.querySelector('#hbpSeg');
    const th = (key, src, mode) => {
      const fav = favs().includes(key), cur = ui('home.one', '') === key;
      return `<div class="hb-th${mode === 'one' && cur ? ' sel' : ''}"><button type="button" class="hb-pic" ${mode === 'one' ? `data-hbo="${key}"` : `data-hbf="${key}"`} style="background-image:url('${src}')" aria-label="${key}"></button>${mode === 'rotate' ? `<button type="button" class="hb-heart${fav ? ' on' : ''}" data-hbf="${key}" title="${fav ? 'Remove from favourites' : 'Add to favourites'}" aria-label="Favourite"><i data-i="heart"></i></button>` : ''}${key.startsWith('u:') ? `<button type="button" class="hb-del" data-hbd="${key}" title="Delete this picture" aria-label="Delete"><span class="wi-x"></span></button>` : ''}</div>`;
    };
    const draw = () => {
      const mode = window.homeMode();
      seg.innerHTML = [['rotate', 'Favourite backgrounds'], ['one', 'One picture']].map(([k, n]) => `<button data-hbm="${k}" class="${k === mode ? 'on' : ''}">${n}</button>`).join('');
      const own = [...OWN].map(([k, v]) => th(k, v.url, mode)).join('');
      const ids = BANNER_POOL;
      const info = mode === 'rotate' ? `<p class="muted">${favs().length ? (favs().length === 1 ? '1 favourite stays on Home. Add more and they change slowly.' : `${favs().length} favourites rotate slowly on Home.`) : 'Tap the heart on the pictures you like. They change slowly while you are on Home. Until you pick some, all banners are used.'}</p>` : '<p class="muted">Pick a Home picture.</p>';
      body.innerHTML = `${info}
        <div class="hbp-sec"><b>Your pictures</b><button class="btn ghost sm" data-hb2="add"><i data-i="image"></i>Add pictures</button></div>
        ${own ? `<div class="hbp-grid">${own}</div>` : '<p class="muted hbp-none">Add pictures or GIFs, up to 5 MB each.</p>'}
        <div class="hbp-sec"><b>Banners</b></div>
        <div class="hbp-grid">${ids.map(i => th('b' + String(i).padStart(3, '0'), bannerUrl(i), mode)).join('')}</div>`;
      icons(d);
    };
    draw();
    const setFavs = async list => { await uiSet('home.favs', list.join(',')); applyMode(); draw(); };
    d.addEventListener('click', async e => {
      if (e.target === d || e.target.closest('[data-hb2="close"]')) { d.remove(); sound('close'); return; }
      const m = e.target.closest('[data-hbm]'); if (m) { await uiSet('home.mode', m.dataset.hbm); sound('select'); applyMode(); return draw(); }
      const f = e.target.closest('[data-hbf]'); if (f) { const k = f.dataset.hbf, cur = favs(); sound('select'); return setFavs(cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k]); }
      const o = e.target.closest('[data-hbo]'); if (o) { await uiSet('home.one', o.dataset.hbo); sound('select'); applyMode(); return draw(); }
      const del = e.target.closest('[data-hbd]'); if (del) {
        const k = del.dataset.hbd, v = OWN.get(k); if (v) URL.revokeObjectURL(v.url); OWN.delete(k); await saveOwn(); sound('close');
        if (ui('home.one', '') === k) await uiSet('home.one', ''); return setFavs(favs().filter(x => x !== k));
      }
      if (e.target.closest('[data-hb2="add"]')) {
        const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = 'image/png,image/jpeg,image/webp,image/gif';
        inp.onchange = () => addFiles(inp.files);
        inp.click();
      }
    });
    window.__hbAdd = files => addFiles(files);
    async function addFiles(files) {
          const added = []; let bad = '';
          for (const file of files) {
            if (OWN.size + added.length >= MAX_PICS) { bad = `Up to ${MAX_PICS} pictures.`; break; }
            if (file.size > MAX) { bad = `${file.name.slice(0, 24)} is over 5 MB.`; continue; }
            const type = sniff(new Uint8Array(await file.slice(0, 12).arrayBuffer())); if (!type) { bad = `${file.name.slice(0, 24)} is not a picture.`; continue; }
            const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5), key = 'u:' + id;
            OWN.set(key, { name: file.name.slice(0, 40), type, blob: file, url: URL.createObjectURL(file) }); added.push(key);
          }
          if (added.length) { await saveOwn(); sound('success'); await setFavs([...favs(), ...added]); } else if (bad) { sound('error'); toast(bad); }
          else draw();
          if (added.length && bad) toast(bad);
    }
  }
  window.openHomeBgPicker = openPicker;
  // a hover button on the picture, like the one on the profile cards
  const edit = document.createElement('button'); edit.className = 'hero-edit'; edit.innerHTML = '<i data-i="image"></i>Background'; edit.title = 'Change the Home background'; hero.appendChild(edit); icons(edit);
  edit.addEventListener('click', openPicker);

  // Settings > Launcher: one row opens the picker
  const row = document.getElementById('bgRow');
  if (row) {
    row.querySelector('b').innerHTML = 'Home background<small id="hbNote">Favourite backgrounds</small>';
    const btns = row.querySelector('.set-btns'); btns.querySelectorAll('button').forEach(b => { b.hidden = true; });
    btns.insertAdjacentHTML('afterbegin', '<button class="btn ghost sm" id="hbOpen">Change</button>');
    document.getElementById('hbOpen').addEventListener('click', openPicker);
  }
})();
