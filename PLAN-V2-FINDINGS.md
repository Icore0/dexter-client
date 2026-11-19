# PLAN-V2 findings: "builder mode" (Phase 1B.3)

The change list asks to remove the in-game **builder mode** and warns it is not called `BuilderMode` in code. I searched
the whole mod (`source/src/client`), the language files and the in-game menu. There is **no feature named "builder"**
anywhere (the only "Builder" strings in the repo are a cape name and an event reward in the launcher).

What exists, with the name a player sees and where it lives:

| # | Menu name (exact) | Where | Files | What it is | Confidence it is "builder mode" |
|---|---|---|---|---|---|
| A | **Redstone Mode (R)** — in the Dexter menu rail (`MenuShell.java:73`, `ModMenuScreen.java:196`) | `client/redstone/` (34 files: block palette, schematic load/preview/paste, material list, replace, tick control, wiring, WorldEdit/Litematica/Axiom interop) + keybinds `key.velo-client.rm_*` | high volume, self-contained | A build mode: paste/stack/copy schematics, block palette, material lists, freeze the world and step ticks, wire redstone. It is the only thing called a *mode*. | **High** |
| B | **Schematics** — a rail entry of its own (`MenuShell.java:71`, `ModMenuScreen.java:194`) | `gui/SchematicsScreen.java`, `gui/CommunitySchematicsScreen.java`, `gui/ShareSchematicScreen.java`, `client/schematics/` | ~10 files | A library/browser of `.litematic`/`.schem` files (also reachable from Redstone Mode's "Load schematic…"), not a mode. | Medium-high |
| C | **Edit HUD / Edit HUD Layout** (`ModMenuScreen.java:337-354`, `gui/HudEditScreen.java`) | `gui/HudEditScreen.java`, `hud/…` | ~4 files | Drag/resize the HUD. Not world building. | Low |
| D | **Phantom** (module, key `key.velo-client.phantom`) | `modules/qol/PhantomModule.java` | 1 file | Creative flight helpers for building/redstone testing in singleplayer (walk through pressure plates, no clip while flying). | Medium-low |
| E | **Game Mode Presets** (module) | `modules/servertools/GameModePresetsModule.java` | 1 file | Switches a profile per scoreboard gamemode (Bed Wars, duels…). Not building. | Low |
| F | Axiom interop (`AxiomDisableMixin`, `AxiomToolSlotMixin`, `redstone/AxiomCompat`) | mixins + redstone | 3 files | Lets Axiom (a third-party builder mod) work with Redstone Mode. | Low (not a feature of ours) |

Also checked and unrelated: the launcher has no builder/HUD-designer/schematic editor in `app-electron/src`; the Java
launcher has a HUD designer and schematic viewer for its JavaFX UI, which is not the in-game builder mode.

**This is ambiguous, so per the plan I deleted nothing.** The two plausible readings are A (the mode) and B (the
schematic feature/library). A is the literal "mode", B is what a builder would call "the builder stuff". Deleting
either is destructive and hard to review.

Question for the human:

> By "builder mode" do you mean **Redstone Mode (R)** (the build/paste/schematic/tick mode, option A) — and should its
> separate **Schematics** library (option B) stay or go with it — or did you mean something else on the list above?

Once answered, the removal is mechanical: `redstone/` + its keybinds/lang + `RedstoneMode.init()` + 3 mixins + the menu
entries for A (and `gui/SchematicsScreen`, `client/schematics`, the rail entry and `ShareSchematicScreen` for B).
