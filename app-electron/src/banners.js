// Banners. Nobody is forced into one: every profile can pick from the groups below, upload its own, or press Random.
// Until a profile has a choice, the launcher gives it one from the whole pool (the same id always gets the same picture).
const BANNER_GROUPS = [{"id": "skyblock", "name": "Skyblock", "ids": [1, 4, 5, 25, 26, 33, 34, 52, 66, 76, 98, 99, 106, 86]}, {"id": "pvp", "name": "PvP", "ids": [18, 27, 41, 54, 63, 120, 123, 125, 101, 57, 58, 78, 129, 71]}, {"id": "practice", "name": "Practice", "ids": [7, 53, 55, 56, 84, 124, 128, 127, 60, 77, 130, 15, 16]}, {"id": "survival", "name": "Survival", "ids": [6, 9, 10, 17, 19, 20, 22, 23, 24, 40, 42, 45, 50, 69, 72, 89, 97]}, {"id": "nature", "name": "Nature", "ids": [14, 21, 28, 31, 35, 36, 49, 51, 61, 67, 68, 70, 79, 80, 81, 83, 88, 95, 103, 105, 119, 126, 92, 87, 62, 90]}, {"id": "sunset", "name": "Sunset", "ids": [32, 44, 48, 59, 82, 85, 100, 102]}, {"id": "night", "name": "Night", "ids": [30, 37, 39, 43, 46, 91, 94, 104, 65, 38]}];
// pictures you deleted from assets/banners disappear from every list (and from the random pick)
const BANNER_HAVE = new Set((typeof window !== 'undefined' && window.dexter?.bannerIds) || []);
if (BANNER_HAVE.size) { BANNER_GROUPS.forEach(g => { g.ids = g.ids.filter(i => BANNER_HAVE.has(i)); }); BANNER_GROUPS.splice(0, BANNER_GROUPS.length, ...BANNER_GROUPS.filter(g => g.ids.length)); }
const BANNER_POOL = BANNER_GROUPS.flatMap(g => g.ids);
const bannerUrl = (i, big) => '../assets/banners/' + (big ? '' : 't/') + 'b' + String(i).padStart(3, '0') + '.jpg';
function bannerHash(key) { let h = 2166136261; for (const c of String(key)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; }
const bannerDefault = (key, big) => bannerUrl(BANNER_POOL[bannerHash(key) % BANNER_POOL.length], big);
const bannerFor = (key, big) => bannerDefault(key, big);   // news and placeholders: a stable pick from the pool
let BANNER_DIR = '';   // file:// folder URL of the uploaded banners (asked from the main process at start)
// a profile's own choice: 'b042' (one of ours), 'u:<time>' (uploaded), or nothing (default pick)
function profileBanner(id, big) {
  const c = (typeof SET !== 'undefined' && SET && SET.ui && SET.ui['banner.' + id]) || '';
  if (c.startsWith('b') && (!BANNER_HAVE.size || BANNER_HAVE.has(+c.slice(1)))) return bannerUrl(+c.slice(1), big);
  if (c.startsWith('u:') && BANNER_DIR) return BANNER_DIR + '/' + id + '.jpg?v=' + c.slice(2);
  return bannerDefault('profile:' + id, big);
}
