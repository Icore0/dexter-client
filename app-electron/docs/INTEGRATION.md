# Integration guide: what is fake today and what to replace it with

The UI calls these in `src/app.js`. Search for the function / constant name. Keep the data shapes below so the UI keeps working.
Anything touching the file system, processes or tokens belongs in the **main process** (`main.js`); expose it through `preload.js` as `window.dexter.*` and call it from `app.js`.

## 1. Sign-in (Microsoft account)

- Today: `enter()` / `leave()` in `app.js`. The "Continue with Microsoft" and saved-account buttons (`[data-enter]`) just call `enter()`.
- Replace with: Microsoft OAuth (device-code or browser flow) -> Xbox Live -> XSTS -> Minecraft services (`api.minecraftservices.com/authentication/login_with_xbox`), then `GET /minecraft/profile` for the name, UUID, skin and capes. Keep the refresh token in the OS keychain (e.g. `keytar`), never in plain files.
- When login succeeds call `enter()`; on sign-out call `leave()`. These also resize the window (`dexter.mode('app'|'login')`).
- The saved-account row and the profile menu show `Nyxen`; read them from the logged-in profile. `ME` in `app.js` is the current username.

## 2. Launching the game

- Today: `launch(host)` runs a fake 4-step progress popup.
- Replace with: ask the main process to start Minecraft for the selected instance (`INSTANCES[inst]`: version, loader, mods folder, Java, memory from Settings). Update the popup steps from real progress events (checking files, Dexter Shield verification, starting, connecting).
- **Join a server directly** (Servers panel, Friends "Join", event buttons): call `launch(host)`. In the real launch, pass Minecraft's quick-play argument: `--quickPlayMultiplayer <host>` (Minecraft 1.20+). Older versions: `--server <host> --port <port>`.
- The Play button on Home uses `[data-launch]`; the Join buttons use `[data-join="host"]`.

## 3. Instances (profiles)

- Today: `INSTANCES = [{ name, ver, loader }]` and a per-instance `items` Map of installed add-ons.
- Replace with real profile storage (one folder per instance: `mods/`, `resourcepacks/`, `shaderpacks/`, `saves/`). The picker on Home and Mods reads `INSTANCES` and `inst`.
- Installing a modpack (`.mrpack`) should create a new instance; the UI already adds one to the list after "Get pack".

## 4. Mods, modpacks, resource packs, data packs, shaders (Modrinth)

- Live already: search/browse uses `https://api.modrinth.com/v2/search` with facets for Minecraft version, loader and project type. Details in `loadMods()`.
- Today's **Install** button resolves the right file for the instance (`/project/{id}/version?game_versions=..&loaders=..`) and stores its URL in `m.file`, but **downloads nothing**.
- Replace the stored URL with a real download in the main process: fetch `m.file`, verify the SHA-512 from the version's `files[].hashes`, save to the instance:
  - mod -> `mods/`; resource pack -> `resourcepacks/`; shader -> `shaderpacks/`; data pack -> the chosen world's `datapacks/`; modpack -> unpack `.mrpack` into a new instance.
- Also install required dependencies (`dependencies` in the version object). The Installed tab and Remove button work from the instance's `items` Map; back it with the actual files.
- Modrinth requires a descriptive `User-Agent` for API calls made from a server/desktop client: set one in the main process when moving fetches there (e.g. `Dexter/1.0 (contact@dexter...)`).
- `VERIFIED` is a **placeholder list** of project slugs allowed in Dexter events (shows the check badge). Replace with the real allow-list from the Dexter Shield backend.
- CurseForge was removed on purpose. Do not re-add without asking.

## 5. Events, friends, servers

| UI data | Today | Replace with |
|---|---|---|
| `EVENTS` (name, state `live`/`reg`/`open`, tag, mode, when, prize, players, img, desc, rules, rewards) | sample | Dexter events API. `state` drives the button label (Spectate / Register / Open server). |
| Event Register / Spectate buttons (Events page) | no action | call the registration API; "Spectate" should `launch()` into the event server. The Home hero has only Play + instance picker. |
| `FRIENDS` | sample | friends/presence service (`[name, where, statusColor]`; `where` is a server or event name, empty when idle). |
| Links drop-down in the top bar (Support, website, Discord) | `data-link` buttons in `index.html` | set the real Support page (today `mailto:team@dextercopilot.ai`). Allowed hosts are in `main.js` (`LINK_HOSTS`). |
| `SERVERS` + the Dexter server card | host list (icons and counts are live from mcsrvstat) | keep or fetch from your API. Replace `play.dexter.gg` and the `12,408` count with the real server. Confirm PvPHQ's address (`pvphq.com` has the most players; `pvphq.club` is smaller). |

## 6. Cosmetics

- Tabs: Capes (event capes + 42 real Minecraft capes), Hats, Pets, Emotes (animated preview on hover). Lists are `LISTS` in `app.js`; `[name, texture/model, locked]`.
- Real capes: Mojang profile API lists the capes a player owns; switch with `PUT https://api.minecraftservices.com/minecraft/profile/capes/active`. Event capes, hats and pets need Dexter's cosmetics service plus the in-game mod/server to render them for other players.
- Hats and pets are Dexter-original voxel models (`HATS`, `PETS` in `cosmetics3d.js`, boxes: `[x,y,z,w,h,d,color]`), attached to the head / hopping beside the player. Pets are pixel-art sprites extruded into voxels by `sprite()`; replace with real models when the mod defines them.
- Cape textures are Mojang artwork: check licensing. Regenerate the data file with `npm run cosmetics`.
- "Locked" items: third value in the list rows; they show a lock and cannot be worn.

## 7. Settings

- Today: controls are visual only, nothing is saved. Add persistence (e.g. `electron-store`) and pass memory / Java / resolution to the launch.
- Dexter Shield rows (protection active, last scan) are static text: connect them to the real anti-cheat client.
- "In-game menu key: Right Shift" describes the separate in-game overlay mod (not part of this folder).

## 8. Packaging

- App icon: `assets/icon.png` (1024). With `electron-builder`, set `mac.icon` / `win.icon` to it or generate `.icns` / `.ico`.
- Product name and version are in `package.json`.
- Code-sign and notarize for macOS; sign for Windows. Auto-update via `electron-updater` if wanted.

## 9. Security checklist when wiring real features

- Keep `contextIsolation` on (default) and expose only specific functions in `preload.js`.
- Do not load remote code. The CSP in `index.html` should only list hosts you really use.
- Escape all remote strings (`esc()` in `app.js`) before they go into `innerHTML`.
- Validate file names and paths in the main process before writing to disk; never trust a URL's file name.
- Verify downloads by hash; allow only `https`.

## Dexter Client in the launcher (Nov 2026)
- The launcher bundles the mod at `mod/dexter-client.jar`. `main.js` handles `instance:prepare` (called by `launch()` in `src/app.js`): it makes `<userData>/instances/<name>/mods`, copies the jar in, and MOVES other clients' menu mods (Feather, Dawn, Lunar, Laby, Badlion-style; list in `RIVALS`) to `mods-disabled-by-dexter/`. Nothing is deleted.
- Still to build: the real launch (Mojang sign-in, version/library download, Fabric install, Java). PLAY is otherwise visual.
