// Electron main process for the Dexter launcher UI.
// The window is frameless. On macOS it is liquid glass: native vibrancy blurs whatever is behind the window, and the page
// lays a light grey tint over it (html.glass in src/styles.css); macOS rounds the corners. Elsewhere it stays transparent
// with the rounded corners and border drawn in CSS.
// On Windows the window is an opaque plate (no vibrancy there): the page's own near-black ground is the whole surface, the
// window is not transparent, and DWM keeps its shadows; src/styles.css clips the corners for html.win.
// Two sizes: a small card-sized window for sign-in, then the full launcher window.
const { app, BrowserWindow, ipcMain, nativeTheme, screen, shell, Tray, Menu } = require('electron');
nativeTheme.themeSource = 'dark';   // dark vibrancy: the glass is black, not grey
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const os = require('os');
const { spawn } = require('child_process');

const MAC = process.platform === 'darwin';
const WIN = process.platform === 'win32';
const SELFTEST = !!process.env.DEXTER_SELFTEST;   // dev self-test below: pages must keep painting while the window is not focused

// The launcher keeps its own data folder. Never call it plain "Dexter": that is the name (and data folder) of the Dexter desktop app.
// Lean by default: a small JS heap, no spell-checker, no GPU shader disk cache, one process fewer. (Chromium's low-end mode is NOT used: it breaks window capture.)
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-features', 'SpareRendererForSitePerProcess,CalculateNativeWinOcclusion');
// one process fewer: the network service runs inside the main process (about 40 MB less)
app.commandLine.appendSwitch('enable-features', 'NetworkServiceInProcess2');
app.setName('Dexter Client');
app.setPath('userData', path.join(app.getPath('appData'), 'Dexter Client'));
// the launcher style (glass or PvPHQ) lives in a tiny file; changing it in Settings restarts the launcher
const STYLE_FILE = path.join(app.getPath('userData'), 'ui-style.json');
let UI_STYLE = 'glass';
try { if (JSON.parse(fs.readFileSync(STYLE_FILE, 'utf8')).style === 'pvphq') UI_STYLE = 'pvphq'; } catch { /* first run: glass */ }
if (process.env.DEXTER_UI_STYLE) UI_STYLE = process.env.DEXTER_UI_STYLE === 'pvphq' ? 'pvphq' : 'glass';   // dev self-test
ipcMain.on('uiStyleSet', (_e, s) => {
  const style = s === 'pvphq' ? 'pvphq' : 'glass';
  try { fs.mkdirSync(path.dirname(STYLE_FILE), { recursive: true }); fs.writeFileSync(STYLE_FILE, JSON.stringify({ style })); } catch { return; }
  app.relaunch(); app.quit();
});

