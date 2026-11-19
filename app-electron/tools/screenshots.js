// Screenshots every screen of the launcher so you (or an AI agent) can check changes visually.
// Usage: npm run shots              -> all screens into ./shots
//        PAGES=home,mods npm run shots   -> only some screens
// Screens: login, home, events, mods, cosmetics, settings
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const out = path.join(root, 'shots');
const pages = (process.env.PAGES || 'login,home,events,mods,cosmetics,settings').split(',');
const wait = ms => new Promise(r => setTimeout(r, ms));

app.setName('Dexter Launcher');   // same data folder as the real launcher, never the Dexter desktop app's
app.setPath('userData', path.join(app.getPath('appData'), 'Dexter Launcher'));

app.whenReady().then(async () => {
  fs.mkdirSync(out, { recursive: true });
  const w = new BrowserWindow({
    width: 400, height: 500, frame: false, transparent: true, backgroundColor: '#00000000', alwaysOnTop: true,
    webPreferences: { preload: path.join(root, 'preload.js'), backgroundThrottling: false },
  });
  const errors = [];
  w.webContents.on('console-message', (_e, level, msg) => { if (level >= 2) errors.push(msg); });
  await w.loadFile(path.join(root, 'src', 'index.html'));
  await wait(2500);
  const run = js => w.webContents.executeJavaScript(js);
  const shot = async name => { await wait(+(process.env.WAIT || 2500)); fs.writeFileSync(path.join(out, name + '.png'), (await w.capturePage()).toPNG()); };

  if (pages.includes('login')) await shot('login');
  w.setBounds({ x: 100, y: 60, width: 1280, height: 800 });   // the main process does this on sign-in
  await wait(500);
  await run(`document.querySelector('#login').classList.add('gone')`);
  for (const p of pages.filter(p => p !== 'login')) {
    await run(p === 'settings' ? `document.querySelector('[data-settings]').click()` : `go('${p}')`);
    await shot(p);
  }
  fs.writeFileSync(path.join(out, 'console-errors.txt'), errors.join('\n'));
  console.log(`saved ${pages.length} screenshots to ${out}` + (errors.length ? ` (${errors.length} console errors, see console-errors.txt)` : ''));
  app.quit();
});
