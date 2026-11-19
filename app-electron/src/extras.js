/* extras.js - the whole Modrinth library (every mod, modpack, shader, resource pack and data pack, paged + sorted + detail view),
   the News with articles, and the richer profile cards. Loaded after app.js: same-named functions replace
   the earlier simple ones. */

/* ======================= Modrinth: the whole library ======================= */
let mpage = { n: 1, total: 0, per: 40 }, anyVersion = false;
const SORT_FALLBACK = 'downloads';
// numbered pages: 1 ... 4 5 [6] 7 8 ... 120
function pagerHtml(n, last) {
  if (last <= 1) return '';
  const set = new Set([1, last]); for (let k = n - 2; k <= n + 2; k++) if (k > 1 && k < last) set.add(k);
  const nums = [...set].sort((a, b) => a - b); let out = '', prev = 0;
  for (const k of nums) { if (k - prev > 1) out += '<span class="pg-gap">…</span>'; out += `<button class="pg${k === n ? ' on' : ''}" data-page="${k}">${k}</button>`; prev = k; }
  return `<button class="pg nav" data-page="${n - 1}" ${n <= 1 ? 'disabled' : ''} aria-label="Previous page"><i data-i="left"></i></button>${out}<button class="pg nav" data-page="${n + 1}" ${n >= last ? 'disabled' : ''} aria-label="Next page"><i data-i="right"></i></button>`;
}
async function loadMods(page = 1) {
  if (typeof page !== 'number') page = 1;
  $('#instCount').textContent = countInstalled();
  $('#modCats').style.display = view === 'browse' ? '' : 'none';
  if (view === 'installed') {
    $('#modMore').innerHTML = '';
    const list = [...installed().values()].filter(m => m.type === type);
    return list.length ? render(list) : empty('mods', INSTANCES[inst] ? `Nothing installed in ${esc(INSTANCES[inst].name)} yet` : 'Create a profile first');
  }
  ctl?.abort(); ctl = new AbortController(); mpage.n = page;
  $('#modGrid').innerHTML = '<div class="skel"></div>'.repeat(9); $('#modMore').innerHTML = '';
  const i = INSTANCES[inst], t = TYPES[type], f = [[t.facet]];
  if (i && !anyVersion) { f.unshift([`versions:${i.ver}`]); if (type === 'mod' || type === 'modpack') f.push([`categories:${i.loader}`]); }
  if (cat) f.push([`categories:${cat}`]);
  try {
    const sort = $('#modSort').value || SORT_FALLBACK;
    const r = await fetch(`https://api.modrinth.com/v2/search?limit=${mpage.per}&offset=${(page - 1) * mpage.per}&index=${sort}&query=${encodeURIComponent(query)}&facets=${encodeURIComponent(JSON.stringify(f))}`, { signal: ctl.signal });
    const { hits, total_hits } = await r.json();
    const list = hits.map(h => ({ key: h.project_id, id: h.project_id, slug: h.slug, type, title: h.title, author: h.author, desc: h.description, icon: h.icon_url,
      downloads: h.downloads, follows: h.follows, banner: h.featured_gallery || h.gallery?.[0], color: h.color, cats: h.display_categories }));
    mpage.total = total_hits;
    hits.length ? render(list) : empty('search', query ? `Nothing found for ${esc(query)}` : 'Nothing here for this version yet', anyVersion ? '' : '<button class="btn ghost" id="anyV2">Search every version</button>');
    const last = Math.min(Math.ceil(total_hits / mpage.per), 250);   // Modrinth stops paging past 10,000 results
    $('#modMore').innerHTML = `<div class="pager">${pagerHtml(page, last)}</div><div class="muted pager-note">${total_hits.toLocaleString()} results · page ${page} of ${last.toLocaleString()}</div>`;
    icons($('#modMore'));
  } catch (err) {
    if (err.name !== 'AbortError') empty('danger', 'Could not reach Modrinth', '<button class="btn ghost" id="retry">Try again</button>');
  }
}
document.addEventListener('click', e => { const b = e.target.closest('.pg[data-page]'); if (!b || b.disabled) return; loadMods(+b.dataset.page); $('#mods .scroll').scrollTo({ top: 0, behavior: 'smooth' }); });
$('#modSort').onchange = () => loadMods();
$('#anyVer').onclick = e => { anyVersion = !anyVersion; e.currentTarget.classList.toggle('on', anyVersion); loadMods(); };
document.addEventListener('click', e => { if (e.target.closest('#anyV2')) $('#anyVer').click(); });

