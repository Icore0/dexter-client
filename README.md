# Dexter Client: launcher front end (UI / UX)

This repo contains **only the front end** of the Dexter Client launcher: the Electron UI in `app-electron/`
(liquid-glass design, all screens, sounds, animations). **There is no backend here**; the dev team provides it.

- `BACKEND-API.md`: exactly what the UI expects from the backend (start-up protocol, endpoints, events).
- `API-CONTRACT.md`: parts that run on preview data today and what the dev team must wire (friends, voice, texture pack export, update/repair, modpack file import).
- `PLAN-V2*.md`: the V2 plan and the reports.
- `screenshots/phase2/`: how the screens look.

## Run the UI
```bash
cd app-electron
npm install
# with a backend that follows BACKEND-API.md:
DEXTER_JAVA=/path/to/java DEXTER_BACKEND_CP=/path/to/backend.jar npm start
```
Without a backend the window opens, but profiles, accounts and launching stay empty or show "not running".

## Layout
- `app-electron/main.js`, `preload.js`: Electron shell (window, IPC, other-launcher import, texture reader, profile icons)
- `app-electron/src/`: the interface (`index.html`, `styles.css`, scripts per screen)
- `app-electron/assets/`: fonts, banners, icons, sounds (`tools/gen-sounds.py` regenerates the sounds)
