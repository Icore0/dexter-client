/* homeglow.js - the Home picture does not stay inside its card: its colours bleed out as a soft halo around the card and as an
   ambient light over the whole Home tab (behind the top bar, the cards and the servers panel), and a slow glint sweeps over it.
   Cheap on purpose: a small pre-blurred copy of the picture is stretched, two layers crossfade, and every
   animation pauses when the window is not in use. */
(function () {
  const app = document.querySelector('.app'), home = document.getElementById('home'), hero = document.getElementById('hero');
  if (!app || !home || !hero) return;
  const amb = document.createElement('div'); amb.className = 'ambient'; amb.id = 'ambient';
  amb.innerHTML = '<i class="amb-l"></i><i class="amb-l"></i><i class="amb-glint g1"></i><i class="amb-glint g2"></i>';
  app.insertBefore(amb, app.firstChild);
  const halo = document.createElement('div'); halo.className = 'hero-halo'; halo.innerHTML = '<i class="hh-l"></i><i class="hh-l"></i>';
  home.insertBefore(halo, home.firstChild);
  const glint = document.createElement('i'); glint.className = 'hero-glint'; hero.appendChild(glint);

  const cache = new Map(); let turn = 0, last = '';
  const thumb = url => new Promise(res => {
    if (cache.has(url)) return res(cache.get(url));
    const im = new Image(); im.onload = () => {
      // only lightly softened (704 x 440, oversized so the edges stay clean): you still see the picture, not a colour wash
      const c = document.createElement('canvas'); c.width = 704; c.height = 440; const x = c.getContext('2d'); x.filter = 'blur(2.5px)'; x.drawImage(im, -8, -6, 720, 452); x.filter = 'none';
      const d = 'url(' + c.toDataURL('image/jpeg', .82) + ')'; cache.set(url, d); res(d); }; im.onerror = () => res(''); im.src = url;
  });
  window.setAmbient = async function (url) {
    if (!url || url === last) return; last = url; const t = await thumb(url); if (!t || url !== last) return;
    document.body.classList.add('amb-on'); turn = 1 - turn;
    [amb.querySelectorAll('.amb-l'), halo.querySelectorAll('.hh-l')].forEach(list => { list[turn].style.backgroundImage = t; list[turn].classList.add('on'); list[1 - turn].classList.remove('on'); });
  };

  // on every tab (the halo around the card is Home only), moving only while the window is in use. Settings > Launcher > Background glow turns it off.
  const glowOff = () => document.body.classList.toggle('amb-off', (SET?.ui && SET.ui.glow) === 'false');
  window.applyGlowSetting = glowOff; const gw = setInterval(() => { if (typeof SET !== 'undefined' && SET && SET.ui) { clearInterval(gw); glowOff(); } }, 150);
  document.addEventListener('change', e => { if (e.target?.dataset?.vk === 'ui:glow') setTimeout(glowOff, 120); });
  const sync = () => document.body.classList.toggle('home-on', home.classList.contains('on'));
  new MutationObserver(sync).observe(home, { attributes: true, attributeFilter: ['class'] }); sync();
  const still = () => document.body.classList.toggle('dx-still', !(document.hasFocus() && !document.hidden));
  addEventListener('focus', still); addEventListener('blur', still); document.addEventListener('visibilitychange', still); still();
})();
