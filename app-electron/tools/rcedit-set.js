#!/usr/bin/env node
/* rcedit-set.js - sets the Windows executable metadata of the packaged app.
 *
 * `rcedit` is an npm library without a CLI, so this is the small CLI package-win.ps1 calls:
 *
 *     node tools/rcedit-set.js "<path to Dexter Client.exe>" assets/icon.ico 1.0.0.0
 *
 * Sets: the icon (all sizes from assets/icon.ico), ProductName/FileDescription "Dexter Client", CompanyName "Dexter",
 * OriginalFilename, the MIT-notice line, and the file/product version. Task Manager, Explorer, the Start menu and the
 * installer all read these. Must run on Windows (rcedit ships a Windows binary); elsewhere it exits with an error.
 */
const path = require('path');
const fs = require('fs');

const [exe, icon, version] = process.argv.slice(2);
if (!exe || !icon || !version) {
  console.error('usage: node tools/rcedit-set.js <exe> <icon.ico> <a.b.c.d>');
  process.exit(2);
}
for (const [what, file] of [['executable', exe], ['icon', icon]]) {
  if (!fs.existsSync(file)) { console.error('rcedit-set: no ' + what + ' at ' + file); process.exit(2); }
}

let rcedit;
try {
  rcedit = require('rcedit');
} catch (e) {
  console.error('rcedit-set: the rcedit package is missing (npm install --no-save rcedit@4.0.1)');
  process.exit(2);
}

rcedit(path.resolve(exe), {
  icon: path.resolve(icon),
  'version-string': {
    ProductName: 'Dexter Client',
    FileDescription: 'Dexter Client',
    CompanyName: 'Dexter',
    OriginalFilename: 'Dexter Client.exe',
    LegalCopyright: 'Dexter Client contributors. Upstream code (Velo Client) is MIT licensed - see resources\\app\\licenses.',
  },
  'file-version': version,
  'product-version': version,
}).then(() => console.log('rcedit-set: ' + exe + ' (version ' + version + ')'))
  .catch(e => { console.error('rcedit-set failed: ' + (e && e.message ? e.message : e)); process.exit(1); });