// project page: gallery, description, and every version with its own Install
const plain = md => String(md || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '').replace(/^#+\s*/gm, '').replace(/[*_`>]/g, '').replace(/\n{3,}/g, '\n\n').trim();
let detVersions = [];
async function openDetail(key) {
  const m = shown.get(key); if (!m) return;
  const box = $('#mdetBox'); $('#mdet').hidden = false; box.innerHTML = `<div class="skel" style="height:90px"></div><div class="skel" style="height:150px"></div><div class="skel" style="height:240px"></div>`;
  try {
    const i = INSTANCES[inst], q = i && !anyVersion ? `?game_versions=${encodeURIComponent(JSON.stringify([i.ver]))}${type === 'mod' || type === 'modpack' ? `&loaders=${encodeURIComponent(JSON.stringify([i.loader]))}` : ''}` : '';
    const [p, vs] = await Promise.all([fetch(`https://api.modrinth.com/v2/project/${m.id}`).then(r => r.json()), fetch(`https://api.modrinth.com/v2/project/${m.id}/version${q}`).then(r => r.json())]);
    detVersions = vs.slice(0, 30);
    box.innerHTML = `<div class="md-head"><img src="${esc(p.icon_url || '')}" alt="" onerror="this.style.visibility='hidden'"><div><h2>${esc(p.title)}</h2><span class="muted">${fmt(p.downloads)} downloads · ${fmt(p.followers)} followers · ${esc(p.license?.id || '')}</span></div><button class="ib" id="mdClose" style="margin-left:auto"><span class="wi-x"></span></button></div>
      <p>${esc(p.description)}</p>
      <div class="chips" style="margin:0">${(p.categories || []).map(c => `<span class="pill">${esc(c)}</span>`).join('')}</div>
      ${p.gallery?.length ? `<div class="md-gal">${p.gallery.slice(0, 8).map(g => `<img src="${esc(g.url)}" alt="">`).join('')}</div>` : ''}
      <div class="md-body">${esc(plain(p.body).slice(0, 2400))}</div>
      <h3>Versions ${anyVersion ? '' : `<span class="muted" style="font-weight:400">for ${esc(INSTANCES[inst]?.ver || 'all')}</span>`}</h3>
      ${detVersions.length ? detVersions.map((v, k) => `<div class="md-ver"><div><b>${esc(v.version_number)}</b><br><small>${esc((v.game_versions || []).slice(-3).join(', '))} · ${esc((v.loaders || []).join(', '))} · ${esc(v.version_type)}</small></div><button class="install" data-vi="${k}"><i data-i="download"></i>Install</button></div>`).join('') : '<p class="muted">No version for this profile’s Minecraft version. Turn on "Any version" to see all.</p>'}`;
    box.dataset.key = key; icons(box);
  } catch { box.innerHTML = '<p class="muted">Could not load this project.</p><button class="btn ghost" id="mdClose">Close</button>'; }
}
$('#mdet').addEventListener('click', e => {
  if (e.target.closest('#mdClose') || e.target === $('#mdet')) return ($('#mdet').hidden = true);
  const b = e.target.closest('[data-vi]'); if (b) install(b, shown.get($('#mdetBox').dataset.key), detVersions[+b.dataset.vi]);
});
$('#modGrid').addEventListener('click', e => { if (e.target.closest('button, a')) return; const c = e.target.closest('.mod'); if (c) { const k = $('.install', c)?.dataset.add || $('.install', c)?.dataset.rm; const m = [...shown.values()].find(x => x.title === $('.tt b', c)?.textContent); if (m) openDetail(m.key); } });
addEventListener('keydown', e => { if (e.key === 'Escape') { $('#mdet').hidden = true; $('#article').hidden = true; } });

/* ======================= profile cards ======================= */
const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; };
async function drawLibrary() {
  const r = await BE('GET', '/instances'); LIB = r.data.instances || [];
  const top = [...LIB].sort((a, b) => b.playMillis - a.playMillis)[0], maxPlay = Math.max(1, ...LIB.map(p => p.playMillis));
  $('#libHero').innerHTML = top ? `<div class="prof-hero" data-pid="${esc(top.id)}"><div class="prof"><div class="ico" style="margin:0;background:linear-gradient(135deg,hsl(${hue(top.version)} 60% 40%),hsl(${(hue(top.version) + 50) % 360} 60% 22%))">${esc(top.name.slice(0, 2).toUpperCase())}</div></div><div><span class="sample">Continue playing</span><h2>${esc(top.name)}</h2><span class="muted">${esc(top.version)} · ${esc(top.loader)} · ${top.mods} mods</span></div><span class="sp"></span><button class="btn purple" data-lib="play" style="height:50px;padding:0 30px"><i data-i="play"></i>Play</button></div>` : '';
  $('#libGrid').innerHTML = LIB.length ? LIB.map(p => { const h1 = hue(p.version), h2 = (h1 + 55) % 360;
    return `<div class="lib-card prof" data-pid="${esc(p.id)}" style="--h1:hsl(${h1} 55% 30%);--h2:hsl(${h2} 60% 14%);padding:0">
      <div class="ban"><div class="ico">${esc(p.name.slice(0, 2).toUpperCase())}</div></div>
      <div class="st">${p.running ? '<span class="pill live">Running</span>' : `<span class="pill">${esc(p.loader)}</span>`}</div>
      <div class="pb"><h3><span class="pn">${esc(p.name)}</span></h3>
        <div class="meta"><span class="pill">Minecraft ${esc(p.version)}</span>${p.ramMaxMb ? `<span class="pill">${Math.round(p.ramMaxMb / 1024)} GB</span>` : '<span class="pill">Auto memory</span>'}${p.jvmArgs ? '<span class="pill purple">Custom JVM</span>' : ''}</div>
        <div class="tiles"><div><b>${p.mods}</b><small>mods</small></div><div><b>${fmtPlay(p.playMillis)}</b><small>played</small></div><div><b>${p.sessions}</b><small>sessions</small></div></div>
        <div class="bar" title="Playtime compared with your other profiles"><i style="width:${Math.max(4, p.playMillis / maxPlay * 100)}%"></i></div>
        <div class="acts"><button class="btn purple" data-lib="play"><i data-i="play"></i>Play</button><button class="btn ghost" data-lib="mods"><i data-i="mods"></i>Mods</button><span style="flex:1"></span>
          <button class="ib" data-lib="cfg" title="Settings"><i data-i="settings"></i></button><button class="ib" data-lib="rename" title="Rename"><i data-i="edit"></i></button><button class="ib" data-lib="dup" title="Duplicate"><i data-i="copy"></i></button><button class="ib" data-lib="folder" title="Open folder"><i data-i="folder"></i></button><button class="ib" data-lib="del" title="Delete"><i data-i="trash"></i></button></div>
        <div class="lib-set" data-cfg="${esc(p.id)}" hidden><select name="ram" title="Memory for this profile"><option value="0">Memory: automatic</option>${[2, 3, 4, 6, 8, 12, 16].map(g => `<option value="${g * 1024}"${p.ramMaxMb === g * 1024 ? ' selected' : ''}>${g} GB</option>`).join('')}</select><input class="args" name="args" placeholder="Extra JVM arguments" value="${esc(p.jvmArgs)}" spellcheck="false"><button class="btn purple" data-lib="cfgsave" style="height:36px">Save</button></div>
      </div></div>`; }).join('') : '<div class="lib-empty">No profiles yet. Create one above: a profile is a Minecraft version with its own mods, packs and settings.</div>';
  icons($('#libGrid')); icons($('#libHero'));
}
PAGE_LOAD.library = drawLibrary;
$('#libHero').addEventListener('click', e => { const b = e.target.closest('[data-lib=play]'); if (!b) return; const id = b.closest('[data-pid]').dataset.pid; loadInstances().then(() => { inst = Math.max(0, INSTANCES.findIndex(x => x.id === id)); drawInstances(); launch(); }); });

