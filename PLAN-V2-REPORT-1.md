# PLAN-V2 phase 1 report: removals

Branch `v2` (from `windows-port`), commits:

```
02bc49a  V2 Phase 1A: remove the Store, Dexter+, coins and the wings/auras/kill-FX/bodywear/pets cosmetics from the launcher
f5b54e6  V2 Phase 1B: remove wings, auras, kill effects, bodywear, pets, name styles and the Store/Plus from the in-game mod
<this commit>  V2 Phase 1 report: this file, PLAN-V2-FINDINGS.md and the screenshots
```

Status: **Phase 1A (launcher) and 1B (mod) are done and verified as far as this machine allows. One item is blocked on a
decision: "builder mode" is ambiguous (`PLAN-V2-FINDINGS.md`), so nothing was deleted for it.** Nothing was pushed.

---

## 1. What changed

### 1A — launcher (`app-electron`), commit 02bc49a

| Area | Change |
|---|---|
| Tabs | Store tab, its page, the quick view (`#qv`), the coin pill and the store route in `ORDER`/`PAGE_LOAD` are gone. 7 tabs. |
| Store | Both Store implementations deleted (`drawStore` ×3, `STORE_TABS`, `WISH`, `sCard`, `tileOf`, `ad`, `slides`, every `pm*` function), the Dexter+ page (`pmPlusPage`, `plusYearly`, `data-bill`), the magazine layout and its filler ads. |
| Locker | `LOCK` is **Cloaks + Emotes**; `drawLocker` lost the kill-FX sound and the wear/killfx captions; default category is Cloaks. Stale saved equip choices (`equip.wings/auras/killfx/wear/pets/namestyle`) are deleted from the settings on startup (`dropGoneEquip`). |
| 3D player | `locker3d.js` is now only the cloak image path (no `.vmesh` wings, pet bone trees or aura particle loop + pattern tables). `cosmetics3d.js` keeps `C3` and `EMOTES`, drops `HATS`, `PETS`, `sprite()` and the thumbnail viewer. The dead hats/pets/capes wardrobe code in `app.js` is gone. |
| Assets | `assets/locker/{wings,wings3d,pets,pets3d,killfx}` deleted (26.4 MB); `cosmetics-data.js` (42 Mojang cape textures as data URIs, used only by the dead wardrobe) deleted; `catalog.js` rebuilt to capes + emotes by `tools/build-locker-catalog.py`; `tools/build-cosmetics.js` deleted. `app-electron/assets` **59 MB → 32 MB** (locker 27 MB → 536 KB). |
| Settings | The "AI Access" and "AI: hide the game window" rows are gone; the performance-mode note no longer mentions wings. |
| News | The two sample posts that pointed at deleted wings/pets art now use banners and cloak/emote copy. |
| Self-test | Renderer errors are now real (`console-message` level ≥ 3 instead of the never-filled `window.__errs`); after `invalidate()` the 3D viewer draws its own frame, so the Cosmetics screenshot shows the player again. |
| CI | `windows.yml` and `package-win.ps1` expect **7 tabs** and no longer visit a store page. |

### 1B — in-game mod (`source/src/client`), commit f5b54e6

221 files deleted, 21 702 lines removed. Removed code, registrations and resources:

* **Wings**: `cosmetics/wings/` (7 classes), `render/WingsFeatureRenderer`, `modules/cosmetics/WingsCosmeticsModule`, the
  wing widgets/cards, `cosmetics/wings/*.vmesh`, `textures/cosmetics/wings`, `shine.png`.
* **Auras**: `cosmetics/aura/` (`AuraManager`, `AuraEffects`), `render/AuraFeatureRenderer`, `AuraCosmeticsModule`,
  `AuraGuiRenderer`, `AuraDetailScreen`, `AuraFx` usages, the aura glow path in `VeloShaderLights`, the aura atlas.
* **Kill effects**: `cosmetics/killfx/` (`KillFxManager`, `KillFxEffects`), `render/KillFxRenderer`, `KillEffectsModule`,
  `KillFxLockerScreen`, `KillFxGuiRenderer`, `VeloKillFxCard`, `KillFxDetailScreen`, `sounds/killfx/*` and its 15
  `sounds.json` events.
* **Bodywear**: `cosmetics/wear/`, `render/WearFeatureRenderer`, `WearDetailScreen`, `VeloWearCard`, `VeloColorSwatches`.
* **Pets** (dev build): `dev/pets/` (12 classes), the two pet-ride mixins + their config entries, `pets/*.json.gz`,
  `textures/pets/`.
* **Name styles**: `namestyle/`, `gui/NameStyleScreen`, the three name-style mixins, the name-style branches in
  `TabNames`, `VeloFonts`, `EmojiStyler`, `PlayerNameTagBadgeMixin`, the network-module toggles, loadout fields.
