// Dexter launcher UI. Sample data sits at the top; the main team swaps it for real API calls.
// Live data: Modrinth (mods, modpacks, resource packs, data packs, shaders), mcsrvstat.us (servers), mc-heads.net (skins).
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icons = (root = document) => $$('[data-i]', root).forEach(el => { if (!el.firstChild) el.innerHTML = ICONS[el.dataset.i] || ''; });
const head = (n, s = 64) => `https://mc-heads.net/avatar/${n}/${s}`;
const skinUrl = n => `https://mc-heads.net/skin/${n}`;
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n);
const img = f => `url(../assets/${f})`;
let ME = 'Nyxen';   // the active account's name; set by applyAccount()
// The Dexter backend (window.dexter.api -> main.js -> DexterBackend). In a plain browser preview there is no backend and these calls report that.
const BE = (m, p, b) => window.dexter?.api ? window.dexter.api(m, p, b) : Promise.resolve({ status: 0, data: { error: 'Open the Dexter launcher app to use this.' } });

/* ================= sample data ================= */
const EVENTS = [
  { id: 'lava', name: 'Lava Rise', state: 'reg', tag: 'Saturday 19:00', mode: 'Solo race', when: 'Sat 19:00', prize: '$500', players: '84 / 120', img: 'events/lava-race.jpg',
    desc: 'The lava rises every 20 seconds. Climb faster than everyone or burn.',
    rules: ['Join from the Dexter launcher with Shield on.', 'No blocks outside the arena walls.', 'Touch lava and you spectate.', 'Top 10 from each heat reach the final.'],
    rewards: [['1st', '$250'], ['2nd', '$150'], ['3rd', '$100'], ['Every finisher', 'Lava Rise cape']] },
  { id: 'br', name: 'Battle Royale', state: 'live', tag: 'Live now', mode: '100 players', when: 'Round 3 of 5', prize: '$1,000', players: '100 / 100', img: 'events/battle-royale.jpg',
    desc: '100 players, one shrinking border. Last one standing wins the round.',
    rules: ['Chests refill once per round.', 'Teaming in solo rounds is a ban.', 'The border closes every 3 minutes.', 'Points for kills and placement.'],
    rewards: [['Champion', '$500'], ['2nd', '$300'], ['3rd', '$200'], ['Top 25', 'Royale banner']] },
  { id: 'squid', name: 'Squid Game', state: 'reg', tag: 'Sunday 18:00', mode: '456 players', when: 'Sun 18:00', prize: '$1,500', players: '311 / 456', img: 'events/squid-game.jpg',
    desc: 'Six playground games in a row. One mistake and you are out.',
    rules: ['Games are revealed live.', 'Spectators cannot talk to players.', 'Disconnecting counts as elimination.', 'The final is one on one.'],
    rewards: [['Winner', '$1,500'], ['Final 10', 'Player 456 cape'], ['Everyone', 'Event badge']] },
  { id: 'smp', name: 'Dexter SMP', state: 'open', tag: 'Season 3 opens Friday', mode: 'Survival', when: 'Always on', prize: 'Monthly awards', players: '3,410', img: 'events/smp.jpg',
    desc: 'Our survival world between events. Build, trade and team up.',
    rules: ['One account per player.', 'Claims are protected, griefing is a ban.', 'Shops use the in-game economy.', 'Season 3 starts on a fresh map.'],
    rewards: [['Best build', 'Builder cape'], ['Richest player', 'Golden halo'], ['Most active', 'SMP banner']] },
  { id: 'manhunt', name: 'Manhunt', state: 'reg', tag: 'Dec 6, 20:00', mode: '1 vs 5', when: 'Dec 6', prize: '$300', players: '42 / 60', img: 'events/manhunt.jpg',
    desc: 'One runner tries to beat the game. Five hunters try to stop them.',
    rules: ['Runners are picked by seed.', 'Hunters get tracking compasses.', 'The runner wins on the dragon kill.', 'Runners have three lives.'],
    rewards: [['Best runner', '$200'], ['Best hunters', '$100'], ['Everyone', 'Compass badge']] },
];
const INSTANCES = [];   // the Dexter launcher's profiles ({ id, name, ver, loader }); filled by loadInstances()
let inst = 0;
const installed = () => { const i = INSTANCES[inst]; return i ? (i.items ??= new Map()) : new Map(); };
// what the Installed tab shows (title, icon...) is page-side metadata, kept per profile; the files themselves are real (backend)
const ITEMS_KEY = id => 'dexter.items.' + id;
const loadItems = id => { try { return new Map(JSON.parse(localStorage.getItem(ITEMS_KEY(id))) || []); } catch { return new Map(); } };
const saveItems = i => { try { localStorage.setItem(ITEMS_KEY(i.id), JSON.stringify([...(i.items || new Map())])); } catch { /* storage blocked */ } };
let VERSIONS = [];
async function loadInstances() {
  const r = await BE('GET', '/instances');
  if (r.status !== 200) return false;
  const keep = INSTANCES[inst]?.id;
  INSTANCES.splice(0, INSTANCES.length, ...r.data.instances.map(x => ({ id: x.id, name: x.name, ver: x.version, loader: x.loader, items: loadItems(x.id) })));
  inst = Math.max(0, INSTANCES.findIndex(x => x.id === keep));
  return true;
}
BE('GET', '/versions').then(r => { VERSIONS = r.data.versions || []; drawInstances(); const f = $('#libNew'); if (f) f.querySelector('select').outerHTML = verSelect(); });

const FRIENDS = [['Vexil', 'Battle Royale', '#4ade80'], ['Kairo_', 'Dexter SMP', '#4ade80'], ['lumen', '', '#4ade80'], ['Zetaa', '', '#facc15'], ['Orrin'], ['PaxMC'], ['mothh'], ['Ruvik']];
const SERVERS = [['MCPVP', 'mcpvp.club'], ['PvPHQ', 'pvphq.com'], ['Hypixel', 'mc.hypixel.net'], ['Minemen', 'minemen.club'],
  ['CubeCraft', 'play.cubecraft.net'], ['Wynncraft', 'play.wynncraft.com'], ['MCC Island', 'play.mccisland.net'], ['PvP Legacy', 'pvplegacy.net']];

// Modrinth content types the launcher can install, with each type's filters and loader.
const TYPES = {
  mod:          { facet: 'project_type:mod', loader: i => i.loader, btn: 'Install', cats: [['Optimization', 'optimization'], ['Utility', 'utility'], ['Library', 'library'], ['Social', 'social'], ['Decoration', 'decoration'], ['Adventure', 'adventure'], ['Equipment', 'equipment']] },
  modpack:      { facet: 'project_type:modpack', loader: i => i.loader, btn: 'Get pack', cats: [['Optimization', 'optimization'], ['Lightweight', 'lightweight'], ['Multiplayer', 'multiplayer'], ['Adventure', 'adventure'], ['Combat', 'combat'], ['Challenging', 'challenging'], ['Quests', 'quests']] },
  resourcepack: { facet: 'project_type:resourcepack', loader: () => 'minecraft', btn: 'Install', cats: [['16x', '16x'], ['32x', '32x'], ['Vanilla-like', 'vanilla-like'], ['Realistic', 'realistic'], ['Simplistic', 'simplistic'], ['Combat', 'combat'], ['GUI', 'gui']] },
  datapack:     { facet: 'project_type:datapack', loader: () => 'datapack', btn: 'Add to world', cats: [['Adventure', 'adventure'], ['Worldgen', 'worldgen'], ['Utility', 'utility'], ['Game mechanics', 'game-mechanics'], ['Magic', 'magic'], ['Mobs', 'mobs']] },
  shader:       { facet: 'project_type:shader', loader: () => 'iris', btn: 'Install', cats: [['Vanilla-like', 'vanilla-like'], ['Semi-realistic', 'semi-realistic'], ['Realistic', 'realistic'], ['Fantasy', 'fantasy'], ['Cartoon', 'cartoon']] },
};
// Content the Dexter Shield allows during events (shown with a verified mark).
const VERIFIED = new Set(['sodium', 'iris', 'lithium', 'fabric-api', 'entityculling', 'ferrite-core', 'modmenu', 'zoomify', 'cloth-config', 'immediatelyfast', 'dynamic-fps', 'appleskin', 'fresh-animations', 'complementary-reimagined', 'fabulously-optimized']);

