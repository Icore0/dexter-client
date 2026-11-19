# Dexter Client V2: removals, redesign, Custom Texture, social + voice. Spec for the executor (OpenCode)

You are the executor. The "brain" session (Claude) wrote this from the product owner's change list. Read ALL of it first.
Work in phases. **Each phase ends with a checkpoint: stop, write the phase report, and wait for the human.** Do not start the next phase on your own.
Do not guess product decisions: where this file says "ASK", stop and ask; where it gives a default, use it and write it in the report.

## SCOPE OVERRIDE (2026-11-18, supersedes anything below that conflicts)

We are the **UI / front-end team**. Backend, servers, networking, audio engines and making functions actually work are the dev team's job and are **not** part of this work.
- **Builder mode: dropped.** The dev team said not to make it. Do not remove or rebuild anything for it; leave Redstone Mode, Schematics and the rest untouched.
- **Phase 3 (Custom Texture, Home background):** build the full UI (tab, instant search, item grid, pixel editor, colour picker, size picker, background picker with the 5 MB / type checks) working on local sample data. Do NOT build the game-side item-size mechanism, the jar texture reader beyond what the UI needs, or in-game resource-pack application. Put a short "hand-off for dev" note listing what must be wired.
- **Phase 4 (friends, close friends, voice groups):** UI only: screens, states, empty/loading/error states, animations, sounds, driven by mock data behind one small adapter file (`src/social-api.js`). Write the API contract (endpoints, payloads, events) as `API-CONTRACT.md` for the dev team. Do NOT build a server, accounts, presence, join-server logic or WebRTC.
- **Phase 5 (in-game proximity voice):** UI only: voice settings screen, mic/volume/PTT/mute controls, speaking indicators and the range/volume visual using the 5/10/15/20-block table as a mock. Do NOT build audio capture, Opus, relay, 3D positioning or any networking. Add the gain table and requirements to `API-CONTRACT.md`.
- Phases 1 and 2 are unchanged (removals, redesign, text, sounds are front-end).
- Never present mock behaviour as working; mark mock-driven screens clearly in the code and the reports.

## 0. Ground truth about the project (read before touching anything)

Repo: `/Volumes/Storage 1/Dexter Project/dexter-client-fork`, branch to use: create `v2` from `windows-port` (commit `453daa1` or newer). Private GitHub repo `Icore0/dexter-client`.

```
app-electron/            the LAUNCHER UI + shell (Electron 33). Start here for everything the launcher shows.
  main.js, preload.js    window, tray, backend spawn, IPC (api, asset, bannerSave, openPath ...), self-test hooks
  src/index.html         all pages (Home, Library, Events, Mods, Cosmetics(Locker), Store, Clips, News, Settings sheet, Friends/Servers panel)
  src/app.js             core: accounts, profiles, installs, launch, settings, Locker (LOCK{}), friends panel
  src/extras.js          Modrinth library, News, older Store code (superseded)
  src/extras2.js         premium Store + Dexter+ page, Library profile cards, banner picker, extra settings rows
  src/perf.js            render governor (30 fps cap, pauses when unfocused / game running, lazy pages). KEEP.
  src/banners.js         banner groups + picker data;  assets/banners/  (130 jpg + t/ thumbnails)
  src/styles.css         all styling; src/locker3d.js = 3D cosmetics on the player model (wings, pets, auras)
  assets/locker/         cosmetic art (27 MB), catalog.js (const LOCKER)
  tools/package-mac.sh, package-win.ps1, installer-win.iss, check-win32.js
source/                  Java, Gradle (upstream-derived, MIT, committed without history)
  launcher/              backend library used headless by the launcher: api/DexterBackend.java = our HTTP API (127.0.0.1 + token)
  src/client/            THE IN-GAME FABRIC MOD ("Velo Client" internally; shown to players as Dexter Client)
    java/net/veloclient/velo/client/{gui,modules,cosmetics,namestyle,economy,plus,network,hud,...}
    resources/assets/velo-client/{lang,sounds,sounds.json,textures,...}
  server/                upstream's server code (Java). The Dexter backend service does NOT exist yet (services.url is blank)
DEXTER.md                what differs from upstream + the list of INTERNAL identifiers you must not rename
WINDOWS.md, .github/workflows/windows.yml    the Windows build/CI (must stay green)
```