* **Store / coins / Dexter+ / Plus**: `store/`, `gui/store/` (12 screens), `economy/`, `plus/`, `network/StoreClient`,
  `network/PlusBadgeSetting`, `network/RewardsReporter`, `GpuCosmetics` + its mixins, the store entries in the pause
  menu and title screen (both now open the Locker), the `/velo coins|plus|store|owner|lookup|cosmetic` subcommands,
  `plus/public.key`, `textures/store`.
* The launcher Gradle copy tasks for those engines (`bundleAuraEffects`, `bundleKillFxEffects`, `bundleNameStyles`,
  `bundleWingRigs`, `bundleWearTint`) are gone.

**Kept and working:** capes, emotes, skins, the Locker (Skin / Cloaks / Emotes tabs), loadouts (now cape + skin + dev
extras), the name badge (OG only, no "+"), cloud sync / world hosting / clip sharing (membership gates removed),
`/velo` map/waypoints/friends/party/waypoint/phantom/flyspeed, and every non-cosmetic feature.

**Deliberate leftover, out of scope:** the JavaFX launcher UI (`source/launcher/src/main/java/.../ui/StoreView.java` and
friends) is never shipped or started by the Electron app, but it is compiled into `launcher.jar`. Its Store screens still
exist and it still has its own copy of the aura/kill-fx/name-style engines (now launcher-owned sources) so it compiles.
Removing that UI is a separate job; it is not player-visible. The server (`source/server`) still has its store/plus code
for the same reason (Phase 4 replaces the service).

---

## 2. Commands run and their real output

### 2.1 Mod compiles for every Minecraft version

```
$ ./gradlew :1.21.1:compileClientJava :1.21.10:compileClientJava :26.1:compileClientJava :26.2:compileClientJava :26.3:compileClientJava
BUILD SUCCESSFUL
0 errors
$ ./gradlew :1.21.11:compileClientJava
BUILD SUCCESSFUL
$ ./gradlew :launcher:compileJava
BUILD SUCCESSFUL
```

### 2.2 The full backend build (all versions + legacy + game jars)

```
$ ./gradlew :launcher:jar :launcher:devRunArgs --console=plain --max-workers=2
BUILD SUCCESSFUL in 38s
90 actionable tasks: 33 executed, 57 up-to-date
```

Sizes before → after:

| artifact | before | after |
|---|---|---|
| `launcher/build/libs/launcher.jar` (bundles the 7 game jars) | 357 MB | **186 MB** |
| `versions/1.21.11/build/libs/dexter-client-1.4.1+1.21.11.jar` | ~56 MB | **29.2 MB** |
| the other five version jars | ~56 MB | 29.1–29.5 MB |
| legacy 1.8.9 jar | (~0.6 MB) | 0.6 MB (built) |

`unzip -l` of the 1.21.11 jar: 0 entries for `assets/velo-client/pets/`, `textures/pets/`, `cosmetics/wings`,
`textures/cosmetics/wings`, `sounds/killfx`, `textures/cosmetics/aura`, `plus/public.key`, `textures/store`; the emote
assets are still there (33 entries).

### 2.3 Launcher self-test (7 tabs, no page errors)

See §3 for the exact line from the packaged run. The same line from the dev run:

```
SELFTEST {"seeded":200,"accounts":["DexterTest:offline"],"instances":0,"tabs":7,"errors":[]}
```

### 2.4 Grep for the removed terms

```
$ grep -rniE "store|dexter\+|coins?\b|wings|auras?|kill fx|killfx|bodywear|name ?style|namestyle|\bpets\b" \
    app-electron/src app-electron/main.js app-electron/preload.js
app-electron/main.js:106:    if (MAIN_WIN.isMinimized()) MAIN_WIN.restore();     <- substring of "isMinimized", not a match
$ grep -rniE "…same pattern…" source/src/client/resources
source/src/client/resources/assets/velo-client/emoji/shortcodes.json:1: …"convenience_store","department_store"…   <- emoji names
source/src/client/resources/assets/velo-client/shaders/core/cosmetic.vsh:4: …"stored once"…                      <- comment
source/src/client/resources/…/lang/en_us.json                                                                            (no match)
```

So: no feature names left in the launcher or the mod's resources; the only hits are a method name, emoji shortcode names
and one comment. Remaining matches in the mod's *Java* are comments/strings about the server's endpoints and the Clips
share limits (code that talks to a server), and the out-of-scope JavaFX launcher UI.

---

## 3. Screenshots

Packaged-app self-test screenshots: `screenshots/v2/phase1/` (`home.png`, `library.png`, `events.png`, `mods.png`,
`cosmetics.png`, `clips.png`, `news.png`, plus `selftest.json`). The packaged app was built with the unchanged
`tools/package-mac.sh`:

