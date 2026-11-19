#!/usr/bin/env node
/* check-win32.js - runs the Windows-only code paths of main.js here, without Windows.
 *
 * Why this exists: the Windows build can only be verified on Windows, but the win32 branches (window options, single
 * instance, tray while the game runs, the data-folder check for openPath) are ordinary JS. This script evaluates
 * main.js with process.platform faked to 'win32' and a stub of the `electron` module, a fake backend over fake HTTP and
 * a fake filesystem, then drives the real handlers and asserts what they did. It is a development check, not a test of
 * Windows itself: run it on any OS with
 *
 *     bun tools/check-win32.js        (or: node tools/check-win32.js)
 */
const fs = require('fs');
const path = require('path');
const events = require('events');

const APP = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(APP, 'main.js'), 'utf8');

let failures = 0;
const ok = (cond, what) => { console.log((cond ? 'ok   ' : 'FAIL ') + what); if (!cond) failures++; };

// ---------------------------------------------------------------- fake Windows filesystem
const DATA_ROOT = 'C:\\Users\\Test User\\AppData\\Roaming\\DexterClient';
const ICON_ICO = path.win32.join(APP, 'assets', 'icon.ico');
const ICON_PNG = path.win32.join(APP, 'assets', 'icon.png');
const BACKEND_JSON = path.win32.join(APP, 'backend', 'backend.json');
const ASSET_ROOT = path.win32.join(APP, 'assets', 'locker');
const fakeFs = {
  existsSync: p => [ICON_ICO, ICON_PNG, BACKEND_JSON].includes(String(p)) || String(p).startsWith(ASSET_ROOT),
  readFileSync: (p, enc) => {
    if (String(p) === BACKEND_JSON) return JSON.stringify({ java: 'runtime/bin/java.exe', classpath: ['launcher.jar', 'lib/gson.jar'] });
    if (String(p).startsWith(ASSET_ROOT)) return Buffer.from('asset-bytes');
    throw new Error('ENOENT ' + p);
  },
  realpathSync: p => path.win32.normalize(String(p)).toLowerCase(),
  mkdirSync: () => {}, writeFileSync: () => {}, rmSync: () => {},
};

// ---------------------------------------------------------------- fake backend: a spawned java.exe + loopback HTTP
const spawns = [];
function fakeProc() {
  const proc = new events.EventEmitter();
  proc.stdout = new events.EventEmitter();
  proc.stderr = new events.EventEmitter();
  proc.kill = () => { proc.killed = true; };
  setTimeout(() => proc.stdout.emit('data', 'DEXTER_BACKEND_READY port=43210\n'), 0);
  return proc;
}
const fakeChild = { spawn: (cmd, args, opts) => { const p = fakeProc(); spawns.push({ cmd, args, opts, proc: p }); return p; } };

let settings = { minimizeOnLaunch: true };
let eventsRes = null;   // the /events response stream the harness pushes SSE into
const fakeHttp = {
  request: (opts, cb) => {
    const req = new events.EventEmitter();
    req.write = () => {}; req.end = () => {};
    let body = { accounts: [{ uuid: 'u1', name: 'DexterTest', type: 'offline', active: true }], active: 'u1', instances: [] };
    if (opts.path === '/settings') body = settings;
    if (opts.path === '/folders') body = { data: DATA_ROOT, logs: DATA_ROOT + '\\logs' };
    setTimeout(() => {
      const res = new events.EventEmitter(); res.statusCode = 200; res.setEncoding = () => {};
      cb(res);
      res.emit('data', JSON.stringify(body)); res.emit('end');
    }, 0);
    return req;
  },
  get: (opts, cb) => {
    if (opts.path === '/events') {
      const req = new events.EventEmitter();
      eventsRes = { write: chunk => { if (cb) { /* first call needs no body */ } }, push: ev => res.emit('data', 'data: ' + JSON.stringify(ev) + '\n\n') };
      const res = new events.EventEmitter();
      res.setEncoding = () => {};
      setTimeout(() => cb(res), 0);
      return req;
    }
    return { on: () => {} };
  },
};