/* ======================= News ======================= */
const AR = n => bannerFor('news:' + n, true);   // the launcher picks a different banner for each post
const NEWS = [
  { cat: 'Update', title: 'Dexter Client 1.0 is here', sum: 'A new launcher, a new look, and every Dexter Client feature behind it.', art: AR('lava-race.jpg'), date: '17 Nov', read: 3, body: ['Today we are opening the doors to Dexter Client 1.0. The launcher you are looking at is brand new: one app for profiles, mods, cosmetics, clips and servers.', 'Under the hood it runs the same game-launch engine that powers Dexter Client, so everything you relied on keeps working: Fabric profiles, Modrinth installs, memory guard, party launches.', 'This is the first release. Expect rough edges and tell us what to fix first.'] },
  { cat: 'Event', title: 'Lava Rise season opens Saturday', sum: 'Climb faster than everyone or burn.', art: AR('battle-royale.jpg'), date: '15 Nov', read: 2, body: ['The lava rises every 20 seconds. Climb faster than everyone, or burn.', 'Register on the Events tab. Teams of up to four, eight rounds, winners earn the Lava Rise cape.'] },
  { cat: 'Cosmetics', title: 'New cloaks in the Locker', sum: 'Four animated cloaks, free for every player.', art: AR('squid-game.jpg'), date: '12 Nov', read: 2, body: ['The Locker has four new animated cloaks: pick one in Cosmetics and it shows on your player and in game.', 'Emotes are there too: Wave, Crouch, Glide and more.'] },
  { cat: 'Community', title: 'Vote on what comes next', sum: 'The poll is open for a week.', art: AR('smp.jpg'), date: '10 Nov', read: 1, body: ['Tell us which feature we should build next: more cloak designs, a new emote, or a map room for schematics. The poll closes next Sunday.'] },
  { cat: 'Performance', title: 'Lower heat, longer battery', sum: 'Memory guard and the Low graphics level keep laptops cool.', art: AR('manhunt.jpg'), date: '6 Nov', read: 4, body: ['Long sessions heat up thin laptops. Two settings help: the Low graphics level, and the memory guard that closes the game before the Mac starts swapping.', 'Both live under Settings > Performance.'] },
  { cat: 'Tips', title: 'One profile per server', sum: 'Keep mods, packs and memory separate.', art: AR('squid-game.jpg'), date: '2 Nov', read: 3, body: ['Create a profile for each server or modpack. Each keeps its own mods, resource packs, shaders, memory and JVM arguments, so one never breaks the other.'] },
  { cat: 'Update', title: 'Clips and screenshots live in one place', sum: 'Every profile’s recordings in the Clips tab.', art: AR('manhunt.jpg'), date: '30 Oct', read: 2, body: ['The Clips tab now lists clips and screenshots from every profile, newest first, with a built-in player.'] },
  { cat: 'Event', title: 'Quote of the week', sum: '', quote: '“The launcher feels like the game, not a website.”', date: '28 Oct', read: 0, body: [] },
];
let newsCat = 'All';
function drawNews() {
  const cats = ['All', ...new Set(NEWS.map(n => n.cat))];
  $('#newsCats').innerHTML = cats.map(c => `<button class="chip ${c === newsCat ? 'on' : ''}" data-nc="${c}">${c}</button>`).join('');
  const list = NEWS.filter(n => newsCat === 'All' || n.cat === newsCat), f = list[0], rest = list.slice(1);
  const th = n => n.art ? `background-image:url(${n.art});${n.contain ? 'background-size:contain;background-repeat:no-repeat' : ''}` : '';
  $('#newsBody').innerHTML = (f ? `<div class="news-top"><div class="nw-feature" data-n="${NEWS.indexOf(f)}" style="${th(f)}"><div><span class="pill purple">${esc(f.cat)}</span><h2>${esc(f.title)}</h2><p>${esc(f.sum)}</p><small class="muted">${esc(f.date)} · ${f.read} min read · <span class="sample">sample post</span></small></div></div>
      <div class="nw-list">${rest.slice(0, 4).map(n => `<div class="nw-row" data-n="${NEWS.indexOf(n)}"><div class="th" style="${th(n)}"></div><div><small class="muted">${esc(n.cat)} · ${esc(n.date)}</small><br><b>${esc(n.title)}</b></div></div>`).join('')}</div></div>` : '')
    + `<div class="nw-masonry">${rest.slice(4).concat(rest.length > 4 ? [] : []).map(n => n.quote ? `<div class="nw-card q">${esc(n.quote)}</div>` : `<div class="nw-card" data-n="${NEWS.indexOf(n)}"><div class="th" style="${th(n)};height:${130 + (n.title.length % 4) * 24}px"><span class="pill">${esc(n.cat)}</span></div><div class="tx"><b style="font-size:18px">${esc(n.title)}</b><p>${esc(n.sum)}</p><small>${esc(n.date)} · ${n.read} min read</small></div></div>`).join('')}</div>`;
}
PAGE_LOAD.news = drawNews;
$('#newsCats').addEventListener('click', e => { const b = e.target.closest('[data-nc]'); if (b) { newsCat = b.dataset.nc; drawNews(); } });
$('#newsBody').addEventListener('click', e => {
  const c = e.target.closest('[data-n]'); if (!c) return; const n = NEWS[+c.dataset.n];
  $('#artBox').innerHTML = `<div class="hero-img" style="${n.art ? `background-image:url(${n.art});${n.contain ? 'background-size:contain;background-repeat:no-repeat' : ''}` : ''}"></div><div class="art-tx"><span class="pill purple" style="align-self:flex-start">${esc(n.cat)}</span><h1>${esc(n.title)}</h1><small class="muted">${esc(n.date)} · ${n.read} min read · <span class="sample">sample post</span></small>${n.body.map(p => `<p>${esc(p)}</p>`).join('')}<button class="btn ghost" id="artClose" style="align-self:flex-start">Close</button></div>`;
  $('#article').hidden = false;
});
$('#article').addEventListener('click', e => { if (e.target.closest('#artClose') || e.target === $('#article')) $('#article').hidden = true; });