```
$ app-electron/tools/package-mac.sh
4/5 name, icon
5/5 sign (ad hoc)
done: .../dist/Dexter Client.app
540M	dist/Dexter Client.app
```

What I checked by eye:

* 7 tab icons, no Store tab; the Cosmetics tab shows the 3D player with the **Cloaks / Emotes** Locker and no
  Wings/Auras/Name/Kill FX/Bodywear/Pets cards.
* Home, Library, Events, Mods, Clips and News render with no broken images (the two news posts that used the deleted
  art were repointed), fonts and banners load, nothing overlaps.
* No black window, no blank page.

## 4. Measurements (packaged app, this Mac)

Self-test, all seven pages, from `dist/Dexter Client.app`:

```
SELFTEST_JS "idle on home"
SELFTEST_MEM [["Browser",161,0.1],["GPU",88,1.1],["Tab",138,0.5],["Utility",33,0]]
SELFTEST {"seeded":200,"accounts":["DexterTest:offline"],"instances":0,"tabs":7,"errors":[]}
```

* Idle on Home: **≈420 MB across four processes, 0.1 % / 1.1 % / 0.5 % / 0 % CPU** (sum ≈1.7 %). Before this phase the
  same measurement was ≈510 MB and ≈1.9 % — no regression; the memory went down with the deleted 3D cosmetics.
* Sizes: `app-electron/assets` 59 MB → 32 MB; `source/src/client/resources` 60 MB → 29 MB; each mod jar ~56 MB →
  29.2–29.5 MB; `launcher.jar` 357 MB → 186 MB; the packaged `.app` is 540 MB now.
* Deleted: 127 files in 1A, 221 files in 1B (348 total, 23 313 lines removed, 243 added).

---

## 5. In-game smoke test (what it proved)

I launched Minecraft **1.21.11 + the rebuilt mod** through the backend on this Mac, in a throw-away home
(`DEXTER_BACKEND_HOME`), with an offline account, then stopped it:

```
$ curl POST /instances {"name":"Smoke 1.21.11","version":"1.21.11"}   -> created 6adccc16-…
$ curl POST /launch  {"instanceId":"6adccc16-…"}                       -> {"ok":true}
[40s] running: 6adccc16-…   (log starts)
[60s] OpenAL initialized / Sound engine started / all texture atlases created
      [velo-class-warmup/INFO]: Dexter class warm-up: 137 classes in 15 ms
      [Render thread/INFO]: Dexter startup: game ready 13621 ms after JVM start
$ curl POST /stop                                                       -> {"ok":true}
```

So the mod **loads, initialises and reaches the title screen without an exception** (the only error in the log is the
expected Realms sign-in failure of an offline account). What I did **not** do: click through the in-game menu — there is
no input injection here. Exact click-through for the human:

1. Launch a 1.21.11 profile from the launcher; wait for the title screen.
2. Press **Right Shift** (Dexter menu). Check the rail: Modules, Mods, Locker, Friends, Clips, Fight Recap, World Map,
   Waypoints, Background Queue, Schematics, Settings, Redstone Mode, Profiles, Cloud Sync, World Hosting.
3. Open **Locker**: only Skin / Cloaks / Emotes tabs; equip a cloak and an emote, restart, they are still worn.
4. Open Modules: there must be no Wings, Auras, Kill Effects, Bodywear or Pets modules; Settings: no name-style toggles,
   no "Show the + of Dexter+" badge toggle.
5. `/velo` must only offer map/waypoints/friends/party/waypoint/phantom/flyspeed (no coins/plus/store/owner/lookup/cosmetic).
6. Friends, Clips, World Map, Waypoints, Background Queue, Schematics, Profiles, Cloud Sync, World Hosting must open as
   before (they are unchanged apart from the removed membership gates).

## 6. What I could NOT test

1. The click-through above (menu screens, equipping cosmetics) — no input automation on this machine.
2. **Windows CI** — nothing was pushed (the branch is local), so the "Windows build" workflow has not run with these
   changes. The workflow was updated to 7 tabs / no store page.
3. The JavaFX launcher UI still compiles, but nobody starts it, so its (now stale) Store screens were not exercised.
4. Microsoft sign-in, store endpoints and everything behind the (currently blank) `services.url` — unchanged from before.

## 7. Open questions for the human

1. **"Builder mode"**: Redstone Mode (R) or the Schematics library, or something else? See `PLAN-V2-FINDINGS.md` for the
   candidates with menu names. Nothing was deleted for it, so Phase 1 is not fully closed until you answer.
2. Do you want the out-of-scope JavaFX launcher UI (its Store screens) removed as well, or left as dead code?