/* ================= shell ================= */
icons();
$$('[data-win]').forEach(b => b.onclick = () => window.dexter?.[b.dataset.win]?.());
/* ================= accounts: saved in the launcher's data folder, so sign-in only shows until the first account is added ================= */
// The accounts are the Dexter launcher's own (account.json in the Dexter data folder). { list: [{ uuid, name, type: 'microsoft' | 'offline' }], active: index }.
// Tokens never reach the page: the backend only reports who is signed in.
const AC = { list: [], active: -1 };
let ACMETA = { microsoftConfigured: false, offlineAllowed: false, offlineRule: '' };
const saveAc = () => {};
async function loadAccounts() {
  const { status, data } = await BE('GET', '/accounts');
  if (status !== 200) return;
  AC.list = data.accounts.map(a => ({ uuid: a.uuid, name: a.name, type: a.type }));
  AC.active = data.accounts.findIndex(a => a.active);
  ACMETA = data;
}
const NAME_OK = /^[A-Za-z0-9_]{3,16}$/, NAME_ERR = 'Use 3 to 16 letters, numbers or _';
const headUrl = n => `https://mc-heads.net/avatar/${n}/64`;
function drawAccounts() {
  $('#acctList').innerHTML = AC.list.map((a, i) => `<div class="am-row ${i === AC.active ? 'on' : ''}" data-ac="${i}"><img src="${headUrl(a.name)}" alt=""><div class="t"><b>${a.name}</b><small>${a.type === 'microsoft' ? 'Microsoft' : 'Offline'}</small></div><i data-i="check" class="ck"></i><button class="rm" data-rm="${i}" title="Remove"><span class="wi-x"></span></button></div>`).join('');
  icons($('#acctList'));
}
let skinSeq = 0;
function applyAccount() {
  const a = AC.list[AC.active] || { name: 'Player', type: 'microsoft' };      // the fallback is only for browser previews
  ME = a.name;
  const wearing = a.skin && SKINS.find(k => k.id === a.skin);
  $$('[data-me-head]').forEach(i => i.src = headUrl(a.name));
  if (wearing) skinOf(wearing.id).then(im => { if (im) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, 8, 8, 8, 8, 0, 0, 64, 64); g.drawImage(im, 40, 8, 8, 8, 0, 0, 64, 64); $$('[data-me-head]').forEach(i => i.src = c.toDataURL()); } });
  $$('[data-me-name]').forEach(e => e.textContent = a.name);
  $$('[data-me-type]').forEach(e => e.textContent = 'Dexter');
  $$('[data-me-body]').forEach(i => i.src = `https://mc-heads.net/body/${a.name}/right`);
  // only the newest request may set the skin: a slow download of the account's own skin must not overwrite one just picked
  const t = ++skinSeq, im = new Image(); im.crossOrigin = 'anonymous';
  im.onload = () => { if (t === skinSeq && sv) sv.loadSkin(im); };
  im.src = wearing ? wearing.data : skinUrl(a.name);
  drawAccounts();
}
// Offline (username-only) account: true when it was created, otherwise the reason is shown in `errEl`.
async function addOffline(name, errEl) {
  const { status, data } = await BE('POST', '/accounts/offline', { name });
  if (status !== 200) { errEl.textContent = data.error || 'Could not add the account'; return false; }
  await loadAccounts(); applyAccount(); return true;
}
// Microsoft sign-in (device code): the backend returns a code to type at microsoft.com/link, then we poll until it finishes.
let msPoll;
async function addMicrosoft(errEl) {
  errEl.textContent = '';
  const { status, data } = await BE('POST', '/accounts/microsoft', {});
  if (status !== 200) { errEl.textContent = data.error || 'Microsoft sign-in failed'; return false; }
  $('#msCodeV').textContent = data.userCode; $('#msCode').hidden = false;
  window.dexter?.open?.(data.verificationUri);
  clearInterval(msPoll);
  return new Promise(res => { msPoll = setInterval(async () => {
    const r = await BE('GET', '/accounts/microsoft');
    if (r.data.state === 'pending') return;
    clearInterval(msPoll); $('#msCode').hidden = true;
    if (r.data.state === 'done') { await loadAccounts(); applyAccount(); res(true); } else { errEl.textContent = r.data.error || 'Microsoft sign-in failed'; res(false); }
  }, 2000); });
}
async function dropAccount(i) {
  const a = AC.list[i]; if (!a) return;
  await BE('DELETE', '/accounts/' + encodeURIComponent(a.uuid));
  await loadAccounts();
  AC.list.length ? applyAccount() : leave();
}

// The sign-in screen is a small card-sized window; the main process grows it into the launcher.
const enter = () => { window.dexter?.mode('app'); $('#login').classList.add('gone'); requestAnimationFrame(moveInd); };
const leave = () => {
  closeMenus(); window.dexter?.mode('login');
  $('#offForm').hidden = true; $('#offName').value = ''; $('#offErr').textContent = ''; $('#login').classList.remove('off-on', 'gone');
};
$('#loginMs').onclick = async () => { if (await addMicrosoft($('#msErr'))) enter(); };
$('#loginOff').onclick = () => { $('#offForm').hidden = false; $('#login').classList.add('off-on'); $('#offName').focus(); if (!ACMETA.offlineAllowed) $('#offErr').textContent = ACMETA.offlineRule; };
$('#offForm').onsubmit = e => {
  e.preventDefault(); const n = $('#offName').value.trim();
  if (!NAME_OK.test(n)) { $('#offErr').textContent = NAME_ERR; return; }
  addOffline(n, $('#offErr')).then(ok => { if (ok) enter(); });
};
$('#offName').oninput = () => { $('#offErr').textContent = ''; };
$('#msAdd').onclick = () => { closeMenus(); addMicrosoft($('#addErr')); };
$('#addForm').onsubmit = e => {
  e.preventDefault(); const n = $('#addName').value.trim();
  if (!NAME_OK.test(n)) { $('#addName').value = ''; $('#addName').placeholder = NAME_ERR; return; }
  addOffline(n, $('#addErr')).then(ok => { $('#addName').value = ''; $('#addName').placeholder = ok ? 'Add offline account' : ($('#addErr').textContent || 'Could not add'); if (ok) closeMenus(); });
};
$('#acctList').onclick = e => {
  const x = e.target.closest('[data-rm]'); if (x) return dropAccount(+x.dataset.rm);
  const row = e.target.closest('[data-ac]'); if (row) { const a = AC.list[+row.dataset.ac]; BE('POST', '/accounts/active', { uuid: a.uuid }).then(async () => { await loadAccounts(); applyAccount(); closeMenus(); }); }
};
$('#signOut').onclick = () => dropAccount(AC.active);
window.dexter?.onMaximize?.(v => document.body.classList.toggle('max', v));

const ORDER = ['home', 'library', 'events', 'mods', 'cosmetics', 'clips', 'news'];
let current = 'home';
function moveInd() {
  const t = $('#tabs button.on'), ind = $('#tabInd');
  ind.style.width = t.offsetWidth + 'px'; ind.style.transform = `translateX(${t.offsetLeft}px)`;
}
function go(id) {
  closeMenus(); const d = $('#mdet'), a = $('#article'); if (d) d.hidden = true; if (a) a.hidden = true;   // a project page / article belongs to its tab
  if (id === current) return;
  const dir = ORDER.indexOf(id) > ORDER.indexOf(current) ? 1 : -1;
  $$('#tabs button').forEach(t => t.classList.toggle('on', t.dataset.go === id));
  $$('.page').forEach(p => {
    if (p.id === id) { p.style.transition = 'none'; p.style.setProperty('--from', `${dir * 12}px`); void p.offsetWidth; p.style.transition = ''; p.classList.add('on'); p.style.setProperty('--from', '0px'); }
    else if (p.classList.contains('on')) { p.style.setProperty('--from', `${-dir * 12}px`); p.classList.remove('on'); }
  });
  current = id; moveInd(); sidePanel(); PAGE_LOAD[id]?.();
}
// The servers/friends panel lives on Home; on other tabs it only appears while Friends is open.
// The servers/friends panel no longer squeezes the other tabs: on Home it floats over the right edge (Home keeps its own room for it),
// so Library and the rest are laid out at their full width all the time and nothing re-flows when you switch.
const sidePanel = () => { const fr = $('#frToggle').classList.contains('on'); $('.body').classList.toggle('side-on', fr && current !== 'home'); $('.body').classList.toggle('home-side', current === 'home'); };
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
document.fonts.ready.then(moveInd); addEventListener('resize', moveInd);
$$('.seg').forEach(g => g.addEventListener('click', e => { const b = e.target.closest('button'); if (b) $$('button', g).forEach(x => x.classList.toggle('on', x === b)); }));

