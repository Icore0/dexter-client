/* locker3d.js - puts the equipped cloak on the 3D player. The cloak images are read through the main process
   (window.dexter.asset) as data URLs, because WebGL refuses file:// images. */

const V3 = {
  cache: new Map(),

  async asset(rel) {
    if (!this.cache.has(rel)) this.cache.set(rel, window.dexter?.asset ? window.dexter.asset(rel) : Promise.resolve(null));
    return this.cache.get(rel);
  },
  async image(rel) {
    const a = await this.asset(rel); if (!a) return null;
    return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = `data:${a.mime};base64,${a.b64}`; });
  },
};

let dressSeq = 0;
async function dressLocker() {
  if (!sv || typeof LOCKER === 'undefined') return;
  const token = ++dressSeq;
  const eq = c => (SET?.ui?.['equip.' + c]) || '';
  const c = eq('capes');
  if (c) {
    const cp = LOCKER.capes.find(x => x.id === c), im = cp && await V3.image(cp.img);
    if (im && token === dressSeq) {
      const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
      cv.getContext('2d').drawImage(im, 0, 0); sv.loadCape(cv);
    }
  } else sv.loadCape(null);
}
