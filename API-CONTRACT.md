# API contract for the dev team (what the V2 screens need)

The UI team built the screens. Everything below runs on **preview data** today. Wiring it is the dev team's job. The screens call one adapter, `app-electron/src/social-api.js` (`Social`), and one hook, `window.TextureAPI`. Replace the bodies; do not change the screens (`src/v2.js`). Set `Social.mock = false` when connected: the orange "Preview data" bar disappears.

## 1. Friends and close friends (`Social`)

| Method | Returns | Notes |
|---|---|---|
| `list()` | `{ friends: Friend[], groups: Group[] }` | polled or pushed |
| `addFriend(name)` | `{ ok, error? }` | name 3-16, `[A-Za-z0-9_]` |
| `toggleClose(name)` | `Friend` | sets `iClose`: I let this friend see my server and join me |
| `joinFriend(name)` | `{ ok, address, error? }` | real version starts Minecraft with `--quickPlayMultiplayer <address>`; only when `closeToMe` is true |
| `on(fn)` | unsubscribe | call `fn(state)` on every change |

`Friend = { name, online, server?, mode?, closeToMe, iClose }`
- `closeToMe` = THEY made me a close friend. Only then does the server see their `server`/`mode` and show Join. Normal friends only ever show Online/Offline.
- `server` is `"in game"` when they play but I may not see where.
- Identity: the real service must verify names with Mojang (`hasJoined`); never trust a client-sent name.
- Privacy: nobody's server is sent to anyone who is not their close friend. Offering a friend is opt-in and revocable.

## 2. Voice groups (joinable while NOT in game)

| Method | Notes |
|---|---|
| `createGroup(name)` | name 1-24 chars |
| `joinGroup(id)` / `leaveGroup(id)` | `joinGroup` must fail with `Join from the in-game menu` while `inGame` is true |
| `setMute(bool)` / `setDeafen(bool)` | deafen implies mute |
| `setInGame(bool)` | the launcher calls this on game start / exit (backend events `started` / `exit` / `error`) |

`Group = { id, name, members: string[], live: string[], joined }` (`live` = who is talking now). Transport (WebRTC or other) is the dev team's choice.

## 3. In-game proximity voice (not built; UI only)

- Only Dexter Client players, same server, 3D positional audio, range 20 blocks.
- Volume by distance (linear between points), also exported from `social-api.js` as `VOICE_RANGE` / `voiceGain(d)`:

| Distance | Volume |
|---|---|
| 0-5 blocks | 100 % (loud and clear) |
| 10 | 55 % |
| 15 | 30 % |
| 20 | 12 % |
| over 20 | silent |

- Settings the launcher already stores (localStorage key `dx.voice.v1`): `{ on, mic, ptt, key, vin, vout }` (voice on, microphone id, push to talk, talk key, mic volume 0-100, voice volume 0-100). The in-game menu needs matching controls (not done by the UI team yet).
- Consent: players must be able to mute or block anyone; never record or relay audio to anyone outside the range rule.

## 4. Custom Texture (`window.TextureAPI`)

- `TextureAPI.exportPack({ name, items })` -> writes a resource pack. `items` = `{ [itemId]: { px: (hex|null)[256], size: 'small'|'medium'|'large' } }`, 16x16 row-major, `null` = transparent.
- The item list and base art in the editor are **sample art generated from the name**. The real version reads the textures from the player's own game files (client jar of the selected version); no Mojang art may ship in this repo.
- `size` is the in-game item scale: small 0.6, medium 1.0, large 1.5 (preview only today). Making it real (model `display` overrides) and checking it in game is dev work.
- `pack_format` must come from the version's own `version.json`. Back up `options.txt` before enabling the pack.

## 5. Home background

Fully front end. Picture (PNG, JPG, WebP) or GIF up to 5 MB, checked by size and magic bytes, stored in IndexedDB (`dexter-v2` / `kv` / `homeBg`). A GIF only animates while Home is showing and the window has focus. Nothing for the dev team to wire.

## 6. Profiles and settings hooks (added with the profile page)

- `window.ProfileAPI.importMrpack(file)`: import a `.mrpack` file picked in New profile. The backend has `POST /modpacks` for Modrinth projects only; a file import endpoint (e.g. `POST /modpacks/import`) is needed. Until then the button says "not connected yet".
- `window.UpdateAPI.check()` and `window.UpdateAPI.repair()` (Settings > Launcher): check for a new launcher/mod build, and put the Dexter mod back into every profile. Both return `{ message }`.
- Per-profile icon, banner and description are stored in launcher settings `ui` keys `icon.<id>`, `banner.<id>`, `desc.<id>`.
- Installed mods/packs per profile are still tracked by the launcher in localStorage (`ITEMS_KEY`); a real folder scan from the backend would be more reliable.
- Not ported from the old launcher: rebinding the "Open Dexter menu" key (Settings shows it read-only) and the per-profile "next launch" memory table.

## 7. Import from another launcher, real folder scan, on/off switches (built in the Electron shell)

- `main.js` IPC: `launchersDetect`, `instanceCopy`, `profileItems`, `itemToggle`, `itemTrash` (preload names the same). Detects the Modrinth App (reads its `app.db` with the system `sqlite3` command: present on macOS and most Linux; **Windows has none, so Modrinth detection there needs a bundled SQLite reader**), Prism Launcher and MultiMC (reads `instance.cfg` and `mmc-pack.json`).
- Import creates a Dexter profile with `POST /instances` and copies mods, config, resource packs, shader packs, options and servers (worlds optional). It skips Dexter's own mod and any mod that is already in the new profile. Only Fabric and Vanilla instances on versions Dexter supports can be imported.
- A profile's installed list is now the real folder (names and icons read from each jar's `fabric.mod.json`). Switching a mod off renames `file.jar` to `file.jar.disabled`; removing sends the file to the trash. Data packs are still tracked by the launcher, not scanned.

## 8. Profile pictures

A profile's picture is `<instance folder>/icon.png` (128x128 PNG). Modrinth modpacks added from the New profile card get the pack's official icon (downloaded from `cdn.modrinth.com` and converted in the page, so webp works). Profiles imported from the Modrinth App keep that app's icon. Any profile can be changed from its card menu (Change icon), from the profile page (click the icon), or in the New profile card (Upload picture); a symbol can be chosen instead. Shell calls: `profileIconGet`, `profileIconSet`, `profileIconClear`. Headless one-off: `DEXTER_FIX_ICONS=modrinth` gives already-imported profiles their original icons.