const closeMenus = () => $$('.menu.open').forEach(m => m.classList.remove('open'));
function menu(btn, m) { btn.addEventListener('click', e => { e.stopPropagation(); const open = !m.classList.contains('open'); closeMenus(); m.classList.toggle('open', open); }); }
document.addEventListener('click', e => { if (!e.target.closest('.menu')) closeMenus(); });
menu($('#meBtn'), $('#menu'));
menu($('#linksBtn'), $('#linksMenu'));

/* settings: a floating panel over whatever tab is open */
const sheet = $('#settings');
document.addEventListener('click', e => {
  if (e.target.closest('[data-settings]')) { closeMenus(); sheet.classList.add('on'); }
  else if (e.target.closest('[data-close-settings]') || e.target === sheet) sheet.classList.remove('on');
});
addEventListener('keydown', e => { if (e.key === 'Escape') { sheet.classList.remove('on'); closeMenus(); } });
$('#setNav').addEventListener('click', e => {
  const b = e.target.closest('[data-sec]'); if (!b) return;
  $$('#setNav button').forEach(x => x.classList.toggle('on', x === b));
  $$('.sec').forEach(s => s.classList.toggle('on', s.dataset.sec === b.dataset.sec));
});
$('#signOut2').onclick = () => { sheet.classList.remove('on'); leave(); };

/* ================= instances ================= */
const verSelect = () => `<select name="v" title="Minecraft version">${(VERSIONS.length ? VERSIONS : [{ id: '1.21.11' }]).map(v => `<option value="${esc(v.id)}"${v.id === '1.21.11' ? ' selected' : ''}>${esc(v.id)}</option>`).join('')}</select>`;
const newForm = () => `<form class="am-add" data-newinst autocomplete="off"><i data-i="plus"></i><input name="n" placeholder="New profile name" maxlength="48" spellcheck="false">${verSelect()}<button type="submit" title="Create"><i data-i="check"></i></button></form>`;
function drawInstances() {
  const i = INSTANCES[inst] || { id: '', name: 'No profile yet', ver: '', loader: 'fabric', items: new Map() };
  $('#instName').textContent = $('#instName2').textContent = `${i.name}  ${i.ver}`;
  const html = INSTANCES.map((x, k) => `<button data-inst="${k}" class="${k === inst ? 'on' : ''}"><i data-i="gamepad"></i>${esc(x.name)}<span class="muted" style="margin-left:auto">${esc(x.ver)}</span></button>`).join('') + newForm();
  $('#instMenu').innerHTML = $('#instMenu2').innerHTML = html;
  icons($('#instMenu')); icons($('#instMenu2'));
  $('#instCount').textContent = countInstalled();
}
async function createInstance(form) {
  const name = form.n.value.trim(), version = form.v.value.trim();
  if (!name) return;
  const r = await BE('POST', '/instances', { name, version });
  if (r.status !== 200) { form.n.value = ''; form.n.placeholder = r.data.error || 'Could not create'; return; }
  await loadInstances(); inst = Math.max(0, INSTANCES.findIndex(x => x.id === r.data.created));
  closeMenus(); drawInstances(); loadMods();
}
document.addEventListener('submit', e => { const f = e.target.closest('[data-newinst]'); if (f) { e.preventDefault(); createInstance(f); } });
function pickInstance(e) { const t = e.target.closest('[data-inst]'); if (!t) return; inst = +t.dataset.inst; closeMenus(); drawInstances(); loadMods(); }
menu($('#instBtn2'), $('#instMenu2'));
$('#instMenu2').addEventListener('click', pickInstance);

/* ================= home ================= */
const pill = e => e.state === 'live' ? `<span class="pill live">${e.tag}</span>` : `<span class="pill ${e.state === 'reg' ? 'purple' : ''}">${e.tag}</span>`;
const cta = e => ({ live: 'Spectate', reg: 'Register', open: 'Open server' })[e.state];
const heroEvents = EVENTS.slice(0, 4);
let hi = -1, htimer, front = $('#heroBg'), back = $('#heroBg2');
// The buttons (Play and the instance picker) are wired once and never re-rendered,
// so they stay exactly where they are when the event changes. Only the picture and the text change.
menu($('#instBtn'), $('#instMenu'));
$('#instMenu').onclick = pickInstance;
function showHero(i) {
  if (i === hi) return;
  hi = i; const e = heroEvents[i];
  // crossfade: the new picture fades in over the old one, which stays fully visible underneath (no dip to dark)
  back.style.setProperty('--img', img(e.img)); back.style.zIndex = 2; back.style.opacity = 1; front.style.zIndex = 1;
  const old = front; [front, back] = [back, front];
  setTimeout(() => { old.style.transition = 'none'; old.style.opacity = 0; void old.offsetWidth; old.style.transition = ''; }, 1000);
  $('#heroTag').className = 'pill swap' + (e.state === 'live' ? ' live' : e.state === 'reg' ? ' purple' : '');
  $('#heroTag').textContent = e.tag;
  $('#heroName').textContent = e.name;
  $('#heroDesc').textContent = e.desc;
  // restart the small fade-in on the text only
  $$('.hero-main .swap').forEach(el => { el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); });
  clearTimeout(htimer); htimer = setTimeout(() => showHero((hi + 1) % heroEvents.length), 8000);
}

/* ================= links (Support, Website, Discord; the top-bar drop-down) ================= */
document.addEventListener('click', e => { const l = e.target.closest('[data-link]'); if (l) { closeMenus(); window.dexter?.open(l.dataset.link); } });

/* ================= right panel ================= */
$('#frToggle').onclick = e => {
  const f = e.currentTarget.classList.toggle('on');
  $('#serverView').classList.toggle('on', !f); $('#friendView').classList.toggle('on', f);
  $('#spTitle').textContent = f ? 'Friends' : 'Servers';
  $('#spAdd').innerHTML = ICONS[f ? 'adduser' : 'plus'];
  e.currentTarget.innerHTML = ICONS[f ? 'servers' : 'friends']; e.currentTarget.title = f ? 'Servers' : 'Friends';   // the button always offers the other panel
  sidePanel();
};
let SAVED = [];
const SRV_INFO = new Map();   // address -> { icon, online } from the public status API, asked once per address
function srvInfo(address) {
  if (SRV_INFO.has(address)) return;
  SRV_INFO.set(address, {});
  fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(address)}`).then(r => r.json()).then(d => {
    SRV_INFO.set(address, { icon: d.icon || '', online: !!d.online, players: d.players?.online ?? null });
    document.querySelectorAll(`#savedList .srv[data-addr="${CSS.escape(address)}"]`).forEach(row => paintSrv(row));
  }).catch(() => {});
}
function paintSrv(row) {
  const i = SRV_INFO.get(row.dataset.addr) || {}, ph = row.querySelector('.ph');
  if (i.icon && !ph.querySelector('img')) ph.insertAdjacentHTML('afterbegin', `<img src="${i.icon}" alt="">`);
  const n = row.querySelector('.n'); if (i.online && i.players != null) n.textContent = `${i.players.toLocaleString()} playing`;
}
function drawSaved() {
  $('#savedLabel').hidden = !SAVED.length;
  // the cross sits on the server icon and only shows on hover
  $('#savedList').innerHTML = SAVED.map(x => `<div class="srv" data-addr="${esc(x.address)}"><span class="ph"><button class="srv-x" data-srm="${esc(x.id)}" title="Remove" aria-label="Remove ${esc(x.name)}"><span class="wi-x"></span></button></span><div class="t"><b>${esc(x.name)}</b><span class="n">${esc(x.address)}</span></div><button class="join" data-join="${esc(x.address)}">Join</button></div>`).join('');
  $$('#savedList .srv').forEach(row => { paintSrv(row); srvInfo(row.dataset.addr); });
}
const loadServers = () => BE('GET', '/servers').then(r => { SAVED = r.data.servers || []; drawSaved(); });
$('#spAdd').addEventListener('click', () => { if ($('#serverView').classList.contains('on')) { const f = $('#srvForm'); f.hidden = !f.hidden; if (!f.hidden) f.n.focus(); } });
$('#srvForm').onsubmit = async e => {
  e.preventDefault(); const f = e.target, a = f.a.value.trim(), m = /^([A-Za-z0-9.-]+)(?::(\d{1,5}))?$/.exec(a);
  if (!f.n.value.trim() || !m) { f.a.value = ''; f.a.placeholder = 'host or host:port'; return; }
  // shown at once; the backend (which also checks the address) finishes in the background
  const body = { name: f.n.value.trim(), host: m[1], port: m[2] ? +m[2] : 25565 };
  SAVED.push({ id: 'tmp' + Date.now(), name: body.name, address: body.port === 25565 ? body.host : `${body.host}:${body.port}` }); drawSaved(); f.reset(); f.hidden = true;
  BE('POST', '/servers', body).then(loadServers);
};
$('#savedList').addEventListener('click', e => { const x = e.target.closest('[data-srm]'); if (!x) return; e.stopPropagation(); const id = x.dataset.srm; SAVED = SAVED.filter(s => s.id !== id); drawSaved(); if (!id.startsWith('tmp')) BE('DELETE', '/servers/' + encodeURIComponent(id)).then(loadServers); });
loadServers();
fetch('https://api.mcsrvstat.us/3/play.dexter.gg').then(r => r.json()).then(d => { if (d.online) { $('#oursCount').textContent = d.players.online.toLocaleString(); $('#oursCount').hidden = false; } }).catch(() => {});
$('#serverList').innerHTML = SERVERS.map(([n, host]) =>
  `<div class="srv" data-host="${host}"><span class="ph"></span><div class="t"><b>${n}</b><span class="n">${host}</span></div><button class="join" data-join="${host}">Join</button></div>`).join('');