// ---------------------------------------------------------------- fake electron
const wins = [];
let tray = null;
const trays = [];
const webContentsCalls = { openPath: [], openExternal: [] };
class FakeBrowserWindow {
  constructor(opts) {
    this.opts = opts; this.handlers = {}; this.destroyed = false; this.maximized = false; this.visible = false;
    this.minimized = false;
    this.webContents = {
      send: () => {},
      executeJavaScript: () => Promise.resolve({}),
      setWindowOpenHandler: () => {}, on: () => {}, once: (ev, fn) => { if (ev === 'did-finish-load') this._loaded = fn; },
      capturePage: () => Promise.resolve({ toPNG: () => Buffer.alloc(0) }),
    };
    wins.push(this);
    this._win = this;
  }
  static getAllWindows() { return wins.filter(w => !w.destroyed); }
  static fromWebContents() { return wins.find(w => !w.destroyed) || null; }
  loadFile(p) { this.loaded = p; setTimeout(() => this._loaded && this._loaded(), 0); }
  once(ev, fn) { this.handlers['once:' + ev] = fn; if (ev === 'ready-to-show') setTimeout(fn, 0); }
  on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); }
  emit(ev, ...a) { (this.handlers[ev] || []).forEach(fn => fn(...a)); }
  show() { this.visible = true; } focus() {} restore() { this.minimized = false; }
  isMinimized() { return this.minimized; }
  minimize() { this.minimized = true; } maximize() { this.maximized = true; } unmaximize() { this.maximized = false; }
  isMaximized() { return this.maximized; } isFullScreen() { return false; } setFullScreen() {}
  setResizable() {} setMinimumSize() {} setBounds() {} setMaximizable() {}
  isDestroyed() { return this.destroyed; }
  close() { this.destroyed = true; this.emit('closed'); }
}
const appHandlers = {};
const ipcOn = {}, ipcHandle = {};
const fakeElectron = {
  app: {
    commandLine: { appendSwitch: () => {} },
    setName: () => {}, setPath: () => {}, getPath: p => (p === 'appData' ? 'C:\\Users\\Test User\\AppData\\Roaming' : 'C:\\tmp'),
    getAppMetrics: () => [],
    setLoginItemSettings: () => {}, isReady: () => true, quit: () => { fakeElectron.app.quitting = true; },
    requestSingleInstanceLock: () => true,
    whenReady: () => Promise.resolve(),
    dock: { setIcon: () => { throw new Error('dock must not be touched on win32'); } },
    on: (ev, fn) => { (appHandlers[ev] = appHandlers[ev] || []).push(fn); },
    emit: (ev, ...a) => (appHandlers[ev] || []).forEach(fn => fn(...a)),
  },
  BrowserWindow: FakeBrowserWindow,
  ipcMain: { on: (ch, fn) => { ipcOn[ch] = fn; }, handle: (ch, fn) => { ipcHandle[ch] = fn; } },
  nativeTheme: {},
  screen: { getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 2560, height: 1440 } }) },
  shell: { openPath: p => { webContentsCalls.openPath.push(p); return Promise.resolve(''); }, openExternal: u => webContentsCalls.openExternal.push(u) },
  Tray: class FakeTray {
    constructor(icon) { this.icon = icon; tray = this; trays.push(this); }
    setToolTip(t) { this.tooltip = t; } setContextMenu(m) { this.menu = m; } on() {} destroy() { this.destroyed = true; if (tray === this) tray = null; }
  },
  Menu: { buildFromTemplate: t => t },
};
const fakeProcess = new Proxy(process, { get: (t, k) => (k === 'platform' ? 'win32' : k === 'env' ? env : t[k]) });
const env = { ...process.env, APPDATA: 'C:\\Users\\Test User\\AppData\\Roaming', DEXTER_BACKEND_HOME: 'C:\\Users\\Test User\\AppData\\Local\\Temp\\dexter-selftest-home' };
delete env.DEXTER_SELFTEST;
const fakeRequire = mod => ({
  electron: fakeElectron,
  path: path.win32,
  fs: fakeFs,
  http: fakeHttp,
  os: require('os'),
  crypto: require('crypto'),
  url: require('url'),
  child_process: fakeChild,
}[mod] || require(mod));
const fakeConsole = { log: (...a) => console.log('   main.js:', ...a), error: () => {} };

// ---------------------------------------------------------------- run main.js
const load = new Function('require', 'module', 'exports', '__dirname', '__filename', 'process', 'console',
  SRC + '\n;return { inside, folderRoots, startBackend };');
const exported = load(fakeRequire, { exports: {} }, {}, APP, path.win32.join(APP, 'main.js'), fakeProcess, fakeConsole);