// ---- Dexter backend: accounts, profiles, game launch, installs, servers and settings are the Dexter Client launcher's own logic ----
// The Java side (DexterBackend) runs headless on 127.0.0.1 with a one-time token. This process is the only
// thing that talks to it; the page calls it through window.dexter.api() (see preload.js), never directly.
// Where Java and the backend jars are: backend/backend.json  { "java": "<path to java>", "classpath": ["<jar>", ...] }
// (written by tools/prepare-backend.sh), or the DEXTER_JAVA / DEXTER_BACKEND_CP environment variables.
let BACKEND = null;    // { port, token, proc }
function backendCommand() {
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'backend', 'backend.json'), 'utf8')); } catch { /* no packaged backend */ }
  // A native executable (env DEXTER_BACKEND_EXE or "exe" in backend.json) wins: same env, same READY line, no Java needed.
  const exe = process.env.DEXTER_BACKEND_EXE || (cfg.exe && (path.isAbsolute(cfg.exe) ? cfg.exe : path.resolve(__dirname, 'backend', cfg.exe)));
  if (exe) return { exe };
  const java = process.env.DEXTER_JAVA || (cfg.java && (path.isAbsolute(cfg.java) ? cfg.java : path.resolve(__dirname, 'backend', cfg.java)));
  const cp = process.env.DEXTER_BACKEND_CP || (cfg.classpath || []).map(p => path.resolve(__dirname, 'backend', p)).join(path.delimiter);
  // The Java main class can be renamed without touching the UI: DEXTER_BACKEND_CLASS or "mainClass" in backend.json.
  const mainClass = process.env.DEXTER_BACKEND_CLASS || cfg.mainClass || 'net.veloclient.launcher.api.DexterBackend';
  return java && cp ? { java, cp, mainClass } : null;
}
function startBackend() {
  return new Promise(resolve => {
    const cmd = backendCommand();
    if (!cmd) return resolve({ error: 'Backend not configured (run tools/prepare-backend.sh).' });
    const token = crypto.randomBytes(24).toString('hex');
    const home = process.env.DEXTER_BACKEND_HOME;   // self-test only: a throw-away home for the backend
    const env = { ...process.env, DEXTER_BACKEND_TOKEN: token };
    if (WIN && home) env.APPDATA = home;   // the backend's data folder is %APPDATA%\DexterClient on Windows (DexterPaths), not user.home
    const proc = cmd.exe ? spawn(cmd.exe, [], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
      : spawn(cmd.java, ['-Dfile.encoding=UTF-8', ...(home ? ['-Duser.home=' + home] : []), '-Xms16m', '-Xmx256m', '-XX:+UseSerialGC', '-XX:TieredStopAtLevel=1', '-XX:CICompilerCount=1', '-Xss512k', '-XX:MaxMetaspaceSize=128m', '-XX:ReservedCodeCacheSize=32m', '-XX:-UsePerfData', '-XX:MinHeapFreeRatio=10', '-XX:MaxHeapFreeRatio=20', '-cp', cmd.cp, cmd.mainClass], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });   // windowsHide: no console window flashes on Windows
    let done = false, buf = '';
    const finish = r => { if (!done) { done = true; resolve(r); } };
    proc.stdout.on('data', d => {
      buf += d;
      const m = /DEXTER_BACKEND_READY port=(\d+)/.exec(buf);
      if (m) { BACKEND = { port: +m[1], token, proc }; finish({ ok: true }); }
    });
    proc.stderr.on('data', () => { /* the backend logs to its own log file; never echo anything that could hold a token */ });
    proc.on('error', e => finish({ error: 'Could not start Java: ' + e.message }));
    proc.on('exit', code => { BACKEND = null; finish({ error: 'Backend exited (' + code + ')' }); });
    setTimeout(() => finish({ error: 'Backend did not start in time.' }), 30000);
  });
}
function backendRequest(method, p, body) {
  return new Promise(resolve => {
    if (!BACKEND) return resolve({ status: 0, data: { error: 'The launcher backend is not running.' } });
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request({ host: '127.0.0.1', port: BACKEND.port, method, path: p, headers: { 'X-Dexter-Token': BACKEND.token, ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}) } }, res => {
      let data = ''; res.setEncoding('utf8'); res.on('data', c => data += c);
      res.on('end', () => { let j = {}; try { j = JSON.parse(data || '{}'); } catch { /* not json */ } resolve({ status: res.statusCode, data: j }); });
    });
    req.on('error', e => resolve({ status: 0, data: { error: 'Backend request failed: ' + e.message } }));
    if (payload) req.write(payload);
    req.end();
  });
}
// the page may only call plain backend paths with the four verbs the backend knows
ipcMain.handle('api', (_e, method, p, body) => {
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method) || typeof p !== 'string' || !/^\/[A-Za-z0-9\/._?=&%-]*$/.test(p) || p.includes('..')) return { status: 400, data: { error: 'Bad request' } };
  return backendRequest(method, p, body);
});
// launch progress, started/exit/error: the backend's event stream, relayed to the window
let MAIN_WIN = null, relayOn = false, gameRunning = false, autoClosed = false;
// Windows has no dock: while Minecraft runs the launcher window is closed (see onBackendEvent), so a tray icon is the
// only way back. It exists only while the window is gone and disappears again when the window is back.
let TRAY = null;
function showTray() {
  if (TRAY || !WIN || !icon) return;
  try {
    TRAY = new Tray(icon);
    TRAY.setToolTip('Dexter Client');
    TRAY.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open Dexter Client', click: () => showWindow() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]));
    TRAY.on('click', () => showWindow());
  } catch (e) { TRAY = null; console.log('tray unavailable: ' + e.message); }
}
function hideTray() { if (TRAY) { try { TRAY.destroy(); } catch { /* already gone */ } TRAY = null; } }
// bring the launcher back: focus the open window, or recreate it (second launch while playing, tray click, dock click)
function showWindow() {
  if (MAIN_WIN && !MAIN_WIN.isDestroyed()) {
    if (MAIN_WIN.isMinimized()) MAIN_WIN.restore();
    MAIN_WIN.show(); MAIN_WIN.focus();
    return;
  }
  createWindow();
}
function relayEvents() {
  if (!BACKEND) return;
  relayOn = true;
  const req = http.get({ host: '127.0.0.1', port: BACKEND.port, path: '/events', headers: { 'X-Dexter-Token': BACKEND.token } }, res => {
    let buf = ''; res.setEncoding('utf8');
    res.on('data', c => { buf += c; let i; while ((i = buf.indexOf('\n\n')) >= 0) { const chunk = buf.slice(0, i); buf = buf.slice(i + 2); if (chunk.startsWith('data: ')) { try { const ev = JSON.parse(chunk.slice(6)); if (MAIN_WIN && !MAIN_WIN.isDestroyed()) MAIN_WIN.webContents.send('backend', ev); onBackendEvent(ev); } catch { /* ignore */ } } } });
  });
  let again = false; const retry = () => { if (again) return; again = true; setTimeout(relayEvents, 1500); };
  req.on('error', retry); req.on('close', retry);
}
// While Minecraft runs the launcher window is closed (its page and graphics process use ~200 MB): only a tiny background process stays.
// It comes back when the game exits or when you click the app icon. Setting "Keep launcher open while playing" keeps the window instead.
async function onBackendEvent(ev) {
  if (ev.type === 'started') {
    gameRunning = true;
    const r = await backendRequest('GET', '/settings');
    if (gameRunning && r.status === 200 && r.data.minimizeOnLaunch !== false && MAIN_WIN && !MAIN_WIN.isDestroyed()) { autoClosed = true; MAIN_WIN.close(); }
  }
  if (ev.type === 'exit' || ev.type === 'error') {
    const was = gameRunning; gameRunning = false; autoClosed = false;
    if (was && (!MAIN_WIN || MAIN_WIN.isDestroyed())) createWindow();
  }
}