SERVERS.forEach(async ([, host]) => {
  try {
    const d = await (await fetch(`https://api.mcsrvstat.us/3/${host}`)).json();
    const row = $(`.srv[data-host="${host}"]`);
    if (d.icon) $('.ph', row).outerHTML = `<img src="${d.icon}" alt="">`;
    if (d.online) $('.n', row).textContent = `${d.players.online.toLocaleString()} playing`;
  } catch { /* keep the address as the subtitle */ }
});
const online = FRIENDS.filter(f => f[2]), offline = FRIENDS.filter(f => !f[2]);
const fr = ([n, where, st]) => `<div class="fr ${st ? '' : 'off'}"><div class="av" style="--st:${st || '#525252'}"><img src="${head(n)}" alt=""></div><div class="t"><b>${n}</b>${where ? `<span class="where">${where}</span>` : ''}</div>${where ? `<button class="join" data-join="${where}">Join</button>` : ''}</div>`;
// Friends need the Dexter server (presence + friend lists). Until one is configured the panel says so instead of showing made-up people.
// the Friends screens are drawn by v2.js from social-api.js (preview data until the dev team connects the service)

/* ================= events ================= */
$('#evList').innerHTML = EVENTS.map(e => `<button class="evi" data-ev="${e.id}"><span class="th" style="--img:${img(e.img)}"></span>${e.name}${e.state === 'live' ? '<span class="live"></span>' : ''}</button>`).join('')
;
function showEv(id) {
  const e = EVENTS.find(x => x.id === id);
  $$('.evi[data-ev]').forEach(b => b.classList.toggle('on', b.dataset.ev === id));
  $('#evDetail').innerHTML = `
    <div class="ev-banner" style="--img:${img(e.img)}">
      <div>${pill(e)}<h1>${e.name}</h1></div>
      <div class="acts"><button class="btn ghost"><i data-i="share"></i>Share</button><button class="btn ${e.state === 'live' ? 'white' : 'purple'}">${cta(e)}</button></div>
    </div>
    <div class="facts">
      <div class="fact"><i data-i="gamepad"></i>${e.mode}</div><div class="fact"><i data-i="events"></i>${e.prize}</div>
      <div class="fact"><i data-i="clock"></i>${e.when}</div><div class="fact"><i data-i="friends"></i>${e.players}</div>
    </div>
    <div class="ev-cols">
      <div class="box"><h3>Rules</h3><ol>${e.rules.map(r => `<li>${r}</li>`).join('')}</ol></div>
      <div class="box"><h3>Rewards</h3>${e.rewards.map(([a, b]) => `<div class="reward"><span>${a}</span><b>${b}</b></div>`).join('')}
        <div class="heads">${['Vexil', 'Kairo_', 'lumen', 'Zetaa'].map(p => `<img src="${head(p)}" alt="${p}" title="${p}">`).join('')}</div></div>
    </div>`;
  icons($('#evDetail'));
}
$('#evList').onclick = e => { const b = e.target.closest('[data-ev]'); if (b) showEv(b.dataset.ev); };

/* ================= pixel mosaic textures (our own, generated) ================= */
// A tile of small squares jittered around one colour, like a Minecraft block face.
function mosaic(hex, cell = 4, size = 48, spread = .14) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), n = parseInt(hex.slice(1), 16);
  for (let i = 0; i < size; i += cell) for (let j = 0; j < size; j += cell) {
    const k = 1 + (Math.random() * 2 - 1) * spread;
    const ch = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)));
    x.fillStyle = `rgb(${ch(16)},${ch(8)},${ch(0)})`; x.fillRect(i, j, cell, cell);
  }
  return `url(${c.toDataURL()})`;
}
const root = document.documentElement.style;
root.setProperty('--tx-play', mosaic('#8d45c7', 8, 96, .1));      // Play button (Dexter violet), big 8px pixels

