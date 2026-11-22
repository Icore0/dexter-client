/* v2.js - Dexter Client V2 front end: Custom Texture tab, Home background, Friends + Voice screens, UI sounds.
   FRONT END ONLY. Anything marked PREVIEW runs on sample/mock data (see social-api.js, API-CONTRACT.md); the dev team wires the real parts. */
(function () {
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private window or full */ } },
  };
  // same look as the top bar: solid shapes with a soft second layer
  const svg = p => `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none"><g fill="currentColor">${p}</g></svg>`;
  const SOFT = ' opacity=".5"';
  Object.assign(ICONS, {
    mic: svg(`<rect x="8.5" y="2.5" width="7" height="12.5" rx="3.5"/><path${SOFT} d="M4.75 11a.75.75 0 0 1 1.5 0 5.75 5.75 0 0 0 11.5 0 .75.75 0 0 1 1.5 0 7.25 7.25 0 0 1-6.5 7.2V21a.75.75 0 0 1-1.5 0v-2.8A7.25 7.25 0 0 1 4.75 11Z"/>`),
    micoff: svg(`<rect${SOFT} x="8.5" y="2.5" width="7" height="12.5" rx="3.5"/><path${SOFT} d="M4.75 11a.75.75 0 0 1 1.5 0 5.75 5.75 0 0 0 11.5 0 .75.75 0 0 1 1.5 0 7.25 7.25 0 0 1-6.5 7.2V21a.75.75 0 0 1-1.5 0v-2.8A7.25 7.25 0 0 1 4.75 11Z"/><path d="M3.47 3.47a.75.75 0 0 1 1.06 0l16 16a.75.75 0 1 1-1.06 1.06l-16-16a.75.75 0 0 1 0-1.06Z"/>`),
    headset: svg(`<path${SOFT} d="M3.25 14v-2a8.75 8.75 0 0 1 17.5 0v2h-1.5v-2a7.25 7.25 0 0 0-14.5 0v2Z"/><rect x="2.5" y="12.5" width="5" height="8.5" rx="2.5"/><rect x="16.5" y="12.5" width="5" height="8.5" rx="2.5"/>`),
    pencil: svg(`<path${SOFT} d="M14.5 5.5l4 4L8 20H4v-4L14.5 5.5Z"/><path d="M16 4l.9-.9a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L20 8l-4-4Z"/>`),
    eraser: svg(`<path${SOFT} d="M4.4 14.4 14.3 4.5a2 2 0 0 1 2.8 0l3.4 3.4a2 2 0 0 1 0 2.8L11.6 19.6a2 2 0 0 1-1.4.6H6.6l-2.2-2.2a2 2 0 0 1 0-2.6Z"/><path d="M9 20.25h11a.75.75 0 0 1 0 1.5H9Z"/>`),
    pick: svg(`<path${SOFT} d="M10 7.5l6.5 6.5-7.6 7.6a2.5 2.5 0 0 1-1.8.7H4.5v-2.6c0-.7.3-1.3.7-1.8L10 7.5Z"/><path d="M15 3.5a3 3 0 0 1 4.2 0l1.3 1.3a3 3 0 0 1 0 4.2l-1.5 1.5-5.5-5.5Z"/>`),
    fill: svg(`<path${SOFT} d="M5.2 12.5 11.5 6.2l6.3 6.3-6 6a2.4 2.4 0 0 1-3.4 0l-3.2-3.2a2.4 2.4 0 0 1 0-3.4Z"/><path d="M19 15.5c1.2 1.6 1.8 2.7 1.8 3.5a1.8 1.8 0 0 1-3.6 0c0-.8.6-1.9 1.8-3.5Z"/><path d="M11.5 2.6l1.06 1.06-6.2 6.2-1.06-1.06Z"/>`),
    undo: svg(`<path d="M9.3 4.7a.75.75 0 0 1 0 1.06L6.56 8.5H14a6.5 6.5 0 0 1 0 13H9.5a.75.75 0 0 1 0-1.5H14a5 5 0 0 0 0-10H6.56l2.74 2.74a.75.75 0 0 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 0Z"/>`),
    redo: svg(`<g transform="matrix(-1 0 0 1 24 0)"><path d="M9.3 4.7a.75.75 0 0 1 0 1.06L6.56 8.5H14a6.5 6.5 0 0 1 0 13H9.5a.75.75 0 0 1 0-1.5H14a5 5 0 0 0 0-10H6.56l2.74 2.74a.75.75 0 0 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 0Z"/></g>`),
    select: svg(`<path d="M3 3h6v1.5H4.5V9H3V3Zm12 0h6v6h-1.5V4.5H15V3ZM3 15h1.5v4.5H9V21H3v-6Zm16.5 0H21v6h-6v-1.5h4.5V15Z"/><rect${SOFT} x="8" y="8" width="8" height="8" rx="1.5"/>`),
    texture: svg(`<rect x="3" y="3" width="8.5" height="8.5" rx="2.5"/><rect x="12.5" y="12.5" width="8.5" height="8.5" rx="2.5"/><rect${SOFT} x="12.5" y="3" width="8.5" height="8.5" rx="2.5"/><rect${SOFT} x="3" y="12.5" width="8.5" height="8.5" rx="2.5"/>`),
    voice: svg(`<rect x="2.5" y="9" width="2.5" height="6" rx="1.25"/><rect${SOFT} x="6.5" y="5.5" width="2.5" height="13" rx="1.25"/><rect x="10.75" y="2.5" width="2.5" height="19" rx="1.25"/><rect${SOFT} x="15" y="6.5" width="2.5" height="11" rx="1.25"/><rect x="19" y="9.5" width="2.5" height="5" rx="1.25"/>`),
    pin: svg(`<path${SOFT} d="M12 2.5a7 7 0 0 0-7 7c0 5 7 12 7 12s7-7 7-12a7 7 0 0 0-7-7Z"/><circle cx="12" cy="9.5" r="2.6"/>`),
    bolt: svg(`<path${SOFT} d="M13.6 2.2 4.6 13.2a.9.9 0 0 0 .7 1.5H10l-.9 6.1a.5.5 0 0 0 .9.4l9-11a.9.9 0 0 0-.7-1.5H14l.9-6.1a.5.5 0 0 0-.9-.4Z"/><path d="M13.6 2.2l-3.1 7.3h5.6L9.1 21.2l.9-6.5H5.3Z"/>`),
    sword: svg(`<path${SOFT} d="M20.5 3.5 21 7.6 11.3 17.3l-4.6-4.6L16.4 3Z"/><path d="M5.4 14l4.6 4.6-1.8 1.8a1 1 0 0 1-1.4 0l-3.2-3.2a1 1 0 0 1 0-1.4Z"/><path d="M3 20.9l1.4-1.4 1.1 1.1-1.4 1.4Z"/>`),
    pickaxe: svg(`<path${SOFT} d="M3.2 8.2c3.2-5 10.2-6.5 17.6-3.4a.75.75 0 0 1 .2 1.2l-2 2a.75.75 0 0 1-.7.2c-3.7-.9-7 .3-9.7 3.2a.75.75 0 0 1-1 .1L3.4 9a.75.75 0 0 1-.2-.8Z"/><path d="M11 10.3l1.9 1.9-8.2 8.2a1.35 1.35 0 0 1-1.9-1.9Z"/>`),
    gem: svg(`<path${SOFT} d="M6.3 3h11.4l4.1 5.3H2.2Z"/><path d="M2.2 9.8h19.6L12 21.5Z"/>`),
    leaf: svg(`<path${SOFT} d="M20.8 3.2c.4 6.9-2.4 12.6-9 14.2a5 5 0 0 1-6.9-5.9c1.5-6.4 8-9.5 15.9-8.3Z"/><path d="M4.2 21.4a.75.75 0 0 1-.9-1.1c2.3-4.4 5-7 9.7-9.6a.75.75 0 1 1 .7 1.3c-4.4 2.4-6.8 4.8-9 9a.75.75 0 0 1-.5.4Z"/>`),
    chart: svg(`<rect${SOFT} x="3" y="12" width="4.5" height="9" rx="1.5"/><rect x="9.75" y="3" width="4.5" height="18" rx="1.5"/><rect${SOFT} x="16.5" y="8" width="4.5" height="13" rx="1.5"/>`),
    stack: svg(`<path${SOFT} d="M12 2 2.5 7 12 12l9.5-5Z"/><path d="M2.5 11.5 12 16.5l9.5-5v2L12 18.5l-9.5-5Zm0 4.5 9.5 5 9.5-5v2L12 23l-9.5-5Z"/>`),
  });
  Object.assign(ICONS, {
    web: svg(`<circle${SOFT} cx="12" cy="12" r="9.5"/><path fill-rule="evenodd" d="M12 2.5a.75.75 0 0 1 .5.2c2.7 2.5 4.2 5.9 4.2 9.3s-1.5 6.8-4.2 9.3a.75.75 0 0 1-1 0C8.8 18.8 7.3 15.4 7.3 12s1.5-6.8 4.2-9.3a.75.75 0 0 1 .5-.2Zm0 2.1C10.3 6.5 8.8 9.1 8.8 12s1.5 5.5 3.2 7.4c1.7-1.9 3.2-4.5 3.2-7.4S13.700 6.500 12 4.600Z"/><path d="M2.5 11.25h19v1.5h-19Z"/>`),
    chat: svg(`<path${SOFT} d="M12 2.5c5.2 0 9.5 3.6 9.5 8.2s-4.3 8.2-9.5 8.2c-.9 0-1.8-.1-2.6-.3L5 20.5a.75.75 0 0 1-1.2-.7l.7-3.4C2.9 15 2.5 12.9 2.5 10.7 2.5 6.1 6.8 2.5 12 2.5Z"/><circle cx="8" cy="10.7" r="1.3"/><circle cx="12" cy="10.7" r="1.3"/><circle cx="16" cy="10.7" r="1.3"/>`),
    discord2: svg(`<path${SOFT} d="M5.5 4.5c1.8-.9 3.7-1.3 5.5-1.5l.5 1h1l.5-1c1.8.2 3.7.6 5.5 1.5 2 3 3 6.2 3.2 9.7-1.4 1.1-3 1.8-4.6 2.2l-1-1.6c.5-.2 1-.5 1.4-.8l-.3-.2c-2.800 1.300-5.900 1.300-8.700 0l-.3.200c.4.300.9.600 1.400.800l-1 1.600c-1.600-.4-3.200-1.100-4.600-2.200C2.500 10.700 3.500 7.500 5.500 4.500Z"/><ellipse cx="9" cy="11.2" rx="1.6" ry="1.9"/><ellipse cx="15" cy="11.2" rx="1.6" ry="1.9"/>`),
  });
  // a profile shows its picture (official modpack icon, import, or your upload) when it has one, else its glyph
  // any picture (webp too) -> a 128 px square PNG data URL, decoded by the page itself
  window.imgToPng = async src => { const blob = src instanceof Blob ? src : await (await fetch(src)).blob(); const bm = await createImageBitmap(blob); const side = Math.min(bm.width, bm.height); const c = document.createElement('canvas'); c.width = c.height = 128; c.getContext('2d').drawImage(bm, (bm.width - side) / 2, (bm.height - side) / 2, side, side, 0, 0, 128, 128); return c.toDataURL('image/png'); };
  window.PROFILE_IMG = new Map();
  window.profileIconHtml = p => { const u = PROFILE_IMG.get(p.id); return u ? `<img src="${u}" alt="">` : `<i data-i="${profileIcon(p)}"></i>`; };
  window.loadProfileIcons = async ids => {
    const need = ids.filter(id => !PROFILE_IMG.has(id)); if (!need.length) return; let got = {};
    try { got = await window.dexter.profileIconGet(need); } catch { got = {}; }
    let any = false; need.forEach(id => { PROFILE_IMG.set(id, got[id] || ''); if (got[id]) any = true; });
    if (any) document.dispatchEvent(new Event('dx-icons'));
  };
  icons(document.getElementById('linksMenu'));   // the Links menu was drawn before these icons existed
  // every profile gets its own icon: the one you picked, else one guessed from its name, else one from its id
  const AUTO = ['gamepad', 'bolt', 'sword', 'pickaxe', 'gem', 'leaf', 'fire', 'shield', 'crown', 'star', 'world', 'sun'];
  window.profileIcon = p => {
    const c = SET?.ui && SET.ui['icon.' + p.id]; if (c && ICONS[c]) return c; const n = (p.name || '').toLowerCase();
    if (/vanilla|survival|smp|nature/.test(n)) return 'leaf'; if (/adrenaline|fps|fast|speed|boost|perf/.test(n)) return 'bolt'; if (/pvp|practice|duel|combat|fight|bedwars/.test(n)) return 'sword';
    if (/sky|space|sun/.test(n)) return 'sun'; if (/mine|ore|cave|tech/.test(n)) return 'pickaxe'; if (/fabric|mod|pack/.test(n)) return 'gem';
    let h = 0; for (const ch of String(p.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AUTO[h % AUTO.length];
  };
  const sound = n => { try { typeof sfx === 'function' && sfx(n); } catch { /* sounds are optional */ } };
  const toastMsg = m => { try { toast(m); } catch { /* ignore */ } };

  /* ============================== Custom Texture tab ============================== */
  const CATS = ['Tools', 'Armor', 'Items', 'Blocks'];
  const SAMPLE = {
    Blocks: 'stone grass_block dirt cobblestone oak_planks spruce_planks birch_planks sand gravel gold_ore iron_ore coal_ore diamond_ore oak_log glass bricks tnt bookshelf obsidian netherrack glowstone ice snow_block clay pumpkin melon crafting_table furnace chest redstone_lamp',
    Items: 'stick coal iron_ingot gold_ingot diamond emerald apple bread golden_apple arrow bow ender_pearl blaze_rod book compass clock bucket string feather bone',
    Tools: 'wooden_sword stone_sword iron_sword diamond_sword netherite_sword iron_pickaxe diamond_pickaxe iron_axe diamond_axe iron_shovel diamond_hoe shears fishing_rod shield',
    Armor: 'iron_helmet diamond_helmet iron_chestplate diamond_chestplate iron_leggings iron_boots diamond_boots',
  };
  let ITEMS = Object.entries(SAMPLE).flatMap(([cat, s]) => s.split(' ').map(id => ({ id, k: id, cat, label: id.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) })));
  const SIZES = { small: { label: 'Small', k: 0.6 }, medium: { label: 'Medium', k: 1 }, large: { label: 'Large', k: 1.5 } };
  let N = 16, H = 16;

  // placeholder art, drawn from the name (SAMPLE ART: the dev team swaps in the real texture from the player's own game files)
  const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  function baseColor(id) {
    const m = [['diamond', [90, 220, 215]], ['gold', [240, 200, 70]], ['iron', [205, 205, 210]], ['netherite', [80, 70, 80]], ['emerald', [70, 200, 110]], ['coal', [50, 50, 55]], ['stone', [125, 125, 128]], ['cobble', [115, 115, 118]], ['oak', [165, 130, 80]], ['spruce', [110, 80, 50]], ['birch', [205, 190, 140]], ['wood', [165, 130, 80]], ['grass', [95, 160, 70]], ['dirt', [130, 95, 65]], ['sand', [225, 210, 150]], ['gravel', [140, 135, 135]], ['obsidian', [30, 20, 50]], ['netherrack', [120, 50, 50]], ['glowstone', [240, 210, 120]], ['ice', [150, 200, 240]], ['snow', [240, 245, 250]], ['clay', [160, 165, 180]], ['pumpkin', [215, 130, 30]], ['melon', [120, 170, 60]], ['tnt', [200, 60, 55]], ['apple', [200, 50, 50]], ['bread', [200, 150, 80]], ['blaze', [240, 170, 40]], ['ender', [30, 110, 100]], ['bone', [230, 230, 220]], ['feather', [240, 240, 240]], ['string', [235, 235, 235]], ['redstone', [190, 40, 40]], ['glass', [190, 225, 240]], ['brick', [160, 80, 65]]].find(([k]) => id.includes(k));
    if (m) return m[1]; const r = rng(hash(id)); return [90 + r() * 120, 90 + r() * 120, 90 + r() * 120];
  }
  function makeArt(it) {
    const px = new Array(N * N).fill(null), r = rng(hash(it.id)), [R, G, B] = baseColor(it.id);
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) px[y * N + x] = c; };
    const shade = (k, j = 0) => hex(R * k + j, G * k + j, B * k + j);
    if (it.cat === 'Blocks') {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const edge = x === 0 || y === 0 || x === N - 1 || y === N - 1; set(x, y, shade(edge ? .72 : .9 + r() * .25)); }
    } else if (it.cat === 'Armor') {
      for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) { const hole = y < 6 && x > 5 && x < 10; if (!hole && (y > 3 || (x > 3 && x < 12))) set(x, y, shade(.85 + r() * .3)); }
      for (let x = 2; x < 14; x++) set(x, 13, shade(.6));
    } else if (it.cat === 'Tools') {
      for (let i = 0; i < 11; i++) { set(2 + i, 13 - i, hex(130, 90, 50)); set(3 + i, 13 - i, hex(100, 68, 36)); }
      for (let i = 0; i < 6; i++) for (let w = 0; w < 3; w++) set(8 + i - w, 8 - i + w, shade(.9 + r() * .3));
    } else {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 5.2 + r() * .6) set(x, y, shade(d > 4.2 ? .7 : .9 + r() * .3)); }
    }
    return px;
  }

  const project = store.get('dx.tex.v1', {});      // { itemId: { px:[...], size } }
  let curItem = ITEMS[0], cat = 'Tools', query = '', tool = 'pencil', color = '#8d45c7', selPix = -1, undo = [], redo = [];
  const getArt = it => project[it.k]?.px || it.px || makeArt(it);
  let px = getArt(curItem).slice(), size = project[curItem.k]?.size || 'medium';
  let saveT = 0; const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => { project[curItem.k] = { px: px.slice(), size, n: N }; store.set('dx.tex.v1', project); drawList(); }, 250); };

  // 1) nav button + page
  const nav = document.getElementById('tabs');
  const btn = document.createElement('button'); btn.dataset.go = 'textures'; btn.innerHTML = '<i data-i="texture"></i>Textures'; btn.title = 'Custom Texture';
  nav.insertBefore(btn, nav.querySelector('[data-go="clips"]'));
  ORDER.splice(ORDER.indexOf('cosmetics') + 1, 0, 'textures');
  const page = document.createElement('section'); page.className = 'page'; page.id = 'textures';
  page.innerHTML = `
    <div class="tx">
      <aside class="tx-list box">
        <div class="tx-search"><i data-i="search"></i><input id="txSearch" placeholder="Search items and blocks" maxlength="40" spellcheck="false" autocomplete="off" aria-label="Search"></div>
        <div class="tx-cats" id="txCats"></div>
        <div class="tx-count"><span id="txCount"></span><span class="tx-src" id="txSrc">Sample art</span></div>
        <div class="tx-grid" id="txGrid"></div>
      </aside>
      <section class="tx-edit box">
        <header class="tx-head">
          <div><small>Editing</small><h2 id="txName"></h2></div>
          <div class="seg" id="txSize" role="group" aria-label="Item size"></div>
          <button class="btn solid" id="txPack"><i data-i="download"></i>Create pack</button>
        </header>
        <div class="tx-main">
          <div class="tx-canvas-wrap"><canvas id="txCanvas" width="320" height="320" aria-label="Texture editor"></canvas><div class="tx-coord" id="txCoord">&nbsp;</div></div>
          <div class="tx-side">
            <div class="tx-tools" id="txTools"></div>
            <label class="tx-label">Colour</label>
            <div class="tx-color"><input type="color" id="txColor" value="#8d45c7" aria-label="Colour"><input id="txHex" maxlength="7" value="#8d45c7" spellcheck="false" aria-label="Hex colour"></div>
            <div class="tx-swatches" id="txSwatches"></div>
            <label class="tx-label">Pixel</label>
            <div class="tx-sel" id="txSel">Pick “Select pixel” and click one.</div>
            <label class="tx-label">Preview</label>
            <div class="tx-prev"><canvas id="txReal" width="16" height="16"></canvas><div class="tx-hand"><canvas id="txHandItem" width="16" height="16"></canvas></div></div>
            <div class="tx-actions"><button class="btn ghost sm" id="txReset"><i data-i="refresh"></i>Reset</button></div>
          </div>
        </div>
      </section>
    </div>`;
  document.querySelector('.pages').appendChild(page);
  icons(btn); icons(page);

  const el = id => document.getElementById(id);
  const css = (v, f = '#0000') => v || f;
  /* ---- order: families together instead of one long alphabet ---- */
  const WOODS = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry', 'pale_oak', 'bamboo', 'crimson', 'warped'];
  const WOOD_TEST = ['dark_oak', 'pale_oak', ...WOODS.filter(w => !/_oak$/.test(w))];
  const WOOD_PARTS = ['sapling', 'log', 'wood', 'planks', 'stairs', 'slab', 'fence', 'fence_gate', 'door', 'trapdoor', 'button', 'pressure_plate', 'sign', 'hanging_sign', 'boat', 'chest_boat', 'raft', 'chest_raft', 'leaves'];
  const TOOLMATS = ['wooden', 'stone', 'copper', 'iron', 'golden', 'diamond', 'netherite'];
  const TOOLS = [['sword', 'Swords'], ['pickaxe', 'Pickaxes'], ['axe', 'Axes'], ['shovel', 'Shovels'], ['hoe', 'Hoes'], ['spear', 'Spears']];
  const ARMORMATS = ['leather', 'chainmail', 'copper', 'iron', 'golden', 'diamond', 'netherite', 'turtle'];
  const PIECES = ['helmet', 'chestplate', 'leggings', 'boots'];
  const COLORS = ['white', 'light_gray', 'gray', 'black', 'brown', 'red', 'orange', 'yellow', 'lime', 'green', 'cyan', 'light_blue', 'blue', 'purple', 'magenta', 'pink'];
  const COLOR_TEST = [...COLORS].sort((a, b) => b.length - a.length);
  const DYED = ['wool', 'carpet', 'concrete_powder', 'concrete', 'terracotta', 'glazed_terracotta', 'stained_glass_pane', 'stained_glass', 'bed', 'banner', 'shulker_box', 'candle', 'dye', 'harness'];
  const MATS = ['coal', 'copper', 'iron', 'gold', 'redstone', 'lapis', 'diamond', 'emerald', 'netherite', 'amethyst', 'quartz'];
  const cap = t => t.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  const OTHER_TOOLS = new Set(['bow', 'crossbow', 'shield', 'trident', 'fishing_rod', 'shears', 'flint_and_steel', 'mace', 'brush', 'carrot_on_a_stick', 'warped_fungus_on_a_stick', 'lead', 'spyglass', 'compass', 'clock', 'bucket', 'water_bucket', 'lava_bucket', 'milk_bucket']);
  function classify(id, cat) {
    let m;
    if ((m = /^(wooden|stone|copper|iron|golden|diamond|netherite)_(sword|pickaxe|axe|shovel|hoe|spear)$/.exec(id))) { const t = TOOLS.findIndex(x => x[0] === m[2]); return ['Tools · ' + TOOLS[t][1], 100 + t, TOOLMATS.indexOf(m[1])]; }
    if (OTHER_TOOLS.has(id)) return ['Tools · Other', 110, 0];
    if ((m = /^(leather|chainmail|copper|iron|golden|diamond|netherite|turtle)_(helmet|chestplate|leggings|boots)$/.exec(id))) return ['Armor · ' + cap(m[1]), 200 + ARMORMATS.indexOf(m[1]), PIECES.indexOf(m[2])];
    if (/_horse_armor$|_wolf_armor$|^wolf_armor$/.test(id)) return ['Armor · Animals', 215, 0];
    if (id === 'elytra') return ['Armor · Other', 216, 0];
    const bare = id.replace(/^stripped_/, '');
    for (const w of WOOD_TEST) if (new RegExp('(^|_)' + w + '(_|$)').test(bare)) { const rest = bare.replace(new RegExp('^' + w + '_?'), '').replace(/_?top$|_?side$|_?bottom$/, '') || 'log'; const p = WOOD_PARTS.findIndex(x => rest === x || rest.startsWith(x + '_')); return ['Wood · ' + cap(w), 300 + WOODS.indexOf(w), (id.startsWith('stripped_') ? 0.5 : 0) + (p < 0 ? 50 : p)]; }
    for (const c of COLOR_TEST) { if (id.startsWith(c + '_')) { const rest = id.slice(c.length + 1); const d = DYED.findIndex(x => rest === x); if (d >= 0) return ['Colour · ' + cap(DYED[d]), 400 + d, COLORS.indexOf(c)]; } }
    if (/_spawn_egg$/.test(id)) return ['Spawn eggs', 700, 0];
    if (/^music_disc_/.test(id) || id === 'disc_fragment_5') return ['Music discs', 710, 0];
    if (/_pottery_sherd$|_smithing_template$|^armor_trim|_banner_pattern$/.test(id)) return ['Templates and sherds', 720, 0];
    if (/potion|tipped_arrow|^arrow$|^spectral_arrow$/.test(id)) return ['Potions and arrows', 730, 0];
    const first = id.split('_')[0], mat = MATS.findIndex(x => x === first || (first === 'golden' && x === 'gold') || (first === 'raw' && id.includes(x)) || (first === 'deepslate' && id.includes(x)));
    if (mat >= 0 || /^(raw_(iron|gold|copper))/.test(id)) { const mm = mat >= 0 ? mat : MATS.findIndex(x => id.includes(x)); if (mm >= 0) return ['Materials · ' + cap(MATS[mm]), 500 + mm, 0]; }
    return ['', 0, 0];
  }
  function organise(items) {
    const count = {}; items.forEach(it => { const f = it.id.split('_')[0]; count[f] = (count[f] || 0) + 1; });
    items.forEach(it => {
      let [g, gi, oi] = classify(it.id, it.cat);
      if (!g) { const f = it.id.split('_')[0]; if (count[f] >= 6 && !/^(the|a)$/.test(f)) { g = cap(f); gi = 600 + (f.charCodeAt(0) - 96) / 30; } else { g = it.cat === 'Blocks' ? 'Other blocks' : 'Other items'; gi = it.cat === 'Blocks' ? 901 : 900; } }
      it.g = g; it.gi = gi; it.oi = oi;
    });
    return items.sort((a, b) => a.gi - b.gi || (a.g < b.g ? -1 : a.g > b.g ? 1 : 0) || a.oi - b.oi || a.id.localeCompare(b.id));
  }
  let listAll = [], shownN = 0;
  const rowHtml = it => `<button class="tx-item${it.k === curItem.k ? ' on' : ''}" data-tx="${it.k}" title="${it.label}">${it.png ? `<span class="tx-ico${it.tall ? ' tall' : ''}" style="background-image:url(data:image/png;base64,${it.png})"></span>` : `<canvas width="16" height="16" data-ic="${it.k}"></canvas>`}<span>${it.label}</span>${project[it.k] ? '<i class="tx-dot" title="Edited"></i>' : ''}</button>`;
  let gcount = {};
  const rowsFrom = (from, to) => { let prev = from > 0 ? listAll[from - 1].g : null, out = ''; for (const it of listAll.slice(from, to)) { if (it.g && it.g !== prev) out += `<div class="tx-sec">${esc(it.g)}<span>${gcount[it.g]}</span></div>`; prev = it.g; out += rowHtml(it); } return out; };
  function drawList() {
    const q = query.trim().toLowerCase().replace(/ /g, '_');
    listAll = ITEMS.filter(it => (q ? it.id.includes(q) : it.cat === cat));
    gcount = {}; listAll.forEach(it => { gcount[it.g] = (gcount[it.g] || 0) + 1; });
    shownN = Math.min(listAll.length, 300);
    el('txCount').textContent = listAll.length ? `${listAll.length.toLocaleString()} ${listAll.length === 1 ? 'result' : 'results'}` : 'Nothing found';
    el('txGrid').innerHTML = rowsFrom(0, shownN) || '<div class="tx-empty">No match.</div>';
    paintCanvases();
  }
  function paintCanvases() { el('txGrid').querySelectorAll('canvas[data-ic]').forEach(c => { const it = ITEMS.find(i => i.k === c.dataset.ic); if (it) paintSmall(c, getArt(it), project[it.k]?.n || it.n); }); }
  el('txGrid').addEventListener('scroll', e => { const g = e.target; if (shownN < listAll.length && g.scrollTop + g.clientHeight > g.scrollHeight - 400) { g.insertAdjacentHTML('beforeend', rowsFrom(shownN, shownN + 300)); shownN = Math.min(listAll.length, shownN + 300); paintCanvases(); } });
  // the real pictures: read from the player's own Minecraft files by the shell (nothing from Mojang ships with Dexter)
  const decode = it => new Promise(res => {
    if (it.px || !it.png) return res();
    const img = new Image();
    img.onload = () => { const w = img.naturalWidth, h = it.tall ? img.naturalHeight : w, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data, a = [];
      for (let i = 0; i < w * h; i++) { const al = d[i * 4 + 3]; a.push(al < 16 ? null : '#' + [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]].map(v => v.toString(16).padStart(2, '0')).join('') + (al < 255 ? al.toString(16).padStart(2, '0') : '')); }
      it.px = a; it.n = w; res(); };
    img.onerror = () => res(); img.src = 'data:image/png;base64,' + it.png;
  });
  const kind = (id, c) => c === 'block' ? 'Blocks' : /_(helmet|chestplate|leggings|boots)$|^(elytra|turtle_helmet)$/.test(id) ? 'Armor' : /_(sword|pickaxe|axe|shovel|hoe|spear)$|^(bow|crossbow|shield|trident|fishing_rod|shears|flint_and_steel|mace|brush|carrot_on_a_stick|warped_fungus_on_a_stick)$/.test(id) ? 'Tools' : 'Items';
  /* ---- fix-ups of the raw pictures ---- */
  const loadImg = b64 => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = 'data:image/png;base64,' + b64; });
  const LEATHER = [0xA0, 0x65, 0x40];                 // the colour the game gives undyed leather armor
  async function prepare(items) {
    const by = new Map(items.map(t => [t.cat + '/' + t.id, t])), drop = new Set(), add = [];
    // 1) a door is one piece (its top half above its bottom half), not two files
    for (const t of items) {
      if (t.cat !== 'block' || !/_door_top$/.test(t.id)) continue;
      const base = t.id.replace(/_top$/, ''), b = by.get('block/' + base + '_bottom'); if (!b) continue;
      const [ti, bi] = await Promise.all([loadImg(t.png), loadImg(b.png)]); if (!ti || !bi) continue;
      const w = ti.naturalWidth, c = document.createElement('canvas'); c.width = w; c.height = w * 2; const x = c.getContext('2d'); x.drawImage(ti, 0, 0, w, w, 0, 0, w, w); x.drawImage(bi, 0, 0, w, w, 0, w, w, w);
      add.push({ id: base, cat: 'block', png: c.toDataURL('image/png').split(',')[1], tall: true, label: cap(base) + ' (full door)' }); drop.add('block/' + t.id); drop.add('block/' + b.id);
    }
    // 2) leather armor: the game tints the grey base with leather brown and lays the overlay on top
    for (const t of items) {
      if (t.cat !== 'item' || !/^leather_(helmet|chestplate|leggings|boots|horse_armor)$/.test(t.id)) continue;
      const o = by.get('item/' + t.id + '_overlay'), bi = await loadImg(t.png); if (!bi) continue;
      const w = bi.naturalWidth, c = document.createElement('canvas'); c.width = c.height = w; const x = c.getContext('2d'); x.drawImage(bi, 0, 0);
      const d = x.getImageData(0, 0, w, w), p = d.data; for (let i = 0; i < p.length; i += 4) { p[i] = p[i] * LEATHER[0] / 255; p[i + 1] = p[i + 1] * LEATHER[1] / 255; p[i + 2] = p[i + 2] * LEATHER[2] / 255; }
      x.putImageData(d, 0, 0); if (o) { const oi = await loadImg(o.png); if (oi) x.drawImage(oi, 0, 0); drop.add('item/' + o.id); }
      t.png = c.toDataURL('image/png').split(',')[1];
    }
    return items.filter(t => !drop.has(t.cat + '/' + t.id)).concat(add);
  }
  let loaded = false;
  async function loadReal() {
    if (loaded) return; loaded = true;
    const note = el('txSrc');
    try {
      const r = await window.dexter?.textureIndex?.();
      if (!r || r.error) { note.textContent = (r && r.error) || 'Example items only.'; note.className = 'tx-src warn'; return; }
      const raw = await prepare(r.items);
      ITEMS = organise(raw.map(t => ({ id: t.id, k: t.cat + '/' + t.id, cat: kind(t.id, t.cat), png: t.png, tall: !!t.tall, label: t.label || t.id.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) })));
      note.textContent = `From your Minecraft ${r.version}`; note.className = 'tx-src';
      curItem = ITEMS.find(i => i.id === 'diamond_sword') || ITEMS[0]; drawList(); pickItem(curItem);
    } catch { note.textContent = 'Could not read the Minecraft files.'; note.className = 'tx-src warn'; }
  }
  function paintSmall(c, arr, w) { w = w || Math.round(Math.sqrt(arr.length)) || 16; const h = Math.round(arr.length / w); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } const x = c.getContext('2d'); x.clearRect(0, 0, w, h); arr.forEach((v, i) => { if (v) { x.fillStyle = v; x.fillRect(i % w, (i / w) | 0, 1, 1); } }); }
  function drawEditor() {
    const c = el('txCanvas'), x = c.getContext('2d'), S = 320 / Math.max(N, H);
    c.width = S * N; c.height = S * H; x.clearRect(0, 0, c.width, c.height);
    for (let i = 0; i < N * H; i++) { const gx = i % N, gy = (i / N) | 0; x.fillStyle = (gx + gy) % 2 ? '#1c1c20' : '#16161a'; x.fillRect(gx * S, gy * S, S, S); if (px[i]) { x.fillStyle = px[i]; x.fillRect(gx * S, gy * S, S, S); } }
    x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 1; x.beginPath();
    for (let i = 1; i < N; i++) { x.moveTo(i * S + .5, 0); x.lineTo(i * S + .5, c.height); } for (let j = 1; j < H; j++) { x.moveTo(0, j * S + .5); x.lineTo(c.width, j * S + .5); } x.stroke();
    if (selPix >= 0) { x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect((selPix % N) * S + 1, ((selPix / N) | 0) * S + 1, S - 2, S - 2); }
    paintSmall(el('txReal'), px, N); paintSmall(el('txHandItem'), px, N);
    el('txHandItem').parentElement.style.setProperty('--k', SIZES[size].k);
  }
  async function pickItem(it) {
    await decode(it); curItem = it; N = project[it.k]?.n || it.n || 16; px = getArt(it).slice(); H = Math.round(px.length / N) || N; size = project[it.k]?.size || 'medium'; undo = []; redo = []; selPix = -1;
    el('txName').textContent = it.label; drawSizes(); drawEditor(); drawList(); drawSel();
  }
  function drawSizes() { el('txSize').innerHTML = Object.entries(SIZES).map(([k, s]) => `<button data-size="${k}" class="${k === size ? 'on' : ''}">${s.label}</button>`).join(''); }
  function drawTools() {
    el('txTools').innerHTML = [['pencil', 'pencil', 'Paint'], ['select', 'select', 'Select pixel'], ['eraser', 'eraser', 'Erase'], ['pick', 'pick', 'Pick colour'], ['fill', 'fill', 'Fill']].map(([k, i, t]) => `<button data-tool="${k}" class="${k === tool ? 'on' : ''}" title="${t}" aria-label="${t}"><i data-i="${i}"></i></button>`).join('') + '<span class="tx-sp"></span><button data-txact="undo" title="Undo" aria-label="Undo"><i data-i="undo"></i></button><button data-txact="redo" title="Redo" aria-label="Redo"><i data-i="redo"></i></button>';
    icons(el('txTools'));
  }
  const palette = ['#8d45c7', '#ffffff', '#c8c8cc', '#6c707a', '#1c1c20', '#e5484d', '#f0a040', '#f0c869', '#4ade80', '#5ad8d3', '#4a90e2', '#b892ff', '#a5824f', '#6e4b2a'];
  const recent = store.get('dx.tex.recent', []);
  function drawSwatches() { el('txSwatches').innerHTML = [...new Set([...recent, ...palette])].slice(0, 14).map(c => `<button style="background:${c}" data-sw="${c}" title="${c}" aria-label="${c}"></button>`).join(''); }
  function drawSel() { const s = el('txSel'); if (selPix < 0) { s.textContent = 'Pick “Select pixel” and click one.'; return; } const v = px[selPix]; s.innerHTML = `<b>x ${selPix % N}, y ${(selPix / N) | 0}</b> <span style="background:${css(v, 'transparent')}" class="tx-chip"></span> ${v || 'empty'}<br><small>Change the colour to repaint it.</small>`; }
  function setColor(c, fromPicker) {
    if (!/^#[0-9a-f]{6}$/i.test(c)) return; color = c.toLowerCase(); el('txColor').value = color; if (!fromPicker || true) el('txHex').value = color;
    if (tool === 'select' && selPix >= 0) { snap(); px[selPix] = color; drawEditor(); drawSel(); persist(); }
  }
  const snap = () => { undo.push(px.slice()); if (undo.length > 60) undo.shift(); redo = []; };
  const rememberColor = () => { const i = recent.indexOf(color); if (i >= 0) recent.splice(i, 1); recent.unshift(color); recent.length = Math.min(recent.length, 6); store.set('dx.tex.recent', recent); drawSwatches(); };
  function floodFill(i0, to) {
    const from = px[i0]; if (from === to) return; const st = [i0];
    while (st.length) { const i = st.pop(); if (px[i] !== from) continue; px[i] = to; const x = i % N, y = (i / N) | 0; if (x > 0) st.push(i - 1); if (x < N - 1) st.push(i + 1); if (y > 0) st.push(i - N); if (y < H - 1) st.push(i + N); }
  }
  function cellAt(e) { const r = el('txCanvas').getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * N), y = Math.floor((e.clientY - r.top) / r.height * H); return x < 0 || y < 0 || x >= N || y >= H ? -1 : y * N + x; }
  let down = false, last = -1;
  function apply(i, first) {
    if (i < 0) return;
    if (tool === 'select') { selPix = i; if (px[i]) { color = px[i]; el('txColor').value = color; el('txHex').value = color; } drawEditor(); drawSel(); return; }
    if (tool === 'pick') { if (px[i]) { setColor(px[i]); tool = 'pencil'; drawTools(); } return; }
    if (i === last && !first) return; last = i;
    if (first) snap();
    if (tool === 'fill') { floodFill(i, color); rememberColor(); } else if (tool === 'eraser') px[i] = null; else { px[i] = color; if (first) rememberColor(); }
    sound('pixel'); drawEditor(); persist();
  }
  const cv = el('txCanvas');
  cv.addEventListener('pointerdown', e => { down = true; last = -1; cv.setPointerCapture(e.pointerId); apply(cellAt(e), true); });
  cv.addEventListener('pointermove', e => { const i = cellAt(e); el('txCoord').textContent = i < 0 ? ' ' : `x ${i % N}, y ${(i / N) | 0}`; if (down && (tool === 'pencil' || tool === 'eraser')) apply(i, false); });
  cv.addEventListener('pointerup', () => { down = false; }); cv.addEventListener('pointerleave', () => { el('txCoord').innerHTML = '&nbsp;'; });

  el('txSearch').addEventListener('input', e => { query = e.target.value; drawList(); });       // instant: no Enter needed
  el('txCats').innerHTML = CATS.map(c => `<button data-cat="${c}" class="${c === cat ? 'on' : ''}">${c}</button>`).join('');
  el('txCats').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; el('txCats').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); drawList(); });
  el('txGrid').addEventListener('click', e => { const b = e.target.closest('[data-tx]'); if (b) pickItem(ITEMS.find(i => i.k === b.dataset.tx)); });
  el('txSize').addEventListener('click', e => { const b = e.target.closest('[data-size]'); if (!b) return; size = b.dataset.size; drawSizes(); drawEditor(); persist(); });
  el('txTools').addEventListener('click', e => {
    const t = e.target.closest('[data-tool]'), a = e.target.closest('[data-txact]');
    if (t) { tool = t.dataset.tool; drawTools(); }
    if (a) { if (a.dataset.txact === 'undo' && undo.length) { redo.push(px.slice()); px = undo.pop(); } else if (a.dataset.txact === 'redo' && redo.length) { undo.push(px.slice()); px = redo.pop(); } else return; drawEditor(); drawSel(); persist(); }
  });
  el('txColor').addEventListener('input', e => setColor(e.target.value, true));
  el('txHex').addEventListener('input', e => { let v = e.target.value.trim(); if (v[0] !== '#') v = '#' + v; setColor(v); });
  el('txSwatches').addEventListener('click', e => { const b = e.target.closest('[data-sw]'); if (b) setColor(b.dataset.sw); });
  el('txReset').addEventListener('click', () => { delete project[curItem.k]; store.set('dx.tex.v1', project); pickItem(curItem); toastMsg('Texture reset'); });
  document.addEventListener('keydown', e => { if (current !== 'textures' || e.target.matches('input')) return; if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); (e.shiftKey ? el('txTools').querySelector('[data-txact=redo]') : el('txTools').querySelector('[data-txact=undo]')).click(); } });

  // Create pack: the sheet is real UI; writing the resource pack to disk is the dev team's hook (TextureAPI.exportPack)
  window.TextureAPI = window.TextureAPI || { exportPack: null };
  el('txPack').addEventListener('click', () => {
    const edited = Object.keys(project);
    sound('open');
    const d = document.createElement('div'); d.className = 'v2-sheet'; d.innerHTML = `<div class="v2-card"><h3>Create pack</h3>
      <p class="muted">${edited.length ? `${edited.length} edited ${edited.length === 1 ? 'texture' : 'textures'} will go in your pack.` : 'Edit at least one texture first.'}</p>
      <input id="txPackName" value="My Dexter pack" maxlength="40" aria-label="Pack name" spellcheck="false">
      <div class="v2-actions"><button class="btn ghost" data-x>Cancel</button><button class="btn solid" data-ok ${edited.length ? '' : 'disabled'}>Create</button></div></div>`;
    document.body.appendChild(d); d.querySelector('input').select();
    const close = () => { d.remove(); sound('close'); };
    d.addEventListener('click', async e => {
      if (e.target === d || e.target.closest('[data-x]')) return close();
      if (e.target.closest('[data-ok]')) {
        const name = d.querySelector('input').value.trim() || 'My Dexter pack';
        if (typeof window.TextureAPI.exportPack === 'function') { try { await window.TextureAPI.exportPack({ name, items: project }); sound('success'); toastMsg('Pack created'); } catch (err) { sound('error'); toastMsg('Could not create the pack'); } }
        else { sound('error'); toastMsg('Export is not connected yet (preview)'); }
        close();
      }
    });
  });

  // the real list is loaded once, quietly in the background shortly after start (and on first open): the tab never shows the example items first
  let realP = null, realDone = false, inited = false;
  const ensureReal = () => realP || (realP = loadReal().finally(() => { realDone = true; }));
  PAGE_LOAD.textures = async () => {
    if (inited) return; inited = true; drawTools(); drawSwatches();
    if (!realDone) el('txGrid').innerHTML = '<div class="tx-empty">Loading textures…</div>';
    await ensureReal();
    if (!el('txGrid').querySelector('.tx-item')) { drawList(); pickItem(curItem); }       // no Minecraft files found: the example items
  };
  setTimeout(() => { ensureReal(); }, 4500);

  /* ============================== Home background (picture or GIF, up to 5 MB) ============================== */
  const MAX_BG = 5 * 1024 * 1024;
  function sniff(b) {                       // magic bytes, not the file name
    const s = String.fromCharCode(...b.slice(0, 12));
    if (s.startsWith('GIF87a') || s.startsWith('GIF89a')) return 'gif';
    if (b[0] === 0x89 && s.slice(1, 4) === 'PNG') return 'png';
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
    if (s.startsWith('RIFF') && s.slice(8, 12) === 'WEBP') return 'webp';
    return '';
  }
  const idb = () => new Promise((res, rej) => { const r = indexedDB.open('dexter-v2', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const idbGet = async k => { try { const db = await idb(); return await new Promise(res => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); } catch { return null; } };
  const idbSet = async (k, v) => { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); v == null ? t.objectStore('kv').delete(k) : t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); };

  const hero = el('hero'); const ubg = document.createElement('div'); ubg.className = 'user-bg'; ubg.hidden = true;
  ubg.innerHTML = '<img alt=""><canvas></canvas>'; hero.insertBefore(ubg, hero.firstChild);
  let bgUrl = '', bgType = '';
  function animate() {                      // a GIF only moves while Home is showing and the window has focus: ~0% CPU otherwise
    if (bgType !== 'gif') return;
    const live = document.hasFocus() && !document.hidden && current === 'home' && !(window.PERF && !PERF.awake());
    const img = ubg.querySelector('img'), c = ubg.querySelector('canvas');
    img.style.visibility = live ? 'visible' : 'hidden'; c.style.visibility = live ? 'hidden' : 'visible';
    if (live) { if (img.src !== bgUrl) img.src = bgUrl; } else { try { img.removeAttribute('src'); } catch { /* ignore */ } }
  }
  function applyBg(blob, type) {
    if (bgUrl) URL.revokeObjectURL(bgUrl);
    if (!blob) { ubg.hidden = true; hero.classList.remove('has-bg'); bgUrl = ''; bgType = ''; return; }
    bgUrl = URL.createObjectURL(blob); bgType = type;
    const img = ubg.querySelector('img'), c = ubg.querySelector('canvas');
    img.onload = () => { c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); animate(); };
    img.src = bgUrl; ubg.hidden = true; window.applyHomeMode?.();       // homebg.js decides whether it is shown (mode: My picture)
  }
  window.bgLayer = { url: () => bgUrl, has: () => !!bgUrl, show: on => { ubg.hidden = !(on && bgUrl); hero.classList.toggle('has-bg', !!(on && bgUrl)); animate(); } };
  ['focus', 'blur'].forEach(ev => addEventListener(ev, () => setTimeout(animate, 30)));
  document.addEventListener('visibilitychange', animate);
  new MutationObserver(animate).observe(el('home'), { attributes: true, attributeFilter: ['class'] });
  idbGet('homeBg').then(v => { if (v && v.blob) applyBg(v.blob, v.type); });

  // Settings > Launcher: the row
  const grp = document.querySelector('.sec[data-sec="launcher"] .set-group');
  const row = document.createElement('div'); row.className = 'set'; row.id = 'bgRow';
  row.innerHTML = '<span class="si"><i data-i="image"></i></span><b>Home background<small id="bgNote">Picture or GIF, up to 5 MB</small></b><div class="set-btns"><button class="btn ghost sm" id="bgPick">Choose</button><button class="btn ghost sm" id="bgClear" hidden>Reset</button></div>';
  grp.insertBefore(row, grp.firstChild); icons(row);
  const note = m => { el('bgNote').textContent = m; };
  idbGet('homeBg').then(v => { if (v) { el('bgClear').hidden = false; note(v.name || 'Custom background'); } });
  try { VSET.push(['launcher', 'sun', 'Background glow', 'ui:glow', 'toggle', null, 'The Home picture lights every tab.']); } catch { /* settings table not ready */ }
  // Settings > Launcher: how loud the launcher sounds are
  const vol = document.createElement('div'); vol.className = 'set'; vol.id = 'sndRow';
  vol.innerHTML = '<span class="si"><i data-i="voice"></i></span><b>Sound volume<small>Clicks, tabs and the start chime</small></b><div class="ram"><input type="range" id="sndVol" min="0" max="100"><span id="sndVolV"></span></div>';
  grp.insertBefore(vol, row.nextSibling); icons(vol);
  const sv0 = () => +(SET?.ui?.sndvol ?? 70); const showVol = n => { el('sndVol').value = n; el('sndVolV').textContent = n + '%'; };
  showVol(70); const sw = setInterval(() => { if (typeof SET !== 'undefined' && SET && SET.ui) { clearInterval(sw); showVol(sv0()); } }, 150);
  el('sndVol').addEventListener('input', e => { el('sndVolV').textContent = e.target.value + '%'; });
  el('sndVol').addEventListener('change', async e => { await uiSet('sndvol', e.target.value); sound('select'); });
  el('bgPick').addEventListener('click', () => {
    const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/png,image/jpeg,image/webp,image/gif';
    f.onchange = async () => {
      const file = f.files[0]; if (!file) return;
      if (file.size > MAX_BG) { sound('error'); note('Too big. The limit is 5 MB.'); return; }
      const type = sniff(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
      if (!type) { sound('error'); note('Use a PNG, JPG, WebP or GIF.'); return; }
      try { await idbSet('homeBg', { blob: file, type, name: file.name.slice(0, 40) }); } catch { sound('error'); note('Could not save it.'); return; }
      applyBg(file, type); el('bgClear').hidden = false; note(file.name.slice(0, 40)); sound('success'); uiSet('home.mode', 'custom').then(() => window.applyHomeMode?.());
    };
    f.click();
  });
  el('bgClear').addEventListener('click', async () => { await idbSet('homeBg', null); applyBg(null); el('bgClear').hidden = true; note('Picture or GIF, up to 5 MB'); sound('close'); uiSet('home.mode', 'rotate').then(() => window.applyHomeMode?.()); });

  /* ============================== Friends + voice groups (PREVIEW data) ============================== */
  const fl = el('frList'); let frTab = 'friends', addOpen = false, addErr = '';
  const av = n => `<div class="av"><img src="${head(n)}" alt=""></div>`;
  function friendRow(f) {
    const status = !f.online ? '<span class="where">Offline</span>' : f.closeToMe && f.server && f.server !== 'in game' ? `<span class="where on"><i data-i="pin"></i>${esc(f.server)}${f.mode ? ' · ' + esc(f.mode) : ''}</span>` : '<span class="where on">Online</span>';
    const act = f.online && f.closeToMe && f.server && f.server !== 'in game' ? `<button class="join" data-fjoin="${esc(f.name)}">Join</button>` : '';
    return `<div class="fr ${f.online ? '' : 'off'}"><div class="av" style="--st:${f.online ? 'var(--ok)' : '#525252'}"><img src="${head(f.name)}" alt=""></div><div class="t"><b>${esc(f.name)}</b>${status}</div>${act}<button class="ib sm star${f.iClose ? ' on' : ''}" data-fclose="${esc(f.name)}" title="${f.iClose ? 'Close friend: they can join you' : 'Make close friend'}" aria-label="Close friend"><i data-i="star"></i></button></div>`;
  }
  function drawFriends() {
    const s = Social.snapshot(), on = s.friends.filter(f => f.online), off = s.friends.filter(f => !f.online);
    const close = on.filter(f => f.iClose), rest = on.filter(f => !f.iClose);
    return `${addOpen ? `<form class="fr-add" id="frAdd" autocomplete="off"><input name="n" placeholder="Player name" maxlength="16" spellcheck="false" aria-label="Player name"><button class="btn solid sm" type="submit">Add</button><span class="fr-err">${esc(addErr)}</span></form>` : ''}
      ${close.length ? `<div class="sp-label">Close friends</div>${close.map(friendRow).join('')}` : ''}
      ${rest.length ? `<div class="sp-label">Online · ${rest.length}</div>${rest.map(friendRow).join('')}` : ''}
      ${off.length ? `<div class="sp-label">Offline · ${off.length}</div>${off.map(friendRow).join('')}` : ''}
      <p class="fr-hint">The star makes someone a close friend. They see your server and can join it.</p>`;
  }
  function drawVoice() {
    const s = Social.snapshot(), me = (typeof AC !== 'undefined' && AC.list[AC.active]?.name) || 'You';
    const state = s.deafened ? 'Deafened' : s.muted ? 'Muted' : 'Mic on';
    return `<div class="vc-you"><div class="vc-who"><div class="av"><img src="${head(me)}" alt=""></div><div class="t"><b>${esc(me)}</b><span class="${s.muted || s.deafened ? 'off' : 'on'}">${state}</span></div></div>
        <div class="vc-btns"><button class="vc-btn ${s.muted ? 'on' : ''}" data-vc="mute" aria-pressed="${s.muted}"><i data-i="${s.muted ? 'micoff' : 'mic'}"></i><span>${s.muted ? 'Unmute' : 'Mute'}</span></button><button class="vc-btn ${s.deafened ? 'on' : ''}" data-vc="deaf" aria-pressed="${s.deafened}"><i data-i="headset"></i><span>${s.deafened ? 'Undeafen' : 'Deafen'}</span></button></div>
        <p class="vc-note">${s.inGame ? 'You are in game. Use the in-game menu to join a group.' : 'Join a group here while you are not in game.'}</p></div>
      <div class="sp-label">Voice groups</div>
      <form class="fr-add" id="vcNew" autocomplete="off"><input name="n" placeholder="Name a new group" maxlength="24" spellcheck="false" aria-label="Group name"><button class="btn solid sm" type="submit"><i data-i="plus"></i>Create</button><span class="fr-err">${esc(addErr)}</span></form>
      ${s.groups.map(g => { const names = g.members.concat(g.live.includes('You') ? [me] : []); const live = g.live.map(n => n === 'You' ? me : n);
        return `<div class="vg2 ${g.joined ? 'on' : ''}"><div class="vg2-h"><div class="vg2-ico${live.length ? ' live' : ''}"><i data-i="voice"></i></div><div class="t"><b>${esc(g.name)}</b><span>${live.length ? live.length + ' talking' : 'Quiet'} · ${names.length} ${names.length === 1 ? 'member' : 'members'}</span></div></div>
          <div class="vg2-m">${names.length ? names.slice(0, 7).map(n => `<span class="vg2-av${live.includes(n) ? ' live' : ''}" title="${esc(n)}"><img src="${head(n)}" alt=""></span>`).join('') + (names.length > 7 ? `<span class="vg2-more">+${names.length - 7}</span>` : '') : '<span class="muted">Empty. Invite friends first.</span>'}</div>
          ${g.joined ? `<button class="btn ghost sm vg2-b leave" data-vleave="${g.id}"><i data-i="logout"></i>Leave group</button>` : `<button class="btn solid sm vg2-b" data-vjoin="${g.id}" ${s.inGame ? 'disabled' : ''}><i data-i="voice"></i>Join group</button>`}</div>`; }).join('')}`;
  }
  function drawSocial() {
    fl.innerHTML = `${Social.mock ? '<div class="preview-tag"><i data-i="danger"></i>Preview data</div>' : ''}
      <div class="seg wide" id="frSeg"><button data-frtab="friends" class="${frTab === 'friends' ? 'on' : ''}">Friends</button><button data-frtab="voice" class="${frTab === 'voice' ? 'on' : ''}">Voice</button></div>
      ${frTab === 'friends' ? drawFriends() : drawVoice()}`;
    icons(fl);
  }
  drawSocial(); Social.on(drawSocial);
  fl.addEventListener('click', async e => {
    const t = e.target.closest('[data-frtab]'); if (t) { frTab = t.dataset.frtab; addErr = ''; return drawSocial(); }
    const c = e.target.closest('[data-fclose]'); if (c) { await Social.toggleClose(c.dataset.fclose); return sound('toggle_on'); }
    const j = e.target.closest('[data-fjoin]'); if (j) { const r = await Social.joinFriend(j.dataset.fjoin); sound(r.ok ? 'launch' : 'error'); return toastMsg(r.ok ? `Preview: would join ${r.address}` : r.error); }
    const vc = e.target.closest('[data-vc]'); if (vc) { vc.dataset.vc === 'mute' ? Social.setMute(!Social.snapshot().muted) : Social.setDeafen(!Social.snapshot().deafened); return sound('click'); }
    const vj = e.target.closest('[data-vjoin]'); if (vj) { const r = await Social.joinGroup(vj.dataset.vjoin); sound(r.ok ? 'join' : 'error'); if (!r.ok) toastMsg(r.error || 'Could not join'); return; }
    const vl = e.target.closest('[data-vleave]'); if (vl) { await Social.leaveGroup(vl.dataset.vleave); return sound('leave'); }
  });
  fl.addEventListener('submit', async e => {
    e.preventDefault(); const n = e.target.n.value;
    const r = e.target.id === 'frAdd' ? await Social.addFriend(n) : await Social.createGroup(n);
    addErr = r.ok ? '' : r.error || ''; if (r.ok) { addOpen = false; sound('success'); } else sound('error'); drawSocial();
  });
  el('spAdd').addEventListener('click', () => { if (el('friendView').classList.contains('on')) { frTab = 'friends'; addOpen = !addOpen; addErr = ''; drawSocial(); if (addOpen) fl.querySelector('input')?.focus(); } });
  window.dexter?.onBackend?.(ev => { if (ev.type === 'started') Social.setInGame(true); if (ev.type === 'exit' || ev.type === 'error') Social.setInGame(false); });

  /* ============================== Settings > Voice (PREVIEW: controls + range picture, no audio) ============================== */
  const vnav = document.createElement('button'); vnav.dataset.sec = 'voice'; vnav.innerHTML = '<i data-i="mic"></i>Voice';
  el('setNav').insertBefore(vnav, el('setNav').querySelector('[data-sec="privacy"]'));
  const vs = store.get('dx.voice.v1', { on: true, mic: 'default', ptt: false, key: 'V', vin: 80, vout: 100 });
  const vsec = document.createElement('section'); vsec.className = 'sec'; vsec.dataset.sec = 'voice';
  vsec.innerHTML = `<h3>Voice chat</h3><p class="muted vc-lead">Talk to other Dexter players near you on the same server. Up to 20 blocks, in 3D.</p>
    <div class="set-group">
      <div class="set"><span class="si"><i data-i="mic"></i></span><b>Voice chat</b><label class="tg"><input type="checkbox" id="vcOn"><span></span></label></div>
      <div class="set"><span class="si"><i data-i="gamepad"></i></span><b>Push to talk<small>Hold a key to speak</small></b><label class="tg"><input type="checkbox" id="vcPtt"><span></span></label></div>
      <div class="set"><span class="si"><i data-i="settings"></i></span><b>Talk key</b><button class="select" id="vcKey"></button></div>
      <div class="set"><span class="si"><i data-i="mic"></i></span><b>Microphone</b><select class="select" id="vcMic"><option value="default">Default</option></select></div>
      <div class="set"><span class="si"><i data-i="mic"></i></span><b>Mic volume</b><div class="ram"><input type="range" id="vcIn" min="0" max="100"><span id="vcInV"></span></div></div>
      <div class="set"><span class="si"><i data-i="headset"></i></span><b>Voice volume</b><div class="ram"><input type="range" id="vcOut" min="0" max="100"><span id="vcOutV"></span></div></div>
      <div class="set"><span class="si"><i data-i="mic"></i></span><b>Mic test<small id="vcTestNote">Speak and watch the bar</small></b><div class="vc-meter"><i id="vcMeter"></i></div><button class="btn ghost sm" id="vcTest">Test</button></div>
    </div>
    <h3 class="vc-h">How far voices carry <span class="tag">preview</span></h3>
    <div class="vc-range" id="vcRange"></div>
    <label class="vc-slide">Distance <input type="range" id="vcDist" min="0" max="24" value="5"><b id="vcDistV"></b></label>`;
  document.querySelector('.sheet-main').insertBefore(vsec, document.querySelector('.sec[data-sec="privacy"]'));
  icons(vnav); icons(vsec);
  const saveVs = () => store.set('dx.voice.v1', vs);
  el('vcOn').checked = vs.on; el('vcPtt').checked = vs.ptt; el('vcKey').textContent = vs.key; el('vcIn').value = vs.vin; el('vcOut').value = vs.vout;
  const syncVals = () => { el('vcInV').textContent = vs.vin + '%'; el('vcOutV').textContent = vs.vout + '%'; el('vcKey').disabled = !vs.ptt; };
  syncVals();
  el('vcOn').onchange = e => { vs.on = e.target.checked; saveVs(); }; el('vcPtt').onchange = e => { vs.ptt = e.target.checked; saveVs(); syncVals(); };
  el('vcIn').oninput = e => { vs.vin = +e.target.value; saveVs(); syncVals(); }; el('vcOut').oninput = e => { vs.vout = +e.target.value; saveVs(); syncVals(); };
  el('vcKey').onclick = () => { el('vcKey').textContent = 'Press a key…'; const h = e => { e.preventDefault(); e.stopPropagation(); vs.key = e.key.length === 1 ? e.key.toUpperCase() : e.key; el('vcKey').textContent = vs.key; saveVs(); removeEventListener('keydown', h, true); }; addEventListener('keydown', h, true); };
  navigator.mediaDevices?.enumerateDevices?.().then(ds => { const m = el('vcMic'); ds.filter(d => d.kind === 'audioinput' && d.deviceId && d.deviceId !== 'default').forEach(d => m.insertAdjacentHTML('beforeend', `<option value="${esc(d.deviceId)}">${esc(d.label || 'Microphone')}</option>`)); m.value = vs.mic; }).catch(() => {});
  el('vcMic').onchange = e => { vs.mic = e.target.value; saveVs(); };
  let testStream = null, testRaf = 0;
  el('vcTest').addEventListener('click', async () => {
    if (testStream) { testStream.getTracks().forEach(t => t.stop()); testStream = null; cancelAnimationFrame(testRaf); el('vcMeter').style.width = '0'; el('vcTest').textContent = 'Test'; return; }
    try {
      testStream = await navigator.mediaDevices.getUserMedia({ audio: vs.mic !== 'default' ? { deviceId: vs.mic } : true });
      const ctx = new AudioContext(), an = ctx.createAnalyser(); an.fftSize = 256; ctx.createMediaStreamSource(testStream).connect(an); const buf = new Uint8Array(an.frequencyBinCount);
      el('vcTest').textContent = 'Stop'; el('vcTestNote').textContent = 'Speak and watch the bar';
      (function loop() { if (!testStream) { ctx.close(); return; } an.getByteTimeDomainData(buf); let m = 0; buf.forEach(v => { m = Math.max(m, Math.abs(v - 128)); }); el('vcMeter').style.width = Math.min(100, m / 90 * 100 * (vs.vin / 100)) + '%'; testRaf = requestAnimationFrame(loop); })();
    } catch { el('vcTestNote').textContent = 'No microphone access'; sound('error'); }
  });
  // range picture: you in the middle, rings at 5/10/15/20 blocks, bars with the volume at each distance
  const rings = [5, 10, 15, 20];
  el('vcRange').innerHTML = `<div class="vc-circle">${rings.slice().reverse().map(d => `<i style="--s:${d / 20};--o:${.1 + voiceGain(d) * .35}"></i>`).join('')}<span class="vc-me"></span><span class="vc-friend" id="vcFriend"></span></div>
    <div class="vc-bars">${rings.map(d => `<div><b>${d}</b><span><i style="height:${Math.round(voiceGain(d) * 100)}%"></i></span><small>${d === 5 ? 'Loud' : d === 10 ? 'Lower' : d === 15 ? 'Low' : 'Faint'}</small></div>`).join('')}</div>`;
  const dist = () => { const d = +el('vcDist').value; el('vcDistV').textContent = d > 20 ? 'Out of range' : d + ' blocks · ' + Math.round(voiceGain(d) * 100) + '%'; el('vcFriend').style.setProperty('--x', Math.min(d, 24) / 20); el('vcFriend').style.opacity = d > 20 ? .35 : 1; };
  el('vcDist').oninput = dist; dist();

  /* ============================== sounds ============================== */
  document.addEventListener('click', e => {
    if (e.target.closest('[data-settings]')) sound('open');
    else if (e.target.closest('[data-close-settings]')) sound('close');
    else if (e.target.closest('#frToggle')) sound('open');
  }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape') sound('close'); });
  document.fonts?.ready.then(moveInd);
})();