const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(200);   // whenReady().then(createWindow) -> startBackend -> /accounts
  const w = wins[0];
  ok(!!w, 'a window is created');
  ok(w && w.opts.frame === false, 'frameless');
  ok(w && w.opts.transparent === false, 'window is not transparent on Windows');
  ok(w && w.opts.backgroundColor === '#0b0b0d', 'window background is the solid near-black plate');
  ok(w && w.opts.roundedCorners === true, 'roundedCorners asked for');
  ok(w && w.opts.icon === ICON_ICO, 'window icon is assets/icon.ico');
  ok(w && w.opts.webPreferences.preload.endsWith('preload.js'), 'preload is wired');
  ok(spawns.length === 1 && spawns[0].opts.windowsHide === true, 'java is spawned with windowsHide (no console flash)');
  ok(spawns.length === 1 && spawns[0].opts.env.APPDATA === env.DEXTER_BACKEND_HOME, 'self-test home isolates %APPDATA% (Windows data folder)');
  ok(spawns.length === 1 && spawns[0].args.includes('-Xmx256m') && spawns[0].args.includes('-XX:+UseSerialGC'), 'the tuned JVM flags are still passed');
  const cpArg = spawns.length === 1 ? spawns[0].args[spawns[0].args.indexOf('-cp') + 1] : '';
  ok(cpArg.includes(';') && /launcher\.jar;.*gson\.jar$/.test(cpArg) && !cpArg.includes(':'),
    'backend classpath is joined with ";" (Windows separator): ' + cpArg);

  // the game starts: the window closes (memory saving) and the tray must appear
  ok(!!eventsRes, 'the backend event stream was opened');
  eventsRes.push({ type: 'started', instanceId: 'x' });
  await wait(150);
  ok(w.destroyed, 'window closes while Minecraft runs');
  ok(!!tray, 'tray icon appears while the window is gone');
  ok(tray && tray.tooltip === 'Dexter Client', 'tray tooltip is "Dexter Client"');
  ok(tray && tray.menu.map(m => m.label).filter(Boolean).join('|') === 'Open Dexter Client|Quit', 'tray menu has Open and Quit');

  // a second start (Start-menu click) while playing must bring the launcher back
  fakeElectron.app.emit('second-instance');
  await wait(200);
  const w2 = wins[wins.length - 1];
  ok(wins.length === 2 && !w2.destroyed, 'second-instance recreates the window when none exists');
  ok(tray === null, 'tray icon disappears when the window is back');

  // the game exits: the window comes back by itself
  eventsRes.push({ type: 'exit', instanceId: 'x', code: 0 });
  await wait(300);
  ok(wins.filter(x => !x.destroyed).length === 1, 'window is back after the game exits');

  // openPath: allowed roots come from the backend and Windows paths compare without case
  const open = ipcHandle.openPath;
  ok(!!open, 'openPath is an invoke handler');
  await open({}, DATA_ROOT + '\\profiles\\abc\\.minecraft');
  ok(webContentsCalls.openPath.length === 1, 'a folder inside the data folder opens');
  await open({}, DATA_ROOT.toUpperCase() + '\\PROFILES\\ABC\\.MINECRAFT');
  ok(webContentsCalls.openPath.length === 2, 'the same folder in another case opens (Windows paths ignore case)');
  await open({}, DATA_ROOT + '\\logs\\latest.log');
  ok(webContentsCalls.openPath.length === 3, 'the logs folder opens');
  await open({}, 'C:\\Windows\\System32');
  await open({}, DATA_ROOT + '\\..\\..\\Secrets');
  ok(webContentsCalls.openPath.length === 3, 'folders outside the data folder are refused');
  await open({}, 'D:\\DexterClient\\profiles\\abc');
  ok(webContentsCalls.openPath.length === 3, 'a path on another drive is refused');

  // asset: still only inside assets/locker, with Windows separators
  const a1 = await ipcHandle.asset({}, 'pets3d\\pet.png');
  ok(a1 && a1.b64, 'a bundled cosmetic is read through asset');
  ok((await ipcHandle.asset({}, '..\\..\\main.js')) === null, 'asset refuses paths outside assets/locker');

  // the window buttons still reach the window
  const controls = ['min', 'max', 'close'].map(a => { ipcOn.win({ sender: { id: 1 } }, a); return true; });
  ok(controls.every(Boolean) && ipcOn.win, 'min/max/close handlers are registered');

  console.log(failures ? '\n' + failures + ' FAILED' : '\nall Windows checks passed');
  process.exit(failures ? 1 : 0);
})();