/* ================= mods: everything on Modrinth ================= */
let type = 'mod', view = 'browse', query = '', cat = '', ctl, qTimer, shown = new Map();
const countInstalled = () => [...installed().values()].filter(m => m.type === type).length;
function drawCats() {
  $('#modCats').innerHTML = [['All', ''], ...TYPES[type].cats].map(([n, v]) => `<button class="chip ${v === cat ? 'on' : ''}" data-cat="${v}">${n}</button>`).join('');
}
$('#modCats').onclick = e => { const b = e.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; drawCats(); loadMods(); };
$('#modType').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; type = b.dataset.t; cat = ''; drawCats(); loadMods(); });
const tone = c => c ? '#' + c.toString(16).padStart(6, '0') : '#16161a';
const modCard = (m, k) => {
  const have = installed().has(m.key);
  const btn = view === 'installed' ? `<button class="install remove" data-rm="${esc(m.key)}"><i data-i="trash"></i>Remove</button>`
    : have ? `<button class="install done"><i data-i="check"></i>${m.type === 'modpack' ? 'Added' : 'Installed'}</button>`
    : `<button class="install" data-add="${esc(m.key)}"><i data-i="download"></i>${TYPES[m.type].btn}</button>`;
  return `<div class="mod" style="animation-delay:${Math.min(k, 12) * 30}ms">
    <div class="banner" style="--img:${m.banner ? `url('${esc(m.banner)}')` : 'none'};--tone:${tone(m.color)}"></div>
    <div class="body2"><img class="ico" src="${esc(m.icon)}" alt="" onerror="this.style.visibility='hidden'">
      <div class="tt"><b>${esc(m.title)}</b>${VERIFIED.has(m.slug) ? '<i data-i="verified" class="vf" title="Allowed in Dexter events"></i>' : ''}</div>
      <span class="by">by ${esc(m.author)}</span>
      <p>${esc(m.desc)}</p>
      <div class="mod-foot"><span class="stat"><i data-i="download"></i>${fmt(m.downloads)}</span><span class="stat"><i data-i="heart"></i>${fmt(m.follows || 0)}</span>${btn}</div></div></div>`;
};
function render(list) { shown = new Map(list.map(m => [m.key, m])); $('#modGrid').innerHTML = list.map(modCard).join(''); icons($('#modGrid')); }
function empty(icon, text, extra = '') { $('#modGrid').innerHTML = `<div class="empty"><i data-i="${icon}"></i>${text}${extra}</div>`; icons($('#modGrid')); }
async function loadMods() {
  $('#instCount').textContent = countInstalled();
  $('#modCats').style.display = view === 'browse' ? '' : 'none';
  if (view === 'installed') {
    const list = [...installed().values()].filter(m => m.type === type);
    return list.length ? render(list) : empty('mods', INSTANCES[inst] ? `Nothing installed in ${esc(INSTANCES[inst].name)} yet` : 'Create a profile first');
  }
  ctl?.abort(); ctl = new AbortController();
  $('#modGrid').innerHTML = '<div class="skel"></div>'.repeat(9);
  if (!INSTANCES[inst]) return empty('mods', 'Create a profile first (the profile picker, top left)');
  const i = INSTANCES[inst], t = TYPES[type];
  const f = [[`versions:${i.ver}`], [t.facet]];
  if (type === 'mod' || type === 'modpack') f.push([`categories:${i.loader}`]);
  if (cat) f.push([`categories:${cat}`]);
  try {
    const r = await fetch(`https://api.modrinth.com/v2/search?limit=30&index=${query ? 'relevance' : 'downloads'}&query=${encodeURIComponent(query)}&facets=${encodeURIComponent(JSON.stringify(f))}`, { signal: ctl.signal });
    const { hits } = await r.json();
    hits.length ? render(hits.map(h => ({ key: h.project_id, id: h.project_id, slug: h.slug, type, title: h.title, author: h.author, desc: h.description, icon: h.icon_url,
      downloads: h.downloads, follows: h.follows, banner: h.featured_gallery || h.gallery?.[0], color: h.color })))
      : empty('search', query ? `Nothing found for ${esc(query)}` : 'Nothing here for this version yet');
  } catch (err) {
    if (err.name !== 'AbortError') empty('danger', 'Could not reach Modrinth', '<button class="btn ghost" id="retry">Try again</button>');
  }
}
async function install(btn, m, vOverride) {
  btn.className = 'install busy'; btn.innerHTML = '<span class="spin"></span>Installing';
  const i = INSTANCES[inst];
  try {
    if (!i) throw new Error('Create a profile first');
    if (m.type === 'modpack') {   // a modpack becomes a NEW profile (its own Minecraft version, mods, configs)
      const r = await BE('POST', '/modpacks', { projectId: m.id, name: m.title });
      if (r.status !== 200) throw new Error(r.data.error || 'Could not install the modpack');
      await loadInstances(); inst = Math.max(0, INSTANCES.findIndex(x => x.id === r.data.created)); drawInstances();
      btn.className = 'install done'; btn.innerHTML = ICONS.check + 'Added'; return;
    }
    // Resolve the exact file for this profile, then the backend downloads it (Modrinth CDN only), checks its SHA-512 and puts it in the right folder.
    const resolve = async id => {
      const r = await fetch(`https://api.modrinth.com/v2/project/${id}/version?game_versions=${encodeURIComponent(JSON.stringify([i.ver]))}&loaders=${encodeURIComponent(JSON.stringify([TYPES[m.type].loader(i)]))}`);
      return (await r.json())[0];
    };
    const put = async (v, type) => {
      const f = v.files.find(x => x.primary) || v.files[0];
      const r = await BE('POST', `/instances/${encodeURIComponent(i.id)}/install`, { type, url: f.url, filename: f.filename, sha512: f.hashes?.sha512 });
      if (r.status !== 200) throw new Error(r.data.error || 'Install failed');
      return r.data.file;
    };
    const v = vOverride || await resolve(m.id);
    if (!v) throw new Error('no build for this version');
    m.file = await put(v, m.type);
    if (m.type === 'mod') for (const d of v.dependencies || []) {   // required libraries (Fabric API and friends)
      if (d.dependency_type !== 'required' || !d.project_id || installed().has(d.project_id)) continue;
      try { const dv = await resolve(d.project_id); if (dv) await put(dv, 'mod'); } catch { /* the mod itself is in; a missing library shows up when the game starts */ }
    }
    installed().set(m.key, m); saveItems(i);
    btn.className = 'install done'; btn.innerHTML = ICONS.check + 'Installed';
    $('#instCount').textContent = countInstalled();
  } catch (err) {
    btn.className = 'install'; btn.innerHTML = ICONS.download + 'Retry'; btn.title = String(err.message || err);
  }
}
$('#modGrid').addEventListener('click', e => {
  if (e.target.closest('#retry')) return loadMods();
  const a = e.target.closest('[data-add]'); if (a) return install(a, shown.get(a.dataset.add));
  const r = e.target.closest('[data-rm]'); if (r) {
    const i = INSTANCES[inst], m = installed().get(r.dataset.rm);
    if (i && m?.file) BE('DELETE', `/instances/${encodeURIComponent(i.id)}/items?type=${m.type}&file=${encodeURIComponent(m.file)}`);
    installed().delete(r.dataset.rm); if (i) saveItems(i); loadMods();
  }
});
$('#modView').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { view = b.dataset.v; loadMods(); } });
$('#modQ').addEventListener('input', e => { query = e.target.value.trim(); clearTimeout(qTimer); qTimer = setTimeout(loadMods, 300); });

/* ================= wardrobe: the 3D player, its skins popover and the emote poses ================= */
// Cloaks and emotes are equipped in the Locker (see LOCK/dressLocker); this part only drives the model and the poses.
let sv;
const ready = Promise.resolve();               // the rest of the file waits for the viewer's textures this way
const worn = { emote: 0 };
function dress(pose) {
  if (!sv) return;
  if (pose) sv.animation = new skinview3d[EMOTES[worn.emote][1]]();
}
async function drawWardrobe() {
  $('#wEmote').innerHTML = EMOTES.map((e, k) => `<button class="${worn.emote === k ? 'on' : ''}" data-k="${k}">${e[0]}</button>`).join('');
}
$('.ward').addEventListener('click', e => {
  if (e.target.closest('#skBtn')) return toggleSkins();
  if (e.target.closest('[data-up]')) return $('#skFile').click();
  const del = e.target.closest('[data-skdel]'); if (del) return deleteSkin(del.dataset.skdel);
  const sk = e.target.closest('#wSkin .w-item'); if (sk) return pickSkin(sk.dataset.id);
  const emo = e.target.closest('#wEmote button'); if (emo) { worn.emote = +emo.dataset.k; dress(true); return drawWardrobe(); }
});

/* ================= skins: upload as many 64x64 PNGs as you like, click one to wear it ================= */
// Saved in this launcher's own storage. The one worn is remembered per account (AC.list[i].skin, saved with the accounts),
// so the launch code can read it for either account type: send it to Mojang for a Microsoft account, or load it in game for an offline one.
// The saved skins are the Dexter launcher's skin library (backend). Wearing one uploads it to the Microsoft account's Minecraft profile;
// offline accounts have no profile to upload to, so for them it is only remembered (the backend says so).
let SKINS = [];
async function loadSkins() {
  const r = await BE('GET', '/skins'); if (r.status !== 200) return;
  SKINS = r.data.skins.map(k => ({ id: k.id, name: k.name, slim: k.slim, data: 'data:image/png;base64,' + k.png, equipped: k.equipped }));
  skinImg.clear();
  const a = AC.list[AC.active]; if (a) a.skin = SKINS.find(k => k.equipped)?.id || null;
}
const skinImg = new Map();                           // id -> decoded <img>, for the card previews and the little head in the top bar
const loadImg = data => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = data; });
async function skinOf(id) { if (!skinImg.has(id)) { const k = SKINS.find(x => x.id === id); skinImg.set(id, k ? await loadImg(k.data) : null); } return skinImg.get(id); }
// the front of a skin (head, body, arms, legs, with the hat/jacket layer) drawn into a card
function skinFront(cv, img) {
  const x = cv.getContext('2d'), s = 3, ox = (cv.width - 16 * s) / 2, oy = 6, modern = img.height === 64;
  x.imageSmoothingEnabled = false; x.clearRect(0, 0, cv.width, cv.height);
  const part = (sx, sy, w, h, dx, dy) => x.drawImage(img, sx, sy, w, h, ox + dx * s, oy + dy * s, w * s, h * s);
  part(8, 8, 8, 8, 4, 0); part(20, 20, 8, 12, 4, 8); part(44, 20, 4, 12, 0, 8); part(modern ? 36 : 44, modern ? 52 : 20, 4, 12, 12, 8);
  part(4, 20, 4, 12, 4, 20); part(modern ? 20 : 4, modern ? 52 : 20, 4, 12, 8, 20);
  if (modern) part(20, 36, 8, 12, 4, 8);
  part(40, 8, 8, 8, 4, 0);
}
async function drawSkins() {
  const on = AC.list[AC.active]?.skin;
  $('#wSkin').innerHTML = '<button class="w-item sk-up" data-up title="Add skin files (64x64 PNG)"><span class="glyph"><i data-i="plus"></i></span><b>Upload skin</b></button>' +
    SKINS.map(k => `<button class="w-item ${k.id === on ? 'on' : ''}" data-id="${k.id}"><canvas width="160" height="108"></canvas><b>${k.name}</b>${k.id === on ? '<i data-i="check" class="wornic"></i>' : ''}<span class="sk-x" data-skdel="${k.id}" title="Delete"><span class="wi-x"></span></span></button>`).join('');
  icons($('#wSkin'));
  const cvs = $$('#wSkin canvas');
  for (const [n, k] of SKINS.entries()) { const im = await skinOf(k.id); if (im && cvs[n]) skinFront(cvs[n], im); }
  $('#nSkin').textContent = SKINS.length + ' saved';
}
function toggleSkins(open = $('#skPop').hidden) {
  const pop = $('#skPop'); $('#skBtn').classList.toggle('on', open); $('#skErr').textContent = '';
  if (open) { pop.classList.remove('out'); pop.hidden = false; drawSkins(); return; }
  if (pop.hidden || pop.classList.contains('out')) return;
  pop.classList.add('out'); setTimeout(() => { pop.hidden = true; pop.classList.remove('out'); }, 220);   // let it shrink back into the button first
}
document.addEventListener('click', e => { if (!$('#skPop').hidden && !e.target.closest('#skPop, #skBtn')) toggleSkins(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') toggleSkins(false); });
async function pickSkin(id) {
  const a = AC.list[AC.active]; if (!a || a.skin === id) return;
  $('#skErr').textContent = 'Applying...';
  const r = await BE('POST', '/skins/equip', { id });
  $('#skErr').textContent = r.status !== 200 ? (r.data.error || 'Could not apply the skin') : (r.data.applied === false ? r.data.note : '');
  if (r.status === 200) { await loadSkins(); applyAccount(); drawSkins(); }
}
async function deleteSkin(id) {
  await BE('DELETE', '/skins/' + encodeURIComponent(id));
  await loadSkins(); applyAccount(); drawSkins();
}
$('#skFile').onchange = async e => {
  const files = [...e.target.files]; e.target.value = ''; let bad = 0;
  for (const f of files) {
    const data = f.type === 'image/png' && f.size < 300000 ? await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); }) : null;
    const im = data && await loadImg(data);
    if (!im || im.width !== 64 || ![32, 64].includes(im.height)) { bad++; continue; }
    const added = await BE('POST', '/skins', { name: f.name.replace(/\.png$/i, '').slice(0, 18) || 'Skin', png: data.split(',')[1] });
    if (added.status !== 200) bad++;
  }
  await loadSkins(); drawSkins();
  $('#skErr').textContent = bad ? `${bad} file${bad > 1 ? 's' : ''} skipped: skins must be 64x64 PNG` : '';
};
if (window.skinview3d) {
  // the canvas is sized from its container (not from itself), so it follows the layout whenever the window or side panel changes
  const cv = $('#skin3d'), box = cv.parentElement;
  sv = new skinview3d.SkinViewer({ canvas: cv, width: box.clientWidth || 500, height: box.clientHeight || 600, skin: skinUrl(ME) });
  sv.controls.enableZoom = false;
  sv.zoom = .62;
  sv.autoRotate = false;                       // stays still; drag to turn,
  if (sv.playerWrapper) sv.playerWrapper.rotation.y = -.55;   // a calm three-quarter view
  new ResizeObserver(() => sv.setSize(box.clientWidth, box.clientHeight)).observe(box);
  C3.init(sv);
}