const ICON_PNG = path.join(__dirname, 'assets', 'icon.png');
const ICON_ICO = path.join(__dirname, 'assets', 'icon.ico');
// Windows shows the window/tray icon from an .ico (all sizes), macOS from the .png
const icon = WIN && fs.existsSync(ICON_ICO) ? ICON_ICO : (fs.existsSync(ICON_PNG) ? ICON_PNG : undefined);

const SIZES = {
  login: { width: 480, height: 600 },
  app: { width: 1360, height: 860 },
};
const APP_MIN = { width: 1100, height: 700 };

async function createWindow() {
  const started = BACKEND ? { ok: true } : await startBackend();
  if (started.ok && process.env.DEXTER_FIX_ICONS) { console.log('ICONS ' + JSON.stringify(await fixIcons(process.env.DEXTER_FIX_ICONS))); app.quit(); return; }
  if (started.ok && process.env.DEXTER_IMPORT_ALL) { console.log('IMPORT ' + JSON.stringify(await importAll(process.env.DEXTER_IMPORT_ALL))); app.quit(); return; }
  const st = started.ok ? await backendRequest('GET', '/accounts') : null;
  const signedIn = !!(st && st.data && st.data.accounts && st.data.accounts.length > 0 && st.data.active);   // signed in already: open straight into the launcher
  const win = new BrowserWindow({
    ...(signedIn ? SIZES.app : SIZES.login),
    ...(signedIn ? { minWidth: APP_MIN.width, minHeight: APP_MIN.height, center: true } : {}),
    resizable: signedIn,
    maximizable: signedIn,
    fullscreenable: false,
    frame: false,
    ...(UI_STYLE === 'pvphq' ? (MAC ? { transparent: false, backgroundColor: '#0b0b0d', roundedCorners: true } : WIN ? { transparent: false, roundedCorners: false, backgroundColor: '#0b0b0d' } : { transparent: true })
      : MAC ? { transparent: false, vibrancy: 'hud', visualEffectState: 'active', roundedCorners: true }
      : WIN ? { transparent: false, roundedCorners: true, backgroundColor: '#0b0b0d' }
      : { transparent: true }),
    backgroundColor: (WIN || (MAC && UI_STYLE === 'pvphq')) ? '#0b0b0d' : '#00000000',
    show: false,
    icon,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), additionalArguments: ['--dx-style=' + UI_STYLE], autoplayPolicy: 'no-user-gesture-required', spellcheck: false, backgroundThrottling: !SELFTEST, enableWebSQL: false },   // launcher sounds; the self-test must keep painting while its window is in the background
  });

  hideTray();   // the window is back: no tray icon needed
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => win.show());
  MAIN_WIN = win; win.on('closed', () => {
    if (MAIN_WIN === win) MAIN_WIN = null;
    if (WIN && autoClosed && gameRunning) showTray();   // no dock on Windows: the tray is the way back while Minecraft runs
  });
  win.webContents.once('did-finish-load', () => { if (!relayOn) relayEvents(); });
  if (process.env.DEXTER_SELFTEST) selfTest(win);

  // the UI is local only: never navigate away, never open new windows
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());

  // tell the page when the window is maximized so it can square the corners
  const sendMax = () => win.webContents.send('max', win.isMaximized() || win.isFullScreen());
  ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen'].forEach(ev => win.on(ev, sendMax));
}

// window buttons in the top bar
ipcMain.on('win', (e, action) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) return;
  if (action === 'min') w.minimize();
  if (action === 'max') w.isMaximized() ? w.unmaximize() : w.maximize();
  if (action === 'close') w.close();
});

// open a link in the system browser / mail app. Only https links to known hosts, or mailto, are allowed.
const LINK_HOSTS = new Set(['discord.gg', 'dextercopilot.ai', 'www.microsoft.com', 'microsoft.com', 'login.microsoftonline.com']);   // + Microsoft's device-code page
ipcMain.on('open', (_e, url) => {
  try {
    const u = new URL(String(url));
    if (u.protocol === 'mailto:' || (u.protocol === 'https:' && LINK_HOSTS.has(u.hostname))) shell.openExternal(u.href);
  } catch { /* ignore bad urls */ }
});

// (The Dexter Client jar is installed into the profile by the backend's launch pipeline - GameJars.installInto - and other clients' menus
// are handled by its ForeignClientJars step. Nothing is deleted.)