Hard rules (same as before, plus new ones):
1. Never rename `net.veloclient.*`, the Fabric mod id `velo-client`, `.velocape`, `X-Velo-*`, `VELO-` prefixes (see DEXTER.md). Players must never SEE the word Velo in UI/text/sounds/files they open. Keep `source/LICENSE` + `NOTICE.md`.
2. The macOS build AND the Windows build (GitHub Actions "Windows build") must stay working after every phase. Run the self-test; push the branch only when the human says so.
3. Keep the performance work: `src/perf.js`, the Chromium switches + JVM flags in `main.js`, the parent watchdog in `DexterBackend.main`. After each phase, measure idle CPU (should be ~0%) and memory and put the numbers in the report. No always-running animation loops, no polling faster than 2 s while idle.
4. Do not bundle Mojang textures/sounds/jars in the repo or the app. Anything vanilla is read at runtime from the player's own installed game files.
5. No telemetry, no credentials/tokens in the repo, no outbound requests the human did not ask for. Do not buy/rent/deploy anything. Do not push unless told.
6. Commit after each numbered step (`git commit`), message = what + why. Never rewrite history.
7. When a removal touches something shared, grep for every reference (UI, backend, mod, lang files, selftests, CI) and fix them in the same commit. Nothing may be left dangling (404 images, undefined functions, "undefined" in the UI, broken script order).
8. Verify, do not assume: run the self-test (`DEXTER_SELFTEST`, see `main.js` selfTest, `diagG.js`-style scripts) and LOOK at screenshots. Never claim a thing works that you did not run. Say what you could not test.

## 1. Phase 1: REMOVE (launcher + in-game mod)

### 1A. Launcher (app-electron)
Remove completely (UI, data, code, assets, CSS, strings, selftest expectations):
1. **Dexter+**: the Store tab page "Dexter+", the Dexter+ ad in Featured, Dexter+ rows in Settings/Home/News, the `+` badge, "membership" copy, `px-*` CSS, `pmPlusPage`, `plusYearly`, `data-bill`.
2. **Store, all cosmetic selling, coins**: delete the Store tab (nav button, `#store` page, `drawStore`, `pm*` functions, quick view `#qv`, `STORE_TABS`, `WISH`, `data-buy`, coin pill, "0 coins"). Remove the Store route from `ORDER`/`PAGE_LOAD`, from `go()`, from the tab-folding CSS, from `perf.js` references if any.
3. **Cosmetics in the Locker**: remove the categories **Wings, Auras, Name Style, Kill FX, Bodywear, Pets** from `LOCK` (app.js), `drawLocker`, the 3D code that renders them (`locker3d.js`: wings/pets/auras; keep only what the remaining categories need), `dressLocker` paths for them, the aura store canvases, `assets/locker/{wings,wings3d,pets,pets3d,killfx}` and the catalog entries (`tools/build-locker-catalog.py` too). **Keep: Skins, Cloaks (capes), Emotes** unless the human says otherwise. The Cosmetics tab must still work (skin viewer + cloaks + emotes), the equip choices of removed categories must be ignored safely if they exist in saved settings (`ui["equip.wings"]` etc.: delete them on startup).
4. **AI settings**: remove the "AI Access", "AI: hide the game window" and related rows/sections from Settings (`VSET`, `social` section items), plus any "Prompt for your AI" UI. Backend: stop starting the local AI API (default off and not reachable), keep the settings fields in `LauncherSettings` untouched for the later remake, but make sure nothing listens on any port for AI. Note it in the report so the remake knows where the code is.
5. Update references: the tab count expected by `main.js selfTest`, `.github/workflows/windows.yml` (`tabs -ne 8`) and docs must be updated after Phase 3 (the final tab count is 8 again: see 3). During Phase 1 the count is 7.
6. Slim the app: delete unused assets (`du` before/after in the report).

