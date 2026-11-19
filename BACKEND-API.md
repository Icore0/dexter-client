# Backend API the UI expects (for the dev team)

This repository is the **front end only** (the Electron UI in `app-electron/`). The backend is provided by the dev team. This file lists
what the UI calls, so the backend can be built or adapted to match. Anything marked *shell* is implemented in `app-electron/main.js`
(Electron main process), not in the backend.

## How the UI starts and reaches the backend (`main.js`: `startBackend`, `backendRequest`, `relayEvents`)
- The UI spawns the backend as a child process (Java today: `DEXTER_JAVA` + `DEXTER_BACKEND_CP`, or `app-electron/backend/backend.json`).
  Any executable works if it follows this protocol:
  1. It reads the env var `DEXTER_BACKEND_TOKEN`.
  2. It listens on `127.0.0.1` on a free port and prints one line on stdout: `DEXTER_BACKEND_READY port=<port>`.
  3. Every request must carry the header `X-Dexter-Token: <token>`; reject anything without it.
  4. It exits by itself when its parent process disappears (the UI checks nothing else).
- `GET /events` is a Server-Sent-Events stream (`data: {json}\n\n`). The UI relays it to the page. Event `type` values used: `started`,
  `exit`, `error` (game process), plus launch progress (`phase`, `fraction`) and `{type:"modpack", instanceId, fraction}`.
- Test mode: `DEXTER_BACKEND_HOME=<dir>` makes the backend use a throw-away data folder; the UI self-test (`DEXTER_SELFTEST=<dir>`) uses it.

## Endpoints the page calls (JSON in / JSON out; the page only uses GET, POST, PUT, DELETE)
| Area | Calls |
|---|---|
| Accounts | `GET /accounts`, `POST /accounts/offline {name}`, `POST /accounts/active {uuid}`, `GET /accounts/microsoft`, `POST /accounts/microsoft`, `DELETE /accounts/<uuid>` |
| Profiles | `GET /instances`, `POST /instances {name, version}` (returns `{created: id}`), `DELETE /instances/<id>`, `POST /instances/<id>/rename`, `/duplicate`, `/settings {ramMaxMb, jvmArgs}`, `GET /instances/<id>/path` |
| Content | `POST /instances/<id>/install {type, url, filename, sha512}` (mod, resourcepack, shader, datapack), `DELETE /instances/<id>/items?type=&file=` |
| Modpacks | `POST /modpacks {projectId, name}`: installs a Modrinth modpack as a NEW profile (returns `{created}`), emits `modpack` progress events |
| Launch | `POST /launch {instanceId, server?}`, `GET /running` (`{running:[ids], starting:[ids]}`) |
| Versions | `GET /versions` (`{versions:[{id}]}`) |
| Servers | `GET /servers`, `POST /servers {name, host, port}`, `DELETE /servers/<id>` |
| Settings | `GET /settings`, `PUT /settings` (includes a `ui` map of string keys the UI stores: banners, icons, descriptions, favourites, sound volume ...), `GET /interface`, `PUT /interface {sounds, titleMusic, guides}` |
| Skins | `GET /skins`, `POST /skins`, `POST /skins/equip`, `DELETE /skins/<id>` |
| Media | `GET /media?kind=clips|screenshots`, `GET /media/thumb?...`, `DELETE /media?...` |
| Other | `GET /news`, `GET /folders` (`{data, logs}`: the data folder and logs folder, used to allow "open folder"), `GET /systemcheck`, `GET /shield` |

The exact shapes are visible in the calls in `app-electron/src/*.js` (search for `BE(`) and in `main.js` (`ipcMain.handle`).

## Things the backend does NOT need to do (the UI shell does them)
Detecting and importing other launchers, reading mod names/icons from a profile folder, enabling/disabling mods (`.disabled`), profile
pictures (`icon.png`), reading Minecraft textures, UI sounds. See `API-CONTRACT.md` for the preview-data parts that still need real wiring
(friends, voice, texture pack export, modpack file import, update/repair).