/* ================= settings controls ================= */
const ram = $('#ram'), ramUp = () => { ram.style.setProperty('--v', (ram.value - 2) / 14 * 100 + '%'); $('#ramV').textContent = ram.value + ' GB'; };
ram.oninput = ramUp; ramUp();

/* ================= settings: saved by the Dexter backend (LauncherSettings) and applied to every launch ================= */
const RES = [[0, 0, 'Default'], [1280, 720, '1280 \u00d7 720'], [1600, 900, '1600 \u00d7 900'], [1920, 1080, '1920 \u00d7 1080'], [2560, 1440, '2560 \u00d7 1440']];
let SET = null;
// writes go out one at a time, and a UI choice is applied locally first: two quick changes (say a wing, then a pet) can never overwrite each other
let setQueue = Promise.resolve(), setPending = 0;
const saveSet = patch => {
  if (SET) SET = { ...SET, ...patch };
  setPending++;
  const job = setQueue.then(() => BE('PUT', '/settings', patch.ui ? { ...patch, ui: { ...(SET?.ui || {}) } } : patch)).then(r => { if (r.status === 200 && setPending === 1) SET = r.data; }).catch(() => {}).finally(() => { setPending--; });
  setQueue = job; return job;
};
const uiSet = (k, v) => saveSet({ ui: { ...(SET?.ui || {}), [k]: String(v) } });
var loadSettings = async function () {
  const r = await BE('GET', '/settings'); if (r.status !== 200) return; SET = r.data;
  ram.value = Math.min(16, Math.max(2, Math.round(SET.fixedMemoryMb / 1024))); ramUp();
  $$('#gfx button').forEach(b => b.classList.toggle('on', b.dataset.g === (SET.ui?.graphics || (SET.performanceMode ? 'low' : 'balanced'))));
  const ri = Math.max(0, RES.findIndex(x => x[0] === SET.gameWidth && x[1] === SET.gameHeight)); $('#resSel').firstChild.textContent = RES[ri][2]; $('#resSel').dataset.i = ri;
  $('#fsTg').checked = !!SET.gameFullscreen;
  $('#keepTg').checked = !SET.minimizeOnLaunch;
  $('#startTg').checked = SET.ui?.startup === 'true';
  $$('[data-ui]').forEach(c => { const v = SET.ui?.[c.dataset.ui]; if (v !== undefined) c.checked = v === 'true'; });
  const sh = await BE('GET', '/shield');
  $('#shieldT').textContent = sh.data.active ? 'Protection is on' : 'Protection is off'; $('#shieldS').textContent = sh.data.message || '';
};
ram.onchange = () => saveSet({ memoryMode: 'FIXED', fixedMemoryMb: ram.value * 1024 });
$('#gfx').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { uiSet('graphics', b.dataset.g); saveSet({ performanceMode: b.dataset.g === 'low' }); } });
$('#resSel').onclick = e => { const i = ((+e.currentTarget.dataset.i || 0) + 1) % RES.length; e.currentTarget.dataset.i = i; e.currentTarget.firstChild.textContent = RES[i][2]; saveSet({ gameWidth: RES[i][0], gameHeight: RES[i][1] }); };
$('#fsTg').onchange = e => saveSet({ gameFullscreen: e.target.checked });
$('#keepTg').onchange = e => saveSet({ minimizeOnLaunch: !e.target.checked });
$('#startTg').onchange = e => { uiSet('startup', e.target.checked); window.dexter?.startup?.(e.target.checked); };
$$('[data-ui]').forEach(c => c.onchange = () => uiSet(c.dataset.ui, c.checked));
loadSettings();

/* ================= launch / join (visual only) ================= */
let launching = null;   // the profile id of the launch the popup is showing
async function launch(host) {
  const m = $('#modal'), i = INSTANCES[inst];
  m.classList.add('on'); $('#mBar').style.width = '3%';
  if (!i) { $('#mTitle').textContent = 'No profile yet'; $('#mSteps').innerHTML = '<div class="step"><i></i>Create a profile first (the profile picker, top left)</div>'; return; }
  $('#mTitle').textContent = host ? `Joining ${host}` : `Starting ${i.name}`;
  $('#mSteps').innerHTML = '<div class="step run"><i></i><span id="mPhase">Starting</span></div>';
  launching = i.id;
  const r = await BE('POST', '/launch', { instanceId: i.id, server: host || null });
  if (r.status === 200) watchLaunch(i.id);
  if (r.status !== 200) { launching = null; $('#mSteps').innerHTML = `<div class="step"><i></i>${esc(r.data.error || 'Could not start')}</div>`; }
}
// the live event can be missed (stream reconnecting): also ask the backend whether the game process is up, so the loading popup always ends
let launchPoll = null;
function watchLaunch(id) {
  clearInterval(launchPoll);
  launchPoll = setInterval(async () => {
    if (launching !== id) return clearInterval(launchPoll);
    const r = await BE('GET', '/running'); if (r.status !== 200) return;
    if ((r.data.running || []).includes(id)) { clearInterval(launchPoll); launchDone(); }
    else if (!(r.data.starting || []).includes(id)) { clearInterval(launchPoll); if ($('#modal').classList.contains('on') && launching === id) { launching = null; $('#modal').classList.remove('on'); } }
  }, 1500);
}
function launchDone(ev) {
  $('#mBar').style.width = '100%';
  $('#mSteps').innerHTML = `<div class="step done"><i>\u2713</i>Minecraft is running${ev && ev.account ? ' as ' + esc(ev.account) + (ev.accountType === 'offline' ? ' (offline account)' : '') : ''}</div>`;
  $('#modal').classList.add('done'); setTimeout(() => { $('#modal').classList.remove('on', 'done'); }, 1200);
}
window.dexter?.onBackend?.(ev => {
  if (ev.instanceId !== launching) return;
  if (ev.type === 'phase') $('#mPhase') && ($('#mPhase').textContent = ev.phase);
  if (ev.type === 'progress') $('#mBar').style.width = Math.max(3, ev.fraction * 100) + '%';
  if (ev.type === 'bytes' && ev.total > 0 && $('#mPhase')) $('#mPhase').dataset.mb = ` ${(ev.done / 1048576).toFixed(0)} / ${(ev.total / 1048576).toFixed(0)} MB`;
  if (ev.type === 'started') { clearInterval(launchPoll); launchDone(ev); }
  if (ev.type === 'error') { $('#mSteps').innerHTML = `<div class="step"><i></i>${esc(ev.message)}</div>`; launching = null; }
  if (ev.type === 'exit') { launching = null; clearInterval(launchPoll); }
});
// Join = launch the instance straight into the server (the main app passes --quickPlayMultiplayer <host>).
document.addEventListener('click', e => { const j = e.target.closest('[data-join]'); if (j) return launch(j.dataset.join); if (e.target.closest('[data-launch]')) launch(); });
$('#mCancel').onclick = () => { $('#modal').classList.remove('on', 'done'); clearInterval(launchPoll); };