// show a profile folder (only inside the Dexter data folder or its logs) in Finder / Explorer.
// The allowed roots come from the backend (GET /folders), which knows the data folder for this OS
// (~/.dexter-client on macOS, %APPDATA%\DexterClient on Windows), instead of a hard-coded home path.
let FOLDER_ROOTS = null;
async function folderRoots() {
  if (FOLDER_ROOTS) return FOLDER_ROOTS;
  const r = await backendRequest('GET', '/folders');
  if (r.status === 200 && r.data && r.data.data) {
    return (FOLDER_ROOTS = [String(r.data.data), r.data.logs ? String(r.data.logs) : ''].filter(Boolean));   // cached: the backend's answer is stable
  }
  // backend not up yet: this OS's own data folder (same tree the backend uses). Not cached - the real answer may follow.
  const root = WIN
    ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'DexterClient')
    : path.join(os.homedir(), '.dexter-client');
  return [root, path.join(root, 'logs')];
}
// is `target` inside `root`? Windows paths compare without case (and may arrive with either separator)
function inside(root, target) {
  const a = WIN ? root.toLowerCase() : root, b = WIN ? target.toLowerCase() : target;
  const rel = path.relative(a, b);
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel));
}
ipcMain.handle('openPath', async (_e, p) => {
  try {
    const real = fs.realpathSync(String(p));
    for (const root of await folderRoots()) {
      let base;
      try { base = fs.realpathSync(root); } catch { continue; }
      if (inside(base, real)) { shell.openPath(real); return true; }
    }
  } catch { /* not there / not allowed */ }
  return false;
});
// read-only access to the bundled cosmetics (the cloak images) as base64, for the 3D player; nothing outside assets/locker
ipcMain.handle('asset', (_e, rel) => {
  try {
    const root = path.join(__dirname, 'assets', 'locker'), file = path.resolve(root, String(rel));
    if (!inside(root, file)) return null;
    const ext = path.extname(file).toLowerCase(), mime = { '.png': 'image/png', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.json': 'application/json' }[ext] || 'application/octet-stream';
    return { mime, b64: fs.readFileSync(file).toString('base64') };
  } catch { return null; }
});
// profile banners the user uploads: validated, shrunk to 1280 px wide and saved as JPEG under <userData>/banners/<profile id>.jpg
const BANNER_DIR = () => path.join(app.getPath('userData'), 'banners');
// Item/block pictures for the Custom Texture tab: read from the player's OWN Minecraft client jar (nothing from Mojang ships with Dexter).
// A tiny zip reader (central directory + raw inflate); only textures/item and textures/block PNGs are pulled out.
let TEX_CACHE = null;
function texJar() {
  const home = os.homedir(), roots = [];
  if (process.platform === 'darwin') roots.push(path.join(home, 'Library/Application Support/minecraft/versions'), path.join(home, 'Library/Application Support/ModrinthApp/meta/versions'));
  else if (process.platform === 'win32') { const ad = process.env.APPDATA || path.join(home, 'AppData/Roaming'); roots.push(path.join(ad, '.minecraft/versions'), path.join(ad, 'ModrinthApp/meta/versions')); }
  else roots.push(path.join(home, '.minecraft/versions'));
  const found = [];
  for (const r of roots) { try { for (const v of fs.readdirSync(r)) { if (!/^\d+(\.\d+)*$/.test(v)) continue; const j = path.join(r, v, v + '.jar'); if (fs.existsSync(j)) found.push({ v, j }); } } catch { /* folder missing */ } }
  const key = v => v.split('.').map(n => String(n).padStart(4, '0')).join('');
  found.sort((a, b) => key(b.v).localeCompare(key(a.v)));
  return found.find(f => f.v === '1.21.11') || found[0] || null;
}
function zipEntries(file, want) {
  const zlib = require('zlib'), buf = fs.readFileSync(file); let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error('not a zip');
  const count = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16); const out = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), lho = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen); p += 46 + nlen + elen + clen;
    if (!want(name)) continue;
    const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28), raw = buf.subarray(start, start + csize);
    out.push({ name, data: method === 0 ? raw : zlib.inflateRawSync(raw) });
  }
  return out;
}
ipcMain.handle('textureIndex', () => {
  if (TEX_CACHE) return TEX_CACHE;
  const jar = texJar(); if (!jar) return { error: 'Start Minecraft once so Dexter can read its textures.' };
  try {
    const items = zipEntries(jar.j, n => /^assets\/minecraft\/textures\/(item|block)\/[^/]+\.png$/.test(n)).map(e => { const [, cat, id] = /textures\/(item|block)\/([^/]+)\.png$/.exec(e.name); return { id, cat, png: e.data.toString('base64') }; });
    return (TEX_CACHE = { version: jar.v, items });
  } catch (err) { return { error: 'Could not read the Minecraft files.' }; }
});
/* ---- other launchers: detect their instances, copy one into a Dexter profile (Modrinth App, Prism, MultiMC) ---- */
function appData() { const h = os.homedir(); return process.platform === 'darwin' ? path.join(h, 'Library/Application Support') : process.platform === 'win32' ? (process.env.APPDATA || path.join(h, 'AppData/Roaming')) : path.join(h, '.local/share'); }
const dirCount = d => { try { return fs.readdirSync(d).filter(f => /\.(jar|zip)(\.disabled)?$/.test(f)).length; } catch { return 0; } };
function modrinthInstances() {
  const root = path.join(appData(), 'ModrinthApp'), db = path.join(root, 'app.db'); if (!fs.existsSync(db)) return [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dexter-mr-'));
  try {
    for (const f of ['app.db', 'app.db-wal', 'app.db-shm']) { try { fs.copyFileSync(path.join(root, f), path.join(tmp, f)); } catch { /* optional */ } }
    const out = require('child_process').execFileSync('sqlite3', ['-json', path.join(tmp, 'app.db'), "select i.name, i.path, i.icon_path ip, i.last_played lp, i.submitted_time_played pt, s.game_version gv, s.loader ld from instances i join instance_content_sets s on s.id = i.applied_content_set_id"], { timeout: 8000, maxBuffer: 1 << 24 }).toString();
    return JSON.parse(out || '[]').map(r => ({ name: r.name, version: r.gv, loader: r.ld, dir: path.join(root, 'profiles', r.path), icon: r.ip && fs.existsSync(r.ip) ? r.ip : '', lastPlayed: (r.lp || 0) * 1000, playMs: r.pt || 0 })).filter(r => fs.existsSync(r.dir));
  } catch { return []; } finally { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* temp */ } }
}
function mmcInstances(root) {
  const out = []; let dirs = []; try { dirs = fs.readdirSync(root); } catch { return out; }
  for (const d of dirs) {
    const base = path.join(root, d), cfg = path.join(base, 'instance.cfg'); if (!fs.existsSync(cfg)) continue;
    try {
      const name = (/^name=(.*)$/m.exec(fs.readFileSync(cfg, 'utf8')) || [])[1] || d; let version = '', loader = 'vanilla';
      const pack = JSON.parse(fs.readFileSync(path.join(base, 'mmc-pack.json'), 'utf8'));
      for (const c of pack.components || []) { if (c.uid === 'net.minecraft') version = c.version; else if (c.uid === 'net.fabricmc.fabric-loader') loader = 'fabric'; else if (c.uid === 'net.minecraftforge') loader = 'forge'; else if (c.uid === 'net.neoforged') loader = 'neoforge'; else if (c.uid === 'org.quiltmc.quilt-loader') loader = 'quilt'; }
      const dir = fs.existsSync(path.join(base, 'minecraft')) ? path.join(base, 'minecraft') : path.join(base, '.minecraft');
      out.push({ name, version, loader, dir, lastPlayed: 0, playMs: 0 });
    } catch { /* unreadable instance */ }
  }
  return out;
}
function detectLaunchers() {
  const ad = appData(), found = [];
  const add = (id, name, list) => { if (list.length) found.push({ id, name, instances: list.map((r, i) => ({ key: id + ':' + i, ...r, mods: dirCount(path.join(r.dir, 'mods')) })) }); };
  add('modrinth', 'Modrinth App', modrinthInstances());
  add('prism', 'Prism Launcher', mmcInstances(path.join(ad, 'PrismLauncher', 'instances')));
  add('multimc', 'MultiMC', mmcInstances(path.join(ad, 'MultiMC', 'instances')));
  return found;
}
ipcMain.handle('launchersDetect', () => detectLaunchers());
const COPY_DIRS = ['mods', 'config', 'resourcepacks', 'shaderpacks'], COPY_FILES = ['options.txt', 'optionsof.txt', 'optionsshaders.txt', 'servers.dat'];
async function copyInstance(src, dest, worlds, icon) {
  try {
    if (typeof src !== 'string' || typeof dest !== 'string' || !fs.existsSync(src) || !fs.existsSync(dest)) return { ok: false, error: 'Folder not found' };
    let files = 0; const dirs = [...COPY_DIRS, ...(worlds ? ['saves'] : [])];
    const key = f => f.replace(/\.disabled$/, '').toLowerCase().replace(/[-_+.\s]?v?\d.*$/, '');
    for (const d of dirs) {
      const from = path.join(src, d), to = path.join(dest, d); if (!fs.existsSync(from)) continue;
      fs.mkdirSync(to, { recursive: true });
      const have = new Set(fs.readdirSync(to).map(key));
      for (const f of fs.readdirSync(from)) {
        if (d === 'mods' && /velo|dexter/i.test(f)) continue;                      // Dexter brings its own mod (old builds carried the earlier name, so skip those too)
        if (d === 'mods' && have.has(key(f))) continue;                             // already there (Fabric API etc.): never two versions
        await fs.promises.cp(path.join(from, f), path.join(to, f), { recursive: true, force: false, errorOnExist: false }); files++;
      }
    }
    // files copied from another launcher can be read-only: make them writable so they can be switched off or removed
    const unlock = p => { try { const st = fs.lstatSync(p); if (st.isSymbolicLink()) return; if (st.isDirectory()) { fs.chmodSync(p, st.mode | 0o700); for (const c of fs.readdirSync(p)) unlock(path.join(p, c)); } else fs.chmodSync(p, st.mode | 0o600); } catch { /* skip */ } };
    for (const d of dirs) unlock(path.join(dest, d));
    if (icon && fs.existsSync(icon)) { try { writeIconTo(dest, fs.readFileSync(icon)); } catch { /* no icon */ } }
    for (const f of COPY_FILES) { const from = path.join(src, f); if (fs.existsSync(from)) { try { fs.copyFileSync(from, path.join(dest, f), fs.constants.COPYFILE_EXCL); files++; } catch { /* exists */ } } }
    return { ok: true, files };
  } catch (err) { return { ok: false, error: String(err.message || err).slice(0, 120) }; }
}
ipcMain.handle('instanceCopy', (_e, src, dest, worlds, icon) => copyInstance(src, dest, worlds, icon));
// headless: DEXTER_IMPORT_ALL=modrinth|prism|multimc|all imports every compatible profile of that launcher once (skips names that already exist)
async function importAll(which) {
  const found = detectLaunchers().filter(l => which === 'all' || l.id === which);
  const vers = ((await backendRequest('GET', '/versions')).data.versions || []).map(v => v.id);
  const have = new Set(((await backendRequest('GET', '/instances')).data.instances || []).map(i => i.name)), out = [];
  for (const l of found) {
    const list = l.instances.filter(r => ['fabric', 'vanilla'].includes(r.loader) && vers.includes(r.version));
    for (const r of list) {
      const name = (list.filter(x => x.name === r.name).length > 1 ? `${r.name} (${r.version})` : r.name).slice(0, 48);
      if (have.has(name)) { out.push([name, 'already there']); continue; }
      const c = await backendRequest('POST', '/instances', { name, version: r.version }); if (c.status !== 200) { out.push([name, 'could not create']); continue; }
      const p = await backendRequest('GET', '/instances/' + encodeURIComponent(c.data.created) + '/path'); const res = await copyInstance(r.dir, p.data.path, false, r.icon);
      out.push([name, res.ok ? res.files + ' files' : res.error]); have.add(name);
    }
  }
  return out;
}
async function fixIcons(which) {
  const found = detectLaunchers().filter(l => which === 'all' || l.id === which), have = (await backendRequest('GET', '/instances')).data.instances || [], out = [];
  for (const l of found) {
    const list = l.instances;
    for (const r of list) {
      if (!r.icon) continue; const name = (list.filter(x => x.name === r.name).length > 1 ? `${r.name} (${r.version})` : r.name).slice(0, 48), inst = have.find(i => i.name === name); if (!inst) continue;
      const p = await backendRequest('GET', '/instances/' + encodeURIComponent(inst.id) + '/path'); let ok = false; try { ok = writeIconTo(p.data.path, fs.readFileSync(r.icon)); } catch { /* skip */ } out.push([name, ok]);
    }
  }
  return out;
}
/* ---- what is really in a profile folder (mods, texture packs, shaders), with names and icons read from the files ---- */
const INFO = new Map();
function jarInfo(file) {
  const st = fs.statSync(file), k = file + ':' + st.size + ':' + st.mtimeMs; if (INFO.has(k)) return INFO.get(k);
  let info = {};
  try {
    const [fm] = zipEntries(file, n => n === 'fabric.mod.json');
    if (fm) {
      const j = JSON.parse(fm.data.toString('utf8').replace(/^﻿/, '')); const ic = typeof j.icon === 'string' ? j.icon : j.icon && Object.values(j.icon).pop();
      info = { title: j.name || j.id, version: j.version, author: (j.authors || []).map(a => typeof a === 'string' ? a : a.name).filter(Boolean).slice(0, 2).join(', ') };
      if (ic) { const [pic] = zipEntries(file, n => n === ic); if (pic && pic.data.length < 150000) info.icon = 'data:image/png;base64,' + pic.data.toString('base64'); }
    } else {
      const [pk] = zipEntries(file, n => n === 'pack.png'); if (pk && pk.data.length < 150000) info.icon = 'data:image/png;base64,' + pk.data.toString('base64');
    }
  } catch { /* unreadable jar: the file name is used */ }
  INFO.set(k, info); return info;
}
ipcMain.handle('profileItems', (_e, dir) => {
  const out = [];
  for (const [folder, type] of [['mods', 'mod'], ['resourcepacks', 'resourcepack'], ['shaderpacks', 'shader']]) {
    let names = []; try { names = fs.readdirSync(path.join(dir, folder)); } catch { continue; }
    for (const f of names) {
      if (f.startsWith('.')) continue; const enabled = !f.endsWith('.disabled'), base = f.replace(/\.disabled$/, '');
      if (type === 'mod' && !/\.jar$/.test(base)) continue;
      let info = {}; try { if (/\.(jar|zip)$/.test(base)) info = jarInfo(path.join(dir, folder, f)); } catch { /* skip */ }
      out.push({ type, file: f, enabled, title: info.title || base.replace(/\.(jar|zip)$/, ''), version: info.version || '', author: info.author || '', icon: info.icon || '' });
    }
  }
  return out.sort((a, b) => a.type === b.type ? a.title.localeCompare(b.title) : a.type.localeCompare(b.type));
});
const FOLDER_OF = { mod: 'mods', resourcepack: 'resourcepacks', shader: 'shaderpacks' };
ipcMain.handle('itemToggle', (_e, dir, type, file, enable) => {
  try {
    const f = FOLDER_OF[type]; if (!f || file !== path.basename(file)) return { ok: false };
    const from = path.join(dir, f, file), to = path.join(dir, f, enable ? file.replace(/\.disabled$/, '') : (file.endsWith('.disabled') ? file : file + '.disabled'));
    if (from !== to) fs.renameSync(from, to); return { ok: true, file: path.basename(to) };
  } catch { return { ok: false }; }
});
ipcMain.handle('itemTrash', async (_e, dir, type, file) => {
  try { const f = FOLDER_OF[type]; if (!f || file !== path.basename(file)) return { ok: false }; await shell.trashItem(path.join(dir, f, file)); return { ok: true }; } catch { return { ok: false }; }
});
// which banner pictures are still in assets/banners: you can delete the ones you do not like, the launcher only uses what is left
ipcMain.on('bannerIdsSync', e => { try { e.returnValue = fs.readdirSync(path.join(__dirname, 'assets', 'banners')).map(f => /^b(\d{3})\.jpg$/.exec(f)).filter(Boolean).map(x => +x[1]); } catch { e.returnValue = []; } });
/* ---- profile pictures: <instance folder>/icon.png (128x128). Modpacks get their official icon, imports keep theirs, you can upload your own. ---- */
async function instDirFor(id) { if (!/^[A-Za-z0-9-]{1,64}$/.test(String(id))) return ''; const roots = await folderRoots(); return path.join(roots[0], 'instances', String(id)); }
function squarePng(buf) {
  const { nativeImage } = require('electron'); const img = nativeImage.createFromBuffer(buf), s = img.getSize(); if (!s.width || !s.height) return null;
  const side = Math.min(s.width, s.height), c = img.crop({ x: Math.floor((s.width - side) / 2), y: Math.floor((s.height - side) / 2), width: side, height: side });
  return c.resize({ width: 128, height: 128, quality: 'best' }).toPNG();
}
function writeIconTo(dir, buf) { const png = squarePng(buf); if (!png || !fs.existsSync(dir)) return false; fs.writeFileSync(path.join(dir, 'icon.png'), png); return true; }
ipcMain.handle('profileIconGet', async (_e, ids) => {
  const out = {};
  for (const id of (Array.isArray(ids) ? ids : []).slice(0, 300)) { try { const dir = await instDirFor(id); if (!dir) continue; const f = path.join(dir, 'icon.png'); if (fs.existsSync(f) && fs.statSync(f).size < 400000) out[id] = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'); } catch { /* none */ } }
  return out;
});
ipcMain.handle('profileIconSet', async (_e, id, source) => {
  try {
    const dir = await instDirFor(id); if (!dir) return { ok: false }; let buf;
    if (typeof source === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(source) && source.length < 6e6) buf = Buffer.from(source.split(',')[1], 'base64');
    else if (typeof source === 'string' && /^https:\/\/cdn\.modrinth\.com\//.test(source)) { const res = await require('electron').net.fetch(source); if (!res.ok) return { ok: false }; buf = Buffer.from(await res.arrayBuffer()); if (buf.length > 3e6) return { ok: false }; }
    else return { ok: false, error: 'Use a PNG, JPG or WebP picture.' };
    return { ok: writeIconTo(dir, buf) };
  } catch { return { ok: false }; }
});
ipcMain.handle('profileIconClear', async (_e, id) => { try { const dir = await instDirFor(id); if (dir) fs.rmSync(path.join(dir, 'icon.png'), { force: true }); return { ok: true }; } catch { return { ok: false }; } });
ipcMain.handle('appVersion', () => app.getVersion());
ipcMain.handle('bannerDir', () => { fs.mkdirSync(BANNER_DIR(), { recursive: true }); return require('url').pathToFileURL(BANNER_DIR()).href; });
ipcMain.handle('bannerSave', (_e, id, dataUrl) => {
  try {
    if (!/^[A-Za-z0-9-]{1,64}$/.test(String(id)) || typeof dataUrl !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl) || dataUrl.length > 16e6) return { ok: false, error: 'Use a PNG, JPG or WebP picture under 12 MB.' };
    const { nativeImage } = require('electron');
    let img = nativeImage.createFromDataURL(dataUrl); const s = img.getSize();
    if (!s.width || !s.height) return { ok: false, error: 'That file is not a picture.' };
    if (s.width > 1280) img = img.resize({ width: 1280, quality: 'good' });
    fs.mkdirSync(BANNER_DIR(), { recursive: true });
    fs.writeFileSync(path.join(BANNER_DIR(), id + '.jpg'), img.toJPEG(82));
    return { ok: true };
  } catch (e) { return { ok: false, error: 'Could not save the picture.' }; }
});
ipcMain.on('startup', (_e, on) => { try { app.setLoginItemSettings({ openAtLogin: !!on }); } catch { /* unsupported */ } });

// 'login' = small card window, 'app' = full launcher window
ipcMain.on('mode', (e, mode) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  const size = SIZES[mode];
  if (!w || !size) return;
  if (w.isMaximized()) w.unmaximize();
  w.setFullScreen(false);
  w.setResizable(true);
  w.setMinimumSize(1, 1);
  const { workArea } = screen.getDisplayMatching(w.getBounds());
  w.setBounds({
    x: Math.round(workArea.x + (workArea.width - size.width) / 2),
    y: Math.round(workArea.y + (workArea.height - size.height) / 2),
    ...size,
  }, true);
  if (mode === 'app') {
    w.setMinimumSize(APP_MIN.width, APP_MIN.height);
    w.setMaximizable(true);
    // A finished sign-in leaves the launcher on the Modern look; remember it so the next start opens Modern as well.
    try { fs.mkdirSync(path.dirname(STYLE_FILE), { recursive: true }); fs.writeFileSync(STYLE_FILE, JSON.stringify({ style: 'glass' })); } catch { /* data folder not writable */ }
  } else {
    w.setMinimumSize(size.width, size.height);
    w.setMaximizable(false);
    w.setResizable(false);
  }
});

// One launcher only (all platforms): a second start asks the running launcher to show its window instead of starting a
// second backend, a second JVM and a second data-folder lock. On Windows that second start is a Start-menu click.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (app.isReady()) showWindow(); });
  app.whenReady().then(() => {
    if (icon && MAC) app.dock.setIcon(icon);
    createWindow();
  });
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  app.on('will-quit', () => { hideTray(); try { BACKEND?.proc.kill(); } catch { /* already gone */ } });
}
app.on('window-all-closed', () => { if (!(gameRunning && autoClosed)) app.quit(); });

