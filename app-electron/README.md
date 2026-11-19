# Dexter Launcher UI

The finished UI of the Dexter Minecraft launcher: sign-in card, Home, Events, Mods (Modrinth), Cosmetics, Settings.
Electron app, plain HTML / CSS / JS, no build step. All screens work with sample data; mods, server counts and skins are live.

```bash
npm install
npm start          # run the launcher
npm run shots      # screenshot every screen into ./shots
```

## Hand this to your AI coding agent

Give Claude Code or Codex this folder (or the zip) and paste:

> Use this folder as the UI of our launcher and keep the design exactly as it is. Read `CLAUDE.md` first, then `docs/INTEGRATION.md` and `docs/DESIGN.md`. Wire the real launcher logic (Microsoft login, launching Minecraft, mod downloads, events, friends) behind the existing screens. After every UI change run `npm run shots` and check the screenshots.

`CLAUDE.md` and `AGENTS.md` are the same guide (Claude Code reads the first, Codex reads the second).

## Folder map

```
main.js, preload.js     Electron window + the small API exposed to the page
src/                    index.html, styles.css, app.js (UI + sample data), icons.js (generated), vendor/
assets/                 logos, app icon, event images, fonts
tools/                  build-icons.js, screenshots.js
docs/                   DESIGN.md (design rules), INTEGRATION.md (what to replace with real logic)
```

## Credits

- Icons: Solar icon set (CC BY 4.0) via Iconify, Modrinth logo from simple-icons (CC0).
- Fonts: Golos Text and Pixelify Sans (SIL OFL 1.1), license files in `assets/fonts`.
- 3D player: skinview3d (MIT), in `src/vendor`.
- Skins, heads: mc-heads.net. Mods: Modrinth. Server status: mcsrvstat.us.
- Dexter logo and event artwork belong to Dexter. This UI is not affiliated with Mojang or Microsoft.

## Windows build

Run on a Windows 10/11 x64 machine, from `app-electron/`:

```powershell
npm ci
$env:JAVA_HOME = "C:\Program Files\Amazon Corretto\jdk25..."   # needs a jmods\ folder
powershell -ExecutionPolicy Bypass -File tools\package-win.ps1
```

Output in `../dist/windows/`:

```
Dexter-Client-Setup-<version>.exe            per-user installer (no admin), Start-menu + desktop shortcut, uninstaller
Dexter-Client-<version>-portable.zip         unzip anywhere, run "Dexter Client.exe"
Dexter Client\                               the unpacked app (what both of the above contain)
```

The script mirrors `tools/package-mac.sh`: Gradle backend jar, a `jlink`ed Java runtime, the Electron win32-x64 payload
(downloaded from the official electron/electron release, SHA256 checked against its `SHASUMS256.txt`), the app files,
`source/LICENSE` + `source/NOTICE.md`, then `rcedit` for the icon and version and Inno Setup for the installer.
`-SkipInstaller` builds the app folder and the portable zip only (no Inno Setup needed); `-SkipRcedit` leaves the exe
unnamed-icon. Details, the test log and the known issues: `../WINDOWS.md`.

**The binaries are not code-signed.** Windows SmartScreen will show "Windows protected your PC" on the first start of a
download: click **More info → Run anyway**. This is expected: signing needs a (paid) code-signing certificate, and the
build deliberately does not try to work around the warning. Nothing else about the app is affected.

Data folders on Windows: the launcher UI keeps banners and caches in `%APPDATA%\Dexter Client`, the backend keeps
profiles, accounts and the game in `%APPDATA%\DexterClient`. Installing, updating or uninstalling never touches either.
