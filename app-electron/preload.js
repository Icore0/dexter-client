// Exposes a tiny, safe API to the page as window.dexter.
// The UI works without it (in a normal browser) because every call is optional-chained in src/app.js.
// When the real launcher logic is added, expose more here (launch, install, auth, ...) and keep it this narrow.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dexter', {
  min: () => ipcRenderer.send('win', 'min'),
  max: () => ipcRenderer.send('win', 'max'),
  close: () => ipcRenderer.send('win', 'close'),
  mode: m => ipcRenderer.send('mode', m), // 'login' | 'app'
  open: url => ipcRenderer.send('open', url), // https link (allow-listed hosts in main.js) or mailto
  asset: rel => ipcRenderer.invoke('asset', String(rel)),   // bundled cosmetics for the 3D player
  appVersion: () => ipcRenderer.invoke('appVersion'),
  bannerIds: (() => { try { return ipcRenderer.sendSync('bannerIdsSync'); } catch { return []; } })(),
  textureIndex: () => ipcRenderer.invoke('textureIndex'),
  launchersDetect: () => ipcRenderer.invoke('launchersDetect'),
  instanceCopy: (src, dest, worlds, icon) => ipcRenderer.invoke('instanceCopy', String(src), String(dest), !!worlds, icon ? String(icon) : ''),
  profileIconGet: ids => ipcRenderer.invoke('profileIconGet', Array.isArray(ids) ? ids.map(String) : []),
  profileIconSet: (id, source) => ipcRenderer.invoke('profileIconSet', String(id), String(source)),
  profileIconClear: id => ipcRenderer.invoke('profileIconClear', String(id)),
  profileItems: dir => ipcRenderer.invoke('profileItems', String(dir)),
  itemToggle: (dir, type, file, enable) => ipcRenderer.invoke('itemToggle', String(dir), String(type), String(file), !!enable),
  itemTrash: (dir, type, file) => ipcRenderer.invoke('itemTrash', String(dir), String(type), String(file)),
  bannerDir: () => ipcRenderer.invoke('bannerDir'),   // file:// URL of the folder with uploaded profile banners
  bannerSave: (id, dataUrl) => ipcRenderer.invoke('bannerSave', String(id), String(dataUrl)),
  openPath: p => ipcRenderer.invoke('openPath', String(p)),   // reveal a profile folder (inside the data folder only)
  startup: on => ipcRenderer.send('startup', !!on),   // open the launcher when the Mac starts
  api: (method, path, body) => ipcRenderer.invoke('api', method, path, body),   // the Dexter backend (profiles, accounts, launch, installs, servers, settings)
  onBackend: cb => ipcRenderer.on('backend', (_e, ev) => cb(ev)),               // its events: phase / progress / bytes / started / exit / error
  onMaximize: cb => ipcRenderer.on('max', (_e, v) => cb(v)),
});

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('electron');
  if (process.platform === 'darwin') document.documentElement.classList.add('glass');   // main.js gives macOS windows vibrancy
  if (process.platform === 'win32') document.documentElement.classList.add('win');      // main.js gives Windows an opaque window: clip the page's own corners
});