// Developer self-test (DEXTER_SELFTEST=<folder>): signs in a throwaway offline account, visits every page, saves a screenshot of each
// and quits. DEXTER_BACKEND_HOME should point at a temporary home. Never launches the game.
function selfTest(win) {
  const out = process.env.DEXTER_SELFTEST, wait = ms => new Promise(r => setTimeout(r, ms));
  // real page errors, not window.__errs (which nothing fills): uncaught exceptions and console.error from the renderer
  const pageErrors = [];
  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 3 && !/Autofill|DevTools/.test(String(message))) pageErrors.push(String(message).slice(0, 300));
  });
  setTimeout(async () => {
    try {
      fs.mkdirSync(out, { recursive: true });
      const ex = js => win.webContents.executeJavaScript(js);
      const seeded = await ex(`(async () => { const r = await BE('POST', '/accounts/offline', { name: 'DexterTest' }); await loadAccounts(); applyAccount(); enter(); return r.status; })()`);
      await wait(2500);
      if (process.env.DEXTER_SELFTEST_JS) {   // a developer script run in the page after sign-in; its result is printed, then a screenshot
        const res = await ex(fs.readFileSync(process.env.DEXTER_SELFTEST_JS, 'utf8'));
        console.log('SELFTEST_JS ' + JSON.stringify(res));
        if (process.env.DEXTER_SELFTEST_MEM) { app.getAppMetrics(); await wait(+process.env.DEXTER_SELFTEST_MEM); console.log('SELFTEST_MEM ' + JSON.stringify(app.getAppMetrics().map(m => [m.type, Math.round(m.memory.workingSetSize / 1024), +m.cpu.percentCPUUsage.toFixed(1)]))); }   // the first call resets Chromium's per-process CPU counters, so the numbers are the idle interval only
        await win.webContents.capturePage(); await wait(600);
        fs.writeFileSync(path.join(out, 'js.png'), (await win.webContents.capturePage()).toPNG());
      }
      const pages = (process.env.DEXTER_SELFTEST_PAGES || 'home').split(',');
      for (const pg of pages) {
        const shown = await ex(`(() => { go(${JSON.stringify(pg)}); return document.querySelector('.page.on')?.id || current; })()`);
        await wait(1200);
        win.webContents.invalidate();          // an occluded window repaints only when asked; without this the capture is the previous page
        await ex('try { sv && sv.render && sv.render(); } catch { /* no 3D viewer on this page */ }');   // invalidate re-rasterises the page: the WebGL canvas needs its own frame after that
        await wait(400);
        const shot = () => win.webContents.capturePage().then(i => i.toPNG());
        await shot(); await wait(200);         // the first capture only wakes the compositor
        const png = await shot();
        fs.writeFileSync(path.join(out, pg + '.png'), png);
        if (shown !== pg) console.log('SELFTEST page ' + pg + ' did not open (showing ' + shown + ')');
      }
      const info = await ex(`({ seeded: ${seeded}, accounts: AC.list.map(a => a.name + ':' + a.type), instances: INSTANCES.length, tabs: document.querySelectorAll('#tabs button').length, errors: [] })`);
      info.errors = [...new Set([...(info.errors || []), ...pageErrors])];
      console.log('SELFTEST ' + JSON.stringify(info));
      fs.writeFileSync(path.join(out, 'selftest.json'), JSON.stringify(info));   // CI reads this if a GUI binary's stdout is swallowed
      if (process.env.DEXTER_SELFTEST_FAKEGAME) {   // pretend Minecraft started and exited: the window must close, then come back
        await onBackendEvent({ type: 'started', instanceId: 'x' }); await wait(1500);
        const closed = BrowserWindow.getAllWindows().length === 0, mem1 = app.getAppMetrics().map(m => [m.type, Math.round(m.memory.workingSetSize / 1024)]);
        await onBackendEvent({ type: 'exit', instanceId: 'x' }); await wait(4000);
        console.log('SELFTEST_FAKEGAME ' + JSON.stringify({ closedWhilePlaying: closed, memWhilePlaying: mem1, windowBack: BrowserWindow.getAllWindows().length === 1 }));
      }
    } catch (e) { console.log('SELFTEST failed ' + e); }
    app.quit();
  }, 4000);
}