/* ================= start ================= */
loadInstances().then(() => { drawInstances(); });   // Modrinth is fetched when Mods is first opened (perf.js)
drawInstances();
showHero(0);
showEv('lava');
drawCats();
drawWardrobe();
ready.then(() => dress(true));
moveInd();
sidePanel();

/* ================= start: already signed in -> straight into the launcher, no sign-in screen ================= */
loadAccounts().then(() => loadSkins()).then(() => {
  applyAccount();
  if (AC.list.length && AC.active >= 0) { $('#login').classList.add('gone'); requestAnimationFrame(moveInd); } else $('#login').classList.remove('gone');   // the sign-in screen only shows when there is no account yet
});


/* ================= Library / Clips / News: the Dexter launcher's features, in the Dexter design ================= */
const PAGE_LOAD = {
  library: () => drawLibrary(), clips: () => drawClips(), news: () => drawNews(),
};
const fmtPlay = ms => ms >= 3600000 ? (ms / 3600000).toFixed(1) + ' h' : ms >= 60000 ? Math.round(ms / 60000) + ' min' : '–';
const ago = ms => { const d = Date.now() - ms, m = Math.round(d / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };

/* ---- Library: profiles ---- */
let LIB = [];
async function drawLibrary() {
  const r = await BE('GET', '/instances'); LIB = r.data.instances || [];
  $('#libGrid').innerHTML = LIB.length ? LIB.map(p => `<div class="lib-card" data-pid="${esc(p.id)}">
      <h3><i data-i="gamepad"></i><span class="pn">${esc(p.name)}</span></h3>
      <div class="lib-meta"><span class="pill">${esc(p.version)}</span><span class="pill purple">${esc(p.loader)}</span>${p.running ? '<span class="pill live">Running</span>' : ''}</div>
      <div class="lib-stats"><span><b>${p.mods}</b> mods</span><span><b>${fmtPlay(p.playMillis)}</b> played</span><span><b>${p.sessions}</b> sessions</span></div>
      <div class="lib-act">
        <button class="btn purple" data-lib="play"><i data-i="play"></i>Play</button>
        <button class="btn ghost" data-lib="mods"><i data-i="mods"></i>Mods</button>
        <button class="ib" data-lib="cfg" title="Profile settings (memory, JVM arguments)"><i data-i="settings"></i></button>
        <button class="ib" data-lib="rename" title="Rename"><i data-i="edit"></i></button>
        <button class="ib" data-lib="dup" title="Duplicate"><i data-i="copy"></i></button>
        <button class="ib" data-lib="folder" title="Open folder"><i data-i="folder"></i></button>
        <button class="ib" data-lib="del" title="Delete"><i data-i="trash"></i></button>
      </div><div class="lib-set" data-cfg="${esc(p.id)}" hidden><select name="ram" title="Memory for this profile"><option value="0">Memory: automatic</option>${[2, 3, 4, 6, 8, 12, 16].map(g => `<option value="${g * 1024}"${p.ramMaxMb === g * 1024 ? ' selected' : ''}>${g} GB</option>`).join('')}</select><input class="args" name="args" placeholder="Extra JVM arguments" value="${esc(p.jvmArgs)}" spellcheck="false"><button class="btn purple" data-lib="cfgsave" style="height:36px">Save</button></div></div>`).join('') : '<div class="lib-empty">No profiles yet. Create one above: a profile is a Minecraft version with its own mods, packs and settings.</div>';
  icons($('#libGrid'));
}
$('#libNew').onsubmit = async e => {
  e.preventDefault(); const f = e.target; if (!f.n.value.trim()) return;
  const r = await BE('POST', '/instances', { name: f.n.value.trim(), version: f.v.value.trim() });
  if (r.status !== 200) { f.n.value = ''; f.n.placeholder = r.data.error || 'Could not create'; return; }
  f.reset(); await loadInstances(); drawInstances(); drawLibrary();
};
// (profile card actions live in extras2.js)

/* ---- Clips: clips and screenshots of every profile ---- */
let clipKind = 'clips', VIEW = null, vTimer;
var drawClips = async function () {
  const r = await BE('GET', '/media?kind=' + clipKind); const items = r.data.items || [];
  $('#clipGrid').innerHTML = items.length ? items.map((m, i) => `<div class="lib-card thumb-card" data-m="${i}"><div class="th" data-th="${i}"><i data-i="${clipKind === 'clips' ? 'clips' : 'image'}"></i></div><div class="tx"><b>${esc(m.file)}</b><small>${esc(m.profileName)} · ${ago(m.modified)}</small></div></div>`).join('')
    : `<div class="lib-empty">No ${clipKind} yet. ${clipKind === 'clips' ? 'Clips recorded by Dexter Client in game show up here.' : 'Screenshots taken in game show up here.'}</div>`;
  icons($('#clipGrid')); drawClips.items = items;
  items.slice(0, 40).forEach(async (m, i) => { const t = await BE('GET', `/media/thumb?kind=${clipKind}&profile=${encodeURIComponent(m.profile)}&file=${encodeURIComponent(m.file)}`); const el = $(`[data-th="${i}"]`); if (el && t.data.image) { el.style.backgroundImage = `url(data:image/jpeg;base64,${t.data.image})`; el.innerHTML = ''; } });
};
$('#clipKind').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { clipKind = b.dataset.k; drawClips(); } });
const frameUrl = (m, i) => `/media/frame?kind=${clipKind}&profile=${encodeURIComponent(m.profile)}&file=${encodeURIComponent(m.file)}&i=${i}`;
async function showFrame(i) {
  const r = await BE('GET', frameUrl(VIEW.m, i)); if (!r.data.image) return false;
  const im = await loadImg('data:image/jpeg;base64,' + r.data.image), cv = $('#vCanvas'); cv.width = im.width; cv.height = im.height; cv.getContext('2d').drawImage(im, 0, 0);
  VIEW.frames = r.data.frames; VIEW.fps = r.data.fps; VIEW.i = i; $('#vInfo').textContent = VIEW.frames > 1 ? `${i + 1} / ${VIEW.frames}` : ''; return true;
}
function stopClip() { clearTimeout(vTimer); VIEW && (VIEW.playing = false); $('#vPlay').lastChild.textContent = 'Play'; }
$('#clipGrid').addEventListener('click', async e => {
  const c = e.target.closest('[data-m]'); if (!c) return; const m = drawClips.items[+c.dataset.m];
  VIEW = { m, i: 0 }; $('#viewer').hidden = false; $('#vPlay').hidden = clipKind !== 'clips';
  if (!(await showFrame(0))) { $('#vInfo').textContent = 'No preview for this file type here. Open its folder to play it.'; }
});
$('#vPlay').onclick = async () => {
  if (!VIEW) return; if (VIEW.playing) return stopClip();
  VIEW.playing = true; $('#vPlay').lastChild.textContent = 'Pause'; let i = VIEW.i >= VIEW.frames - 1 ? 0 : VIEW.i;
  const tick = async () => { if (!VIEW?.playing) return; if (!(await showFrame(i)) || ++i >= VIEW.frames) return stopClip(); vTimer = setTimeout(tick, Math.max(0, 1000 / (VIEW.fps || 30) - 20)); };
  tick();
};
$('#vClose').onclick = () => { stopClip(); $('#viewer').hidden = true; VIEW = null; };
$('#vDel').onclick = async () => { if (!VIEW) return; await BE('DELETE', `/media?kind=${clipKind}&profile=${encodeURIComponent(VIEW.m.profile)}&file=${encodeURIComponent(VIEW.m.file)}`); $('#vClose').onclick(); drawClips(); };