### 1B. In-game mod (source/src/client)
Remove (code, mixins, registrations, lang keys, textures, sounds, screens, keybinds, settings entries, server calls):
1. Wings, Aura, Kill effects, Bodywear (`cosmetics/wear`), Pets (`resources/assets/velo-client/pets`), **Name Style** (`namestyle/`, `NameStyleScreen`), and their modules/screens/lockers (`modules/cosmetics/{Wings,Aura,KillEffects}CosmeticsModule`, `KillFxLockerScreen`, `Loadouts` parts for them, `cosmetics/{aura,killfx,wear,wings}`).
2. Store, coins, Dexter+/Plus: `economy/`, `plus/`, `network/StoreClient`, `gui/store`, badges that advertise Plus, anything that shows prices/coins.
3. **Builder mode**: find it first. It is not named "BuilderMode" in code. Search the in-game menu (`gui/`, `modules/`, lang `en_us.json`) for "builder", "build", "creative", "schematic", "redstone", "worldedit", "layout". Write what you found and your confidence in `PLAN-V2-FINDINGS.md`. If exactly one feature clearly matches, remove it. **If it is ambiguous, STOP and ASK the human (list the candidates with their menu names).** Do not delete guesses.
4. After removals the mod must compile for ALL Minecraft versions the Stonecutter setup builds (read `source/build.gradle.kts`, `stonecutter` config, `DEXTER.md`) and a smoke test must pass: build the mod jar, install it into a throw-away profile through the launcher backend, launch Minecraft once on the human's Mac with `DEXTER_BACKEND_HOME` isolation, reach the title screen and the Dexter menu, open each remaining menu screen, quit. (If you cannot run the game, say so and list exactly what the human must click through.)

### Phase 1 acceptance
- Launcher self-test passes with 7 tabs and zero errors, screenshots of every page reviewed, no console errors, no dead links to removed things.
- `grep -ril` for each removed term over `app-electron/src`, `app-electron/main.js` and the mod's `resources/` returns nothing (except this plan, DEXTER.md and changelogs).
- Mod builds; smoke test result documented. macOS app builds with `tools/package-mac.sh`. Windows CI is green after the human approves a push.
- Report: files deleted (count), size before/after, anything left on purpose and why.

## 2. Phase 2: CHANGE: new UI/UX, shorter text, new sounds  (launcher AND in-game menu)

### 2A. Design brief first (checkpoint 2A)
Before changing styling, write `DESIGN-V2.md`: the problems of the current UI you see in screenshots, then the new system: color tokens (dark, keep the liquid-glass feel on macOS and the opaque dark plate on Windows), type scale (Pixelify Sans for page titles only, Golos Text for everything else), spacing scale (4/8/12/16/24/32), radii, elevation, one button system (primary / secondary / ghost / danger), inputs, tabs, cards, dialogs/sheets, empty states, loading/skeletons, toasts, focus rings, and motion rules (150 to 250 ms, ease-out, no motion when `prefers-reduced-motion`, nothing that animates while idle).
Produce before/after screenshots of Home, Library, Mods, Cosmetics, Clips, News, Settings, the profile banner picker, and a mock of the in-game menu. **STOP and wait for the human's approval of the brief.** No restyling before that.
Constraints: no AI-looking gradients/glow clutter, no emoji, one accent color, large click targets, keyboard accessible, contrast AA. Windows and macOS must both look right. 30 fps cap and idle CPU ~0% must hold.

### 2B. Implement the approved design
Launcher: `src/styles.css` (tokens at the top; remove dead rules), `index.html`, and the page JS templates. In-game menu: the Fabric screens in `source/src/client/java/.../gui/*` and widgets (`gui/widget`, `VeloFonts`, `VeloScreens`, theme/colors) plus textures under `resources/assets/velo-client/textures`. Build once, screenshot the in-game menu with the game's own screenshot (F2) from a smoke launch, and compare to the approved mock.

