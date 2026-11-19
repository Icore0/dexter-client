/* =====================================================================
   cosmetics3d.js - borrows skinview3d's three.js classes for the Locker's 3D player and holds the emote poses.
   skinview3d does not export three.js, so C3.init() borrows its classes from objects it creates.
   Loaded before app.js and locker3d.js. No network, no external assets.
   ===================================================================== */

const C3 = {
  // ---- borrow three.js classes from a live viewer ----
  init(sv) {
    const head = sv.playerObject.skin.head, mesh = head.innerLayer;
    this.Mesh = mesh.constructor;
    this.Box = mesh.geometry.constructor;
    this.Mat = mesh.material.constructor;
    this.Color = mesh.material.color.constructor;
    this.Group = Object.getPrototypeOf(skinview3d.BodyPart);
  },
};

/* ---------- EMOTES: poses built into skinview3d ---------- */
const EMOTES = [
  ['Idle', 'IdleAnimation', 3.1], ['Wave', 'WaveAnimation', 2.4], ['Walk', 'WalkingAnimation', 0.78], ['Run', 'RunningAnimation', 0.42],
  ['Crouch', 'CrouchAnimation', 3.1], ['Swing', 'HitAnimation', 0.7], ['Glide', 'FlyingAnimation', 3.1], ['Swim', 'SwimAnimation', 1.6],
];