/* ---- News: the Dexter server's feed ---- */
async function drawNews() {
  const r = await BE('GET', '/news');
  if (r.status !== 200) { $('#newsGrid').innerHTML = `<div class="lib-empty">${esc(r.data.error || 'News is unavailable.')}</div>`; return; }
  const posts = (r.data.posts || r.data.items || []).filter(p => p.published !== false);
  $('#newsGrid').innerHTML = posts.length ? posts.map(p => `<div class="lib-card news-card"><span class="pill purple">${esc(p.tag || 'News')}</span><h3>${esc(p.title)}</h3><p>${esc(p.summary || '')}</p><small>${p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : ''}</small></div>`).join('') : '<div class="lib-empty">Nothing new right now.</div>';
}

$$('#tabs button').forEach(b => b.title = b.textContent.trim());   // names as tooltips while the tabs are folded to icons


/* ================= toast ================= */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200); }

/* ================= Locker: the Dexter Client cosmetics (cloaks, emotes) ================= */
const LOCK = {
  capes: { name: 'Cloaks', icon: 'cape', list: () => LOCKER.capes, img: i => '../assets/locker/' + i.img },
  emotes: { name: 'Emotes', icon: 'emote', list: () => LOCKER.emotes },
};
let lockCat = 'capes';
const equipped = cat => SET?.ui?.['equip.' + cat] || '';
function drawLocker() {
  $('#lockTabs').innerHTML = Object.entries(LOCK).map(([k, v]) => `<button class="${k === lockCat ? 'on' : ''}" data-lk="${k}"><i data-i="${v.icon}"></i>${v.name}</button>`).join('');
  const c = LOCK[lockCat], on = equipped(lockCat);
  $('#lockGrid').innerHTML = c.list().map(i => {
    const img = c.img?.(i);
    return `<button class="lk-card ${i.id === on ? 'on' : ''}" data-id="${esc(i.id)}"><div class="th" ${img ? `style="background-image:url(${img})"` : ''}>${img ? '' : `<i data-i="${c.icon}"></i>`}</div><b>${esc(i.name)}</b>${i.description ? `<small>${esc(i.description)}</small>` : ''}${i.id === on ? '<i data-i="check" class="wornic"></i>' : ''}</button>`;
  }).join('');
  $('#lockNote').textContent = 'Equipped here; other players see it once you are on a Dexter server.';
  icons($('#lockTabs')); icons($('#lockGrid'));
}
$('#lockTabs').addEventListener('click', e => { const b = e.target.closest('[data-lk]'); if (b) { lockCat = b.dataset.lk; drawLocker(); } });
$('#lockGrid').addEventListener('click', e => {
  const b = e.target.closest('.lk-card'); if (!b) return; const id = b.dataset.id;
  uiSet('equip.' + lockCat, equipped(lockCat) === id ? '' : id); drawLocker(); dressLocker();   // only this slot changes; every other slot keeps what it had
});
PAGE_LOAD.cosmetics = drawLocker;

/* ================= Clips / screenshots: placeholders when there are none yet ================= */
const phCards = kind => Array.from({ length: 6 }, (_, i) => `<div class="lib-card thumb-card ph-card"><div class="th" style="background-image:linear-gradient(rgba(8,8,10,.35),rgba(8,8,10,.35)),url(${bannerFor(kind + i)})"><i data-i="${kind === 'clips' ? 'clips' : 'image'}"></i></div><div class="tx"><b>${kind === 'clips' ? 'Clip' : 'Screenshot'} ${i + 1}</b><small class="sample">placeholder</small></div></div>`).join('');
const _drawClips = drawClips;
drawClips = async function () {
  await _drawClips();
  if ($('#clipGrid .lib-empty')) { $('#clipGrid').innerHTML = phCards(clipKind) + `<div class="lib-empty" style="grid-column:1/-1;padding:10px">${clipKind === 'clips' ? 'Clips recorded in game show up here.' : 'Screenshots taken in game show up here.'}</div>`; icons($('#clipGrid')); }
};
PAGE_LOAD.clips = () => drawClips();

/* ================= the Dexter Client settings, all of them, inside the Dexter settings sheet ================= */
const VSET = [
  ['perf', 'layers', 'Memory mode', 'memoryMode', 'seg', [['AUTO', 'Automatic'], ['FIXED', 'Fixed']], 'Auto picks memory for you.'],
  ['perf', 'fire', 'Garbage collector', 'gc', 'seg', [['AUTO', 'Auto'], ['G1', 'G1'], ['ZGC', 'ZGC']], 'ZGC is smoother with free memory.'],
  ['perf', 'image', 'Driver shader cache', 'driverShaderCache', 'toggle', null, 'Faster starts after the first launch.'],
  ['perf', 'shield', 'Memory guard', 'memoryGuard', 'toggle', null, 'Closes the game before memory runs out.'],
  ['perf', 'clock', 'Min free memory (MB)', 'guardAvailableMb', 'num', [64, 4096, 10]],
  ['perf', 'clock', 'Max swap (MB)', 'guardSwapMb', 'num', [0, 8192, 10]],
  ['perf', 'clock', 'Wait before acting (s)', 'guardSeconds', 'num', [0.5, 30, 0.5]],
  ['perf', 'sun', 'Performance mode', 'performanceMode', 'toggle', null, 'Launcher runs at 30 FPS.'],
  ['launcher', 'download', 'Update automatically', 'autoUpdate', 'toggle', null, 'Install new versions on its own.'],
  ['launcher', 'image', 'Animate background', 'animateHomeBackground', 'toggle'],
  ['launcher', 'play', 'Launcher sounds', 'ui:sounds', 'toggle', null, 'Clicks, tabs and the start chime.'],
  ['social', 'friends', 'Party launches together', 'partyLaunchTogether', 'toggle'],
  ['social', 'friends', 'Follow the leader', 'partyFollowLaunches', 'toggle'],
  ['privacy', 'shield', 'Send crash reports', 'crashTelemetry', 'toggle', null, 'Send a report when the game crashes.'],
];
const secEl = { perf: '#vsPerf', launcher: '#vsLauncher', social: '#vsSocial', privacy: '#vsPrivacy' };
function drawVSettings() {
  for (const sec of Object.keys(secEl)) {
    $(secEl[sec]).innerHTML = VSET.filter(r => r[0] === sec).map(([, ic, label, key, type, opts, note]) => {
      const v = key.startsWith('ui:') ? (SET?.ui?.[key.slice(3)] ?? 'true') === 'true' : SET?.[key];
      const ctl = type === 'toggle' ? `<label class="tg"><input type="checkbox" data-vk="${key}" ${v ? 'checked' : ''}><span></span></label>`
        : type === 'seg' ? `<div class="seg" data-vk="${key}">${opts.map(([val, n]) => `<button data-val="${val}" class="${v === val ? 'on' : ''}">${n}</button>`).join('')}</div>`
        : `<input class="num" type="number" data-vk="${key}" min="${opts[0]}" max="${opts[1]}" step="${opts[2]}" value="${v ?? ''}">`;
      return `<div class="set"><span class="si"><i data-i="${ic}"></i></span><b>${label}${note ? `<small>${note}</small>` : ''}</b>${ctl}</div>`;
    }).join('');
    icons($(secEl[sec]));
  }
}
const vSave = (key, val) => key.startsWith('ui:') ? (key === 'ui:sounds' && (soundsOn = val), uiSet(key.slice(3), val)) : saveSet({ [key]: val });
document.addEventListener('change', e => { const c = e.target.closest('[data-vk]'); if (!c) return; vSave(c.dataset.vk, c.type === 'checkbox' ? c.checked : +c.value); });
document.addEventListener('click', e => { const b = e.target.closest('div[data-vk] button'); if (!b) return; const g = b.parentElement; $$('button', g).forEach(x => x.classList.toggle('on', x === b)); vSave(g.dataset.vk, b.dataset.val); });
// The Locker only has cloaks and emotes now: forget the equip choices of categories that no longer exist, so an old
// settings file can never point the Locker at something that isn't there.
const GONE_EQUIP = ['wings', 'auras', 'killfx', 'wear', 'pets', 'namestyle'];
function dropGoneEquip() {
  const ui = SET?.ui; if (!ui) return;
  const stale = GONE_EQUIP.filter(c => ('equip.' + c) in ui);
  if (!stale.length) return;
  for (const c of stale) delete ui['equip.' + c];
  saveSet({ ui: { ...ui } });
}
const _loadSettings = loadSettings;
loadSettings = async function () { await _loadSettings(); soundsOn = (SET?.ui?.sounds ?? 'true') === 'true'; dropGoneEquip(); drawVSettings(); drawLocker(); ready.then(() => dressLocker()); };
loadSettings();