### 2C. Rewrite every text (launcher + in-game), shorter and clearer
Rules:
- Labels: 1 to 3 words, sentence case ("Memory", "Window size", "Open folder"). Buttons: a verb ("Play", "Save", "Add profile").
- Descriptions/help: one short sentence, max 12 words, plain words, say what it does for the player, not how. No jargon ("garbage collector" -> "Memory cleanup"). No exclamation marks. No marketing.
- Errors: what happened + what to do, max 15 words ("Could not reach Modrinth. Check your connection.").
- Keep meaning and every feature. Do not invent features or promises.
- Same word for the same thing everywhere (Profile, Library, Mods, Clips, Account).
Deliver `TEXT-V2.md`: a table `where | old | new` for EVERY string you change (launcher: `index.html`, `app.js`, `extras*.js`, `VSET`, toasts, empty states, News sample text; in-game: `lang/en_us.json` and every hard-coded `Text.literal`). **Checkpoint 2C: stop for the human's review of TEXT-V2.md before applying it** (apply = one commit per file group).

### 2D. New sound set (launcher + in-game)
Create original sounds (do not reuse upstream's wavs): a short synthesized set rendered by a script you commit (`tools/make-sounds.py` or JS), CC0/own work, each under 300 ms, normalized to about -18 LUFS and peak under -3 dBFS, mono or stereo 44.1 kHz, OGG for the mod (`sounds.json` events) and WAV/OGG for the launcher.
Events: launcher open, window close, click, tab switch, toggle on, toggle off, hover (very quiet, optional and OFF by default), success, error, launch start, launch done, notification, menu open/close in game, in-game button click, in-game toggle. One master "Interface sounds" setting (already exists: `ui.sounds`, `interface.json`), plus a volume slider. No sound plays while the game window has focus unless it is an in-game menu sound.
Launcher: extend `src/sounds.js`. In-game: `resources/assets/velo-client/sounds.json` + the mod's sound registry; keep the "Interface sounds" toggle working in both.

### Phase 2 acceptance
Approved `DESIGN-V2.md` and `TEXT-V2.md` implemented, screenshots of every page before/after, no string longer than the rules allow (add a small script `tools/check-text.js` that fails the build if a launcher label exceeds 3 words or a description exceeds 12 words, with an allow-list file), all sounds listed in a table with duration/loudness, macOS + Windows builds green, performance numbers unchanged or better.

## 3. Phase 3: ADD (launcher features, no server needed)

### 3A. New tab "Custom Texture"  (nav label exactly: **Custom Texture**)
A texture-pack maker inside the launcher. The player never opens a file manager. Final tab list: Home, Library, Events, Mods, Cosmetics, Custom Texture, Clips, News (8 tabs: update selftest + CI to expect 8).

Data source (legal + correct): read textures at runtime from the selected profile's own Minecraft client jar (`versions/<ver>/<ver>.jar`, `assets/minecraft/textures/{item,block,...}`), via new backend endpoints (validate, read-only, no path traversal, zip only):
`GET /textures/index?version=<v>` -> `[{id, kind:"item"|"block"|"entity"|..., name, path}]` (cache the index per version on disk in the data folder),
`GET /textures/png?version=<v>&path=<p>` -> PNG bytes (base64 over the existing IPC).
Never copy Mojang textures into the repo/app.

UI:
1. **Instant search** bar on top: filters as you type (every keystroke, no Enter), over name + id, case/underscore/accent-insensitive ("diamond sword", "diamond_sword"), results virtualised (smooth with 1,500+ entries), kind filter chips (Items, Blocks, All), keyboard: arrow keys + Enter to open.
2. **Editor** for the selected texture (a canvas, nearest-neighbour, zoom 1x to 64x, pan, pixel grid toggle):
   - tools: pencil, eraser, fill, eyedropper, **select pixel** (click a pixel: its colour opens in a colour picker and changing it changes only that pixel; shift-click selects several), rectangle select, undo/redo (50 steps), reset to original.
   - **colour**: picker (hex + HSV), recent colours, palette extracted from the texture, whole-texture adjust sliders (hue, saturation, brightness, contrast) with live preview, replace-colour (pick a colour, change every pixel of that colour).
   - **item size**: Small / Medium / Large (and a "Custom" slider) for how the item looks in hand, on the ground and in the GUI. Implement through the item's model `display` transforms in a resource-pack model override. Research the exact item-model format for the profile's Minecraft version (1.21.x changed it: `assets/minecraft/items/<id>.json` + `models/item/<id>.json`; read the version's own files from the jar to base the override on the original model) and VERIFY IT IN GAME with screenshots for at least 3 items (sword, pickaxe, apple). If a given item cannot be resized this way, disable the size control for it and say why in a tooltip. Never fake it.
   - side-by-side preview: original vs edited, and the edited texture on a small 3D/isometric item preview if cheap (skip if not; do not stall the phase on it).
3. **Projects**: "My texture packs" list. Each pack = name, profile/version, edited textures + model overrides, saved as JSON + PNGs under the data folder (`<data>/texture-packs/<id>/`). Create, rename, duplicate, delete (with confirm). Autosave.
4. **Export / apply**: build a standard resource pack (folder or zip) in the chosen profile's `resourcepacks/`: `pack.mcmeta` with the **pack_format read from the version's own data** (the client jar contains `version.json` with `pack_version`: do not hard-code numbers), `pack.png` (generated), only the edited files. Button "Use in this profile" adds it to the profile's enabled resource packs (`options.txt` `resourcePacks`, keep other entries, never corrupt the file; make a backup copy first). Button "Open folder".
5. Backend work in `DexterBackend.java` + a small `TextureIndex` class; frontend in a new file `src/textures.js` (+ `styles.css` section). Respect script order and top-level name collisions (see section 7).
6. Edge cases: animated textures (`.mcmeta` strips: show "animated, first frame only, editing disabled" or support frame by frame: default = disabled with a clear message), 16x vs 32x+ textures, transparent pixels, huge textures, version not downloaded yet (offer to download via the existing install flow), profile without internet.

Tests: unit-test the search ranking and the pixel/colour operations (plain JS tests runnable with `node` in `tools/`), export a pack, launch the game once on the human's Mac with it enabled, take F2 screenshots showing the edited texture and a resized item.

### 3B. Home background: picture or animated GIF (Settings > Appearance)
1. Setting "Home background": Choose a file (PNG, JPG, WebP, GIF), preview, Remove. **Limit 5 MB** (hard check in the page AND in main.js IPC like `bannerSave`; check magic bytes, not just the extension; reject others with a clear short message). GIF: allowed only up to the 5 MB limit; show a note if it is large.
2. Store the file under `<userData>/background/` (one file, replaced on change). Show it behind the Home page content with a dark overlay so text stays readable (contrast AA), `object-fit: cover`.
3. **Performance rule (important):** a GIF animates only while the window is focused, visible, on the Home page and the game is not running. Otherwise show a static first frame (decode once to a canvas/ImageBitmap; free the animated element). Idle CPU after leaving Home must return to ~0%. Memory: decode lazily, release on removal. Put measurements in the report.
4. Falls back to the default background if the file is missing/corrupt. Works on macOS and Windows paths (use `pathToFileURL`).

### Phase 3 acceptance
Custom Texture tab works end to end (search -> edit pixel -> size -> export -> enabled -> seen in game), self-test shows 8 tabs, screenshots, tests pass, performance measured, Windows CI green after the human pushes.

## 4. Phase 4: Social service (SERVER REQUIRED) + Friends upgrade

Today `services.url` is blank, so friends/presence do not exist. You must build a **reference Dexter service** (small, self-contained, runnable locally and in Docker; the human will host it later: do NOT deploy or pay for anything).
**Before coding, write `SERVICE-DESIGN.md` (API, data model, auth, privacy, threat model) and STOP for approval.** Default design (use unless the human objects):
- Language/runtime: Java 25 (reuse the repo's stack) or Node 20 (simpler): choose one, justify in 5 lines. One process, SQLite (file), REST + WebSocket, config by env vars, `docker compose up` works, README with deploy steps.
- **Identity:** proves the player owns a Minecraft account without ever sending passwords/tokens to us: use the Mojang "join server" handshake (`sessionserver.mojang.com/session/minecraft/hasJoined`-style challenge with the launcher doing `join`), then issue a short-lived service token. Offline accounts get NO social features (state this in the UI).
- **Friends:** request/accept, remove, block. States: Friend, **Close friend**. A "close friend" flag is set by ME on a friend and means: *they* may see which server I am playing on and join it; it is one-directional and I can revoke it any time. Normal friends only see Online / Offline / In game (no server).
- **Presence:** the launcher reports Online/Offline and (only when the game runs) the server address from the game launch args/quick-play; the in-game mod may update it. Presence is visible only to the allowed audience; invisible mode setting.
- **Join:** in the Friends panel, for a close friend who is on a server: "Join" starts the selected profile with `--quickPlayMultiplayer <host>` (the same path as the Servers panel). Show server name, never leak addresses to non-close friends. Require a confirm dialog the first time.
- **Voice groups (launcher voice, works when not in game):** a close friend or friend can create a **voice group** (name, invite list, max 8). Members join from the launcher's Friends panel and talk with WebRTC (Electron `getUserMedia` + `RTCPeerConnection`, full mesh up to 8, STUN configurable, optional TURN URL in config), signalling over the service WebSocket. UI: join/leave, mute, deafen, per-member volume + speaking indicator, mic/speaker selection, push-to-talk or voice activity, input level meter. Macs: request microphone permission properly (Info.plist `NSMicrophoneUsageDescription`, entitlements for the packaged app); Windows: nothing special.
- **Safety:** rate limits, size limits, input validation, block/report endpoints, no message content storage, audit-free (no recording). Document what the service stores.
Launcher work: Friends panel redesign (tabs Friends / Requests / Voice), `GET/POST` through `DexterBackend` (the page never talks to the service directly with tokens), settings: service URL (default blank = features show "Not connected" with a short message).
Tests: service unit/integration tests, a two-client local simulation script, launcher self-test with a mocked service.

## 5. Phase 5: In-game proximity voice chat (Dexter Client users only)

**Write `VOICE-DESIGN.md` first and STOP for approval.** Requirements from the product owner (non-negotiable):
- Only **Dexter Client users** hear/see each other's voice, **on the same Minecraft server**, never vanilla players.
- **Range 20 blocks. 3D positional audio:** the voice comes from where the speaker stands (left/right/behind, using the listener's yaw), and gets quieter with distance like real life:
  `distance <= 5: full volume (1.00, "loud and clear")  |  10: about 0.55  |  15: about 0.30  |  20: about 0.12  |  > 20: silent`
  with smooth linear interpolation between these points (a lookup table + per-frame smoothing so the volume never jumps). Make the curve a constant table in one place so it can be tuned; add a debug overlay (F3-style, off by default) showing distance and gain.
- Quality: Opus 48 kHz mono, 20 ms frames (a pure-Java Opus implementation such as Concentus if its licence allows, else JNI; check the licence and record it in NOTICE.md), jitter buffer 60 to 100 ms, packet-loss concealment, noise gate. Target end-to-end latency under 200 ms on a normal connection.
Design defaults:
- **Capture:** the game mod uses the LWJGL OpenAL capture device (Minecraft already bundles LWJGL OpenAL) or `javax.sound.sampled`; choose and justify. **Playback:** OpenAL sources positioned in 3D at the speaker's location (HRTF if available, else stereo panning) with the gain from the table above (set `AL_GAIN` per source each tick instead of trusting OpenAL's built-in distance models). Must not disturb Minecraft's own sound system or its listener position handling; use a separate source pool.
- **Transport:** voice goes to the Dexter service (Phase 4) through a **voice relay** (UDP or WebSocket-binary; document why), room = (server address hash). Clients send their own position at 5 Hz so the relay only forwards audio to listeners within about 24 blocks (cheap bandwidth). Frames are end-to-end encrypted between clients if feasible (AES-GCM with a room key distributed by the service); at minimum encrypted in transit. No recording, no logging of audio, ever.
- **Controls (in-game Dexter menu, under a "Voice" section):** push-to-talk key (default V) or voice activation with sensitivity, mute microphone, deafen, per-player volume and mute, microphone and speaker device pickers, input level meter, master volume, "Voice chat on/off". A small speaking icon over the head of a talking player and in the tab/player list.
- **Privacy/safety:** first-use consent screen explaining what is sent; a visible "mic live" indicator; mute/block a player (also reports through the service); off by default until the player turns it on; never active in the launcher menus; the mic is closed when the setting is off.
- **macOS:** the game runs as a Java child process of the launcher; the mic permission prompt appears for the Java binary: handle the "no permission" case with a clear message in the Voice screen. **Windows:** exclusive-mode/driver quirks, list devices by name.
- Graceful degradation: no service configured -> the Voice section says "Not connected"; the game never stalls or crashes because voice is down; voice threads are daemon threads and capped CPU (under 2% of a core while talking).
Tests: unit tests for the gain curve (table values above are test cases), the jitter buffer and the codec round trip; a two-client local simulation that checks panning left/right and gain at 5/10/15/20/21 blocks; a real in-game test with two Mac/Windows clients on a LAN server (the human runs it; give exact steps).

## 6. Order, budget and checkpoints

1. Phase 1 (remove) -> report -> human OK.  2. Phase 2A brief -> human OK -> 2B -> 2C text deck -> human OK -> apply -> 2D sounds -> report.
3. Phase 3A + 3B -> report.  4. Phase 4 design -> human OK -> build -> report.  5. Phase 5 design -> human OK -> build -> report.
If your context/limits run short: stop at a clean commit, write `PLAN-V2-STATUS.md` (done / in progress / next, exact files and commands) so another session can continue. Never leave the tree broken or a half-applied removal.

## 7. Known traps from the earlier work (read twice)

- A top-level `const`/`let`/`class` with the same name in two `<script>` files kills the later script silently: grep before adding a global; prefer one IIFE per new file. Script order is in `src/index.html`: new scripts go before `perf.js`.
- `perf.js` wraps `go`, `dressLocker`, `loadMods` and `requestAnimationFrame`: if you rename/remove `dressLocker` (Phase 1) update `perf.js` in the same commit.
- Chromium switch `enable-low-end-device-mode` breaks window capture (self-test screenshots come out empty); `in-process-gpu` is unverified. Do not add either.
- WebGL cannot read `file://` images: the 3D player gets textures as base64 through IPC `asset`.
- Electron `capturePage` returns the previous frame unless the page is invalidated (see selfTest).
- `DEXTER_BACKEND_HOME` isolates the backend's data folder for tests (on Windows it sets `APPDATA`). Never test against the human's real data folder `~/.dexter-client`.
- Single-instance lock: a second app start quits immediately; close the running launcher before running a self-test.
- The Mac packaging takes about 4 minutes (Gradle); stop the Gradle daemon afterwards (`./gradlew --stop`): a hung daemon once burned 450% CPU for an hour.
- The window closes while Minecraft runs and returns on exit (tray icon on Windows): keep that behaviour in any new UI that has "launch" buttons.

## 8. What to report at each checkpoint

`PLAN-V2-REPORT-<phase>.md`: what you changed (file by file), what you ran (exact commands and outputs), screenshots (kept under `screenshots/v2/<phase>/`), measurements (idle CPU, memory, app size), what you could NOT test, open questions for the human. Be honest.
