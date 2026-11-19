/* social-api.js - the ONE file the Friends and Voice screens talk to.
   PREVIEW DATA: everything here is mock data so the screens can be designed and reviewed. Nothing goes over a network.
   The dev team replaces the bodies below with real calls (see API-CONTRACT.md); the screens (v2.js) do not change.
   Set Social.mock = false once the real service is wired. */
const Social = (() => {
  const state = {
    mock: true,
    friends: [
      // closeToMe: THEY made me a close friend, so I may see their server and join it. iClose: I made them a close friend.
      { name: 'Vexil', online: true, server: 'mc.hypixel.net', mode: 'Bedwars', closeToMe: true, iClose: true },
      { name: 'Kairo_', online: true, server: 'play.dexter.gg', mode: 'Dexter SMP', closeToMe: true, iClose: false },
      { name: 'lumen', online: true, server: 'in game', mode: '', closeToMe: false, iClose: true },
      { name: 'Zetaa', online: true, server: '', mode: '', closeToMe: false, iClose: false },
      { name: 'Orrin', online: false },
      { name: 'PaxMC', online: false },
      { name: 'mothh', online: false },
    ],
    groups: [
      { id: 'g1', name: 'Bedwars squad', members: ['Vexil', 'Kairo_', 'lumen'], live: ['Vexil', 'Kairo_'], joined: false },
      { id: 'g2', name: 'Build night', members: ['Zetaa', 'Orrin'], live: [], joined: false },
    ],
    inGame: false,
    muted: false, deafened: false,
  };
  const listeners = new Set();
  const emit = () => listeners.forEach(f => { try { f(state); } catch (e) { console.error(e); } });
  const delay = v => new Promise(r => setTimeout(() => r(v), 60));
  return {
    get mock() { return state.mock; },
    on: f => { listeners.add(f); return () => listeners.delete(f); },
    snapshot: () => state,
    setInGame(v) { state.inGame = !!v; emit(); },
    list: () => delay(state),
    toggleClose(name) { const f = state.friends.find(x => x.name === name); if (f) { f.iClose = !f.iClose; emit(); } return delay(f); },
    addFriend(name) { name = String(name).trim().slice(0, 16); if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return Promise.resolve({ ok: false, error: '3-16 letters, numbers or _' }); if (state.friends.some(f => f.name.toLowerCase() === name.toLowerCase())) return Promise.resolve({ ok: false, error: 'Already your friend' }); state.friends.push({ name, online: false }); emit(); return delay({ ok: true }); },
    createGroup(name) { name = String(name).trim().slice(0, 24); if (!name) return Promise.resolve({ ok: false, error: 'Give it a name' }); state.groups.unshift({ id: 'g' + Date.now(), name, members: [], live: [], joined: true }); emit(); return delay({ ok: true }); },
    joinGroup(id) { const g = state.groups.find(x => x.id === id); if (!g) return Promise.resolve({ ok: false }); if (state.inGame) return Promise.resolve({ ok: false, error: 'Join from the in-game menu' }); g.joined = true; if (!g.live.includes('You')) g.live.push('You'); emit(); return delay({ ok: true }); },
    leaveGroup(id) { const g = state.groups.find(x => x.id === id); if (g) { g.joined = false; g.live = g.live.filter(n => n !== 'You'); emit(); } return delay({ ok: true }); },
    setMute(v) { state.muted = !!v; emit(); }, setDeafen(v) { state.deafened = !!v; if (v) state.muted = true; emit(); },
    // join a close friend's server: the real one starts Minecraft on that server (hand-off for the dev team)
    joinFriend(name) { const f = state.friends.find(x => x.name === name); return Promise.resolve(f && f.closeToMe && f.server ? { ok: true, address: f.server, mock: true } : { ok: false, error: 'Not a close friend yet' }); },
  };
})();

/* Voice chat: the in-game proximity voice rule, used by the launcher's range preview and handed to the dev team.
   Dexter Client players only, same server, 3D. distance in blocks -> volume 0..1 (linear interpolation between the points). */
const VOICE_RANGE = { max: 20, points: [[0, 1], [5, 1], [10, 0.55], [15, 0.3], [20, 0.12]] };
function voiceGain(d) {
  const p = VOICE_RANGE.points; if (d > VOICE_RANGE.max) return 0; if (d <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) if (d <= p[i][0]) { const [d0, g0] = p[i - 1], [d1, g1] = p[i]; return g0 + (g1 - g0) * ((d - d0) / (d1 - d0)); }
  return 0;
}
